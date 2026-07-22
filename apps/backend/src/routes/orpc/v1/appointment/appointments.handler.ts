import { DateTime } from "luxon";
import { schema } from "@salora/database";
import { eq } from "drizzle-orm";

import { base } from "../../bases/public";

import { getAppointmentsInputSchema } from "./appointments.schema";

export const getAppointmentsHandler = base
  .route({ method: "GET" })
  .input(getAppointmentsInputSchema)
  .handler(
    async ({
      input: { email: inputEmail, branchId },
      context: {
        var: { drizzle: db, auth },
        req,
      },
    }) => {
      const session = await auth.api.getSession({
        headers: req.header(),
      });

      const customer = session
        ? await db.query.customer.findFirst({
            where: (customerTable, { eq }) =>
              eq(customerTable.userId, session.user.id),
          })
        : null;

      const targetCustomerId = customer?.id;
      const sessionEmail = session?.user?.email;
      const email = sessionEmail || inputEmail;

      if (!targetCustomerId && (!email || email.trim() === "")) {
        return [];
      }

      const appointments = await db.query.calendarItem.findMany({
        where: (calendarItem, { and, eq }) =>
          and(
            eq(calendarItem.organizationId, branchId),
            eq(calendarItem.type, "BOOKING"),
          ),
        with: {
          booking: {
            with: {
              customer: true,
              service: true,
              employee: {
                with: {
                  user: true,
                },
              },
            },
          },
        },
        orderBy: (calendarItem, { desc }) => desc(calendarItem.startTime),
      });

      const filteredAppointments = appointments.filter((appointment) => {
        if (
          targetCustomerId &&
          appointment.booking?.customerId === targetCustomerId
        )
          return true;
        return appointment.booking?.customer?.email === email;
      });

      const now = DateTime.now();
      return filteredAppointments.map((appointment) => {
        const endTime = DateTime.fromJSDate(appointment.endTime);

        if (
          endTime < now &&
          appointment.booking?.status !== "COMPLETED" &&
          appointment.booking?.status !== "CANCELLED"
        ) {
          return {
            ...appointment,
            booking: appointment.booking
              ? { ...appointment.booking, status: "COMPLETED" }
              : null,
          };
        }

        return appointment;
      });
    },
  );
