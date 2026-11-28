import { z } from "zod";
import { router as createRouter, privateProcedure } from "@/middleware/trpc";
import { schema } from "@salora/database";
import { convertToLocal } from "@/lib/utils";
// import { deleteImage, uploadImage } from '@/lib/s3';
import { eq, exists, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export const router = createRouter({
  updateLogo: privateProcedure
    .input(z.object({ image: z.string().url(), organizationId: z.string() }))
    .output(z.string())
    .mutation(
      async ({ input: { image, organizationId }, ctx: { headers, db } }) => {
        const response = await fetch(image);
        const imageBlob = await response.blob();
        const imageId = randomUUID().replace(/-/g, "");
        const org = await db.query.organization.findFirst({
          where: (org, { eq }) => eq(org.id, organizationId),
          columns: { logo: true },
        });
        // if (org?.logo)
        // 	deleteImage(org.logo[0] === '/' ? org.logo.substring(1) : org.logo).catch((e) => {
        // 		console.error(e);
        // 	});
        // const imageurl = await uploadImage(
        // 	imageBlob,
        // 	`organizations/${organizationId}/logo_${imageId}.png`
        // );

        await db
          .update(schema.organization)
          .set({ logo: `/organizations/${organizationId}/logo_${imageId}.png` })
          .where(eq(schema.organization.id, organizationId));
        return `/organizations/${organizationId}/logo_${imageId}.png`;
      },
    ),

  updateLocation: privateProcedure
    .input(
      z.object({
        location: z.string(),
        organizationId: z.string(),
      }),
    )
    .output(z.boolean())
    .mutation(async ({ input: { location, organizationId }, ctx: { db } }) => {
      await db
        .update(schema.organization)
        .set({ location })
        .where(eq(schema.organization.id, organizationId));
      return true;
    }),

  updateWebsite: privateProcedure
    .input(
      z.object({
        website: z.string().url(),
        organizationId: z.string(),
      }),
    )
    .output(z.boolean())
    .mutation(async ({ input: { website, organizationId }, ctx: { db } }) => {
      await db
        .update(schema.organization)
        .set({ website })
        .where(eq(schema.organization.id, organizationId));
      return true;
    }),

  updatePhone: privateProcedure
    .input(
      z.object({
        phone: z.string(),
        organizationId: z.string(),
      }),
    )
    .output(z.boolean())
    .mutation(async ({ input: { phone, organizationId }, ctx: { db } }) => {
      await db
        .update(schema.organization)
        .set({ phone })
        .where(eq(schema.organization.id, organizationId));
      return true;
    }),

  updateMail: privateProcedure
    .input(
      z.object({
        email: z.string(),
        organizationId: z.string(),
      }),
    )
    .output(z.boolean())
    .mutation(async ({ input: { email, organizationId }, ctx: { db } }) => {
      await db
        .update(schema.organization)
        .set({ email })
        .where(eq(schema.organization.id, organizationId));
      return true;
    }),

  getBranches: privateProcedure
    .input(z.object({}))
    .output(
      z.array(
        z.object({
          name: z.string(),
          id: z.string(),
          createdAt: z.date(),
          slug: z.string().nullable(),
          logo: z.string().nullable(),
          metadata: z.string().nullable(),
          location: z.string().nullable(),
          active: z.boolean(),
          phone: z.string().nullable(),
          email: z.string().nullable(),
          website: z.string().nullable(),
          maxMembers: z.number().nullable(),
          timeZone: z.string(),
          appointmentStatus: z.string(),
          onboardingStep: z.number().nullable(),
          services: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              price: z.number(),
              description: z.string().nullable(),
              duration: z.number(),
            }),
          ),
          openingTimes: z.array(
            z.object({
              id: z.string(),
              dayOfWeek: z.number(),
              startTimeLocal: z.string(),
              endTimeLocal: z.string(),
            }),
          ),

          members: z.array(
            z.object({
              id: z.string(),
              role: z.string(),
              invitationStatus: z.string(),
              services: z.array(z.string()),
              user: z.object({
                id: z.string(),
                email: z.string(),
                emailVerified: z.boolean(),
                name: z.string(),
                createdAt: z.date(),
                updatedAt: z.date(),
                image: z.string().nullable(),
                phone: z.string().nullable(),
              }),
              availability: z.array(
                z.object({
                  id: z.string(),
                  dayOfWeek: z.number(),
                  startTimeLocal: z.string(),
                  endTimeLocal: z.string(),
                }),
              ),
            }),
          ),
        }),
      ),
    )
    .query(
      async ({
        ctx: {
          session: { user },
          db,
        },
      }) => {
        const organizations = await db.query.organization.findMany({
          where: (org) =>
            exists(
              db
                .select()
                .from(schema.member)
                .where(
                  and(
                    eq(schema.member.organizationId, org.id),
                    eq(schema.member.userId, user.id),
                  ),
                ),
            ),
          with: {
            members: {
              with: {
                user: true,
                availabilities: true,
                employeeServices: true,
              },
            },
            openingTimes: true,
            services: true,
          },
        });
        console.log("test", organizations.length);
        return organizations
          .map((organization) => {
            return {
              ...organization,
              openingTimes: organization.openingTimes.map((time) => ({
                ...time,
                startTimeLocal: convertToLocal(
                  new Date(time.startTimeUtc),
                  organization.timeZone,
                ),
                endTimeLocal: convertToLocal(
                  new Date(time.endTimeUtc),
                  organization.timeZone,
                ),
              })),
              members: organization.members.map((member) => ({
                ...member,
                availability: member.availabilities.map((time) => ({
                  ...time,
                  startTimeLocal: convertToLocal(
                    new Date(time.startTimeUtc),
                    organization.timeZone,
                  ),
                  endTimeLocal: convertToLocal(
                    new Date(time.endTimeUtc),
                    organization.timeZone,
                  ),
                })),
                services: member.employeeServices.map(
                  (service) => service.serviceId,
                ),
              })),
              active: false,
            };
          })
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
      },
    ),
});
