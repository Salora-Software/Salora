import { z } from 'zod';
import { router as createRouter, privateProcedure } from '../../../../context';
import { db, schema } from '$lib/server/db';
import { TRPCError } from '@trpc/server';
import { auth } from '$lib/server/auth';
import { convertToLocal, convertToSlug } from '$lib/utils';
import { deleteImage, uploadImage } from '$lib/server/s3';

export const router = createRouter({
	updateLogo: privateProcedure
		.input(z.object({ image: z.string().url(), organizationId: z.string() }))
		.output(z.string())
		.mutation(async ({ input: { image, organizationId }, ctx: { headers } }) => {
			const response = await fetch(image);
			const imageBlob = await response.blob();
			const imageId = crypto.randomUUID().replace(/-/g, '');
			const org = await db.query.organization.findFirst({
				where: (org, { eq }) => eq(org.id, organizationId),
				columns: { logo: true }
			});
			if (org?.logo)
				deleteImage(org.logo[0] === '/' ? org.logo.substring(1) : org.logo).catch((e) => {
					console.error(e);
				});
			const imageurl = await uploadImage(
				imageBlob,
				`organizations/${organizationId}/logo_${imageId}.png`
			);

			await db.update(schema.organization)
				.set({ logo: `/organizations/${organizationId}/logo_${imageId}.png` })
				.where(eq(schema.organization.id, organizationId));
			return `/organizations/${organizationId}/logo_${imageId}.png`;
		}),

	updateLocation: privateProcedure
		.input(
			z.object({
				location: z.string(),
				organizationId: z.string()
			})
		)
		.output(z.boolean())
		.mutation(async ({ input: { location, organizationId } }) => {
			await db.update(schema.organization)
				.set({ location })
				.where(eq(schema.organization.id, organizationId));
			return true;
		}),

	updateWebsite: privateProcedure
		.input(
			z.object({
				website: z.string().url(),
				organizationId: z.string()
			})
		)
		.output(z.boolean())
		.mutation(async ({ input: { website, organizationId } }) => {
			await db.update(schema.organization)
				.set({ website })
				.where(eq(schema.organization.id, organizationId));
			return true;
		}),

	updatePhone: privateProcedure
		.input(
			z.object({
				phone: z.string(),
				organizationId: z.string()
			})
		)
		.output(z.boolean())
		.mutation(async ({ input: { phone, organizationId } }) => {
			await db.update(schema.organization)
				.set({ phone })
				.where(eq(schema.organization.id, organizationId));
			return true;
		}),

	updateMail: privateProcedure
		.input(
			z.object({
				email: z.string(),
				organizationId: z.string()
			})
		)
		.output(z.boolean())
		.mutation(async ({ input: { email, organizationId } }) => {
			await db.update(schema.organization)
				.set({ email })
				.where(eq(schema.organization.id, organizationId));
			return true;
		}),

	createBranch: privateProcedure
		.input(
			z.object({
				name: z.string().min(3),
				location: z.string().optional().nullable(),
				phone: z.string().optional().nullable(),
				email: z.string().optional().nullable(),
				website: z.string().optional().nullable(),
				timezone: z.string().min(3)
			})
		)
		.output(
			z.object({
				name: z.string(),
				id: z.string(),
				createdAt: z.date(),
				slug: z.string().nullable(),
				logo: z.string().nullable(),
				metadata: z.string().nullable(),
				location: z.string().nullable(),
				phone: z.string().nullable(),
				email: z.string().nullable(),
				website: z.string().nullable(),
				maxMembers: z.number().nullable(),
				timeZone: z.string(),
				openingTimes: z.array(
					z.object({
						id: z.string(),
						dayOfWeek: z.number(),
						startTimeUtc: z.date(),
						endTimeUtc: z.date()
					})
				),
				members: z.array(
					z.object({
						role: z.string(),
						user: z.object({
							id: z.string(),
							email: z.string(),
							emailVerified: z.boolean(),
							name: z.string(),
							createdAt: z.date(),
							updatedAt: z.date(),
							image: z.string().nullable(),
							phone: z.string().nullable()
						})
					})
				)
			})
		)
		.mutation(
			async ({
				input,
				ctx: {
					session: { user },
					headers
				}
			}) => {
				const slug = convertToSlug(input.name);
				if (slug === '')
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'slug_can_not_be_empty'
					});
				// check if user already is in a organization. If so throw a error
				let userOrganization = await db.query.organization.findMany({
					where: (org, { exists, select, eq }) =>
						exists(
							select()
								.from(schema.member)
								.where(eq(schema.member.organizationId, org.id), eq(schema.member.userId, user.id))
						),
				});
				console.log(userOrganization);
				if (userOrganization.length >= 5) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'max_organizations_reached'
					});
				}
				// check if it already exists
				let organization = await db.query.organization.findFirst({
					where: (org, { eq }) => eq(org.slug, slug),
					with: {
						members: {
							with: { user: true }
						},
						openingTimes: true
					}
				});
				if (organization) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'organization_slug_already_exists'
					});
				}

				const response = await auth.api
					.createOrganization({
						headers,
						body: {
							timeZone: input.timezone,
							name: input.name,
							location: input.location ?? undefined,
							phone: input.phone ?? undefined,
							email: input.email ?? undefined,
							website: input.website ?? undefined,
							slug,
							onboardingStep: 1
						}
					})
					.catch((e) => {
						throw new TRPCError({
							code: 'BAD_REQUEST',
							message: e.message
						});
					});
				if (!response)
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'organization_not_found'
					});

				organization = await db.query.organization.findFirst({
					where: (org, { eq }) => eq(org.id, response.id),
					with: {
						members: {
							with: { user: true }
						},
						openingTimes: true
					}
				});
				if (!organization) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'organization_not_found'
					});
				}
				return organization;
			}
		),
	updateBranch: privateProcedure
		.input(
			z.object({
				organizationId: z.string(),
				name: z.string().min(3),
				location: z.string().optional().nullable(),
				phone: z.string().optional().nullable(),
				email: z.string().optional().nullable(),
				website: z.string().optional().nullable(),
				timezone: z.string().min(3)
			})
		)
		.output(z.boolean())
		.mutation(
			async ({
				input: { organizationId, name, location, phone, email, website, timezone },
				ctx: { session }
			}) => {
				await db.update(schema.organization)
					.set({
						name,
						slug: convertToSlug(name),
						location,
						phone,
						email,
						website,
						timeZone: timezone
					})
					.where(eq(schema.organization.id, organizationId));
				return true;
			}
		),
	updateOnboardingStep: privateProcedure
		.input(z.object({ organizationId: z.string(), step: z.number().min(1) }))
		.output(z.boolean())
		.mutation(async ({ input: { organizationId, step } }) => {
			await db.update(schema.organization)
				.set({ onboardingStep: step })
				.where(eq(schema.organization.id, organizationId));
			return true;
		}),
	finishOnboarding: privateProcedure
		.input(z.object({ organizationId: z.string() }))
		.output(z.boolean())
		.mutation(async ({ input: { organizationId }, ctx: { session } }) => {
			await db.update(schema.organization)
				.set({ onboardingStep: null })
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
					onboardingStep: z.number().nullable(),
					services: z.array(
						z.object({
							id: z.string(),
							name: z.string(),
							price: z.number(),
							description: z.string().nullable(),
							duration: z.number()
						})
					),
					openingTimes: z.array(
						z.object({
							id: z.string(),
							dayOfWeek: z.number(),
							startTimeLocal: z.string(),
							endTimeLocal: z.string()
						})
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
								phone: z.string().nullable()
							}),
							availability: z.array(
								z.object({
									id: z.string(),
									dayOfWeek: z.number(),
									startTimeLocal: z.string(),
									endTimeLocal: z.string()
								})
							)
						})
					)
				})
			)
		)
		.query(
			async ({
				ctx: {
					session: { user }
				}
			}) => {
				const organizations = await db.query.organization.findMany({
					where: (org, { exists, select, eq }) =>
						exists(
							select()
								.from(schema.member)
								.where(eq(schema.member.organizationId, org.id), eq(schema.member.userId, user.id))
						),
					with: {
						members: {
							with: { user: true, availability: true, services: true }
						},
						openingTimes: true,
						services: true
					}
				});
				console.log('test', organizations.length);
				return organizations
					.map((organization) => {
						return {
							...organization,
							openingTimes: organization.openingTimes.map((time) => ({
								...time,
								startTimeLocal: convertToLocal(time.startTimeUtc, organization.timeZone),
								endTimeLocal: convertToLocal(time.endTimeUtc, organization.timeZone)
							})),
							members: organization.members.map((member) => ({
								...member,
								availability: member.availability.map((time) => ({
									...time,
									startTimeLocal: convertToLocal(time.startTimeUtc, organization.timeZone),
									endTimeLocal: convertToLocal(time.endTimeUtc, organization.timeZone)
								})),
								services: member.services.map((service) => service.serviceId)
							})),
							active: false
						};
					})
					.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
			}
		)
});
