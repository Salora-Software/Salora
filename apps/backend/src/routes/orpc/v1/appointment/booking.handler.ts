import { ORPCError } from "@orpc/server";
import { DateTime, Interval } from "luxon";
import { schema } from "@salora/database";
import { eq, and } from "drizzle-orm";
import { getDaySpanForJsDate, getIntervalsForDate } from "@salora/availability";

import { base } from "../../bases/public";
import { calculateEmployeeSlots } from "@/lib/appointment/availability.service";
import {
  createAppointmentContext,
  getBookingCutoffDateTime,
} from "@/lib/appointment/appointment-context.service";
import { enqueueTemplateEmail } from "@/lib/email-queue";
import { ERROR_MESSAGES } from "@/lib/error-messages";

import { createBookingInputSchema } from "./booking.schema";

export const createBookingHandler = base
  .route({ method: "POST" })
  .input(createBookingInputSchema)
  .handler(
    async ({
      input,
      context: {
        var: { drizzle: db, auth, emailQueue },
        req,
      },
    }) => {
      const { organizationId, serviceId, employeeId, date, contact } = input;
      const url = new URL(req.url);

      const initialSpan = getDaySpanForJsDate(date);

      const { organization, service, employees, timeZone, engine } =
        await createAppointmentContext(
          db,
          organizationId,
          serviceId,
          initialSpan.utcSpan,
        );

      const requestedStart = DateTime.fromJSDate(date, { zone: timeZone });
      const requestedEnd = requestedStart.plus({ minutes: service.duration });
      const requestedInterval = Interval.fromDateTimes(
        requestedStart,
        requestedEnd,
      );
      const bookingCutoff = getBookingCutoffDateTime(
        timeZone,
        organization.minimumBookingTime,
      );

      if (!requestedInterval.isValid) {
        throw new ORPCError("BAD_REQUEST", {
          message: ERROR_MESSAGES.INVALID_DATE,
        });
      }

      if (requestedStart < bookingCutoff) {
        throw new ORPCError("BAD_REQUEST", {
          message: ERROR_MESSAGES.SLOT_TOO_SOON,
        });
      }

      const employeesToUse = employeeId
        ? employees.filter((employee) => employee.member.id === employeeId)
        : employees;

      if (employeesToUse.length === 0) {
        throw new ORPCError("BAD_REQUEST", {
          message: ERROR_MESSAGES.NO_EMPLOYEES_FOR_SERVICE,
        });
      }

      const orgIntervals = getIntervalsForDate(
        organization.openingTimes,
        requestedStart,
        timeZone,
      );

      const targetDaySpan = Interval.fromDateTimes(
        requestedStart.startOf("day"),
        requestedStart.endOf("day"),
      );

      const employeeResults = calculateEmployeeSlots(
        employeesToUse,
        engine,
        targetDaySpan,
        orgIntervals,
        requestedStart,
        timeZone,
      );

      let bestEmployeeId: string | null = null;
      let minBookings = Number.POSITIVE_INFINITY;

      for (let i = 0; i < employeesToUse.length; i += 1) {
        const employee = employeesToUse[i];
        const result = employeeResults[i];

        const isAvailable = result.intervals.some(
          (slot) =>
            Math.abs(slot.start!.toMillis() - requestedStart.toMillis()) <
              60000 &&
            Math.abs(slot.end!.toMillis() - requestedEnd.toMillis()) < 60000,
        );

        if (!isAvailable) continue;

        const bookingCount = employee.member.calendarItems.length;
        if (bookingCount < minBookings) {
          minBookings = bookingCount;
          bestEmployeeId = employee.member.id;
        }
      }

      if (!bestEmployeeId) {
        throw new ORPCError("BAD_REQUEST", {
          message: ERROR_MESSAGES.SLOT_NOT_AVAILABLE,
        });
      }

      const bestEmployee = employeesToUse.find(
        (employee) => employee.member.id === bestEmployeeId,
      );

      if (!bestEmployee) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: ERROR_MESSAGES.EMPLOYEE_LOOKUP_FAILED,
        });
      }

      const ctxAuth = await auth.$context;
      let user = await db.query.user.findFirst({
        where: (userTable, { eq }) => eq(userTable.email, contact.email),
      });

      if (!user) {
        await ctxAuth.internalAdapter.createUser({
          email: contact.email,
          name: `${contact.firstName} ${contact.lastName}`,
          phone: contact.phone || "",
          organizationId,
        });

        user = await db.query.user.findFirst({
          where: (userTable, { eq }) => eq(userTable.email, contact.email),
        });
      }

      if (!user) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: ERROR_MESSAGES.FAILED_TO_CREATE_USER,
        });
      }

      let customer = await db.query.customer.findFirst({
        where: (customerTable, { and, eq }) =>
          and(
            eq(customerTable.email, contact.email),
            eq(customerTable.organizationId, organizationId),
          ),
      });

      if (customer) {
        await db
          .update(schema.customer)
          .set({
            name: `${contact.firstName} ${contact.lastName}`,
            phone: contact.phone || "",
            userId: user.id,
          })
          .where(
            and(
              eq(schema.customer.email, contact.email),
              eq(schema.customer.organizationId, organizationId),
            ),
          );

        customer = await db.query.customer.findFirst({
          where: (customerTable, { and, eq }) =>
            and(
              eq(customerTable.email, contact.email),
              eq(customerTable.organizationId, organizationId),
            ),
        });
      } else {
        const insertedCustomers = await db
          .insert(schema.customer)
          .values({
            id: crypto.randomUUID(),
            name: `${contact.firstName} ${contact.lastName}`,
            email: contact.email,
            phone: contact.phone || "",
            organizationId,
            userId: user.id,
          })
          .returning();

        customer = insertedCustomers[0];
      }

      const insertedBookings = await db
        .insert(schema.booking)
        .values({
          id: crypto.randomUUID(),
          organizationId,
          serviceId,
          employeeId: bestEmployee.member.id,
          customerId: customer?.id ?? "",
          duration: service.duration,
          notes: contact.notes,
          status: (organization.appointmentStatus as string) || "PENDING",
        })
        .returning();

      const booking = insertedBookings[0];

      const insertedCalendarItems = await db
        .insert(schema.calendarItem)
        .values({
          id: crypto.randomUUID(),
          organizationId,
          title: `${customer?.name} - ${service.name}`,
          employeeId: bestEmployee.member.id,
          startTime: requestedStart.toJSDate(),
          endTime: requestedEnd.toJSDate(),
          type: "BOOKING",
          notes: contact.notes,
          bookingId: booking.id,
          updatedAt: new Date(),
        })
        .returning();

      const calendarItem = insertedCalendarItems[0];

      const employeeUser = await db.query.user.findFirst({
        where: (userTable, { eq }) =>
          eq(userTable.id, bestEmployee.member.userId),
      });

      await enqueueTemplateEmail(emailQueue, {
        templateType:
          booking.status === "CONFIRMED"
            ? "EMAIL_APPROVED"
            : booking.status === "CANCELLED"
              ? "EMAIL_CANCELED"
              : booking.status === "DENIED"
                ? "EMAIL_DENIED"
                : "EMAIL_CREATED",
        organizationId,
        bookingId: booking.id,
        targets: {
          customerEmail: contact.email,
          employeeEmail: employeeUser?.email,
        },
        origin: url.origin || "",
      });

      return { booking, calendarItem };
    },
  );
