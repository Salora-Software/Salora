import { z } from 'zod';
import { router as createRouter, privateProcedure } from '../../../../context';
import { schema } from '@salora/database';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { deleteImage, uploadImage } from '$lib/server/s3';

export const router = createRouter({
	changeProfilePicture: privateProcedure
		.input(z.object({ image: z.string().url() }))
		.output(z.string())
		.mutation(
			async ({
				input: { image },
				ctx: {
					session: { user },
					db
				}
			}) => {
				const response = await fetch(image);
				const imageBlob = await response.blob();
				const imageId = crypto.randomUUID().replace(/-/g, '');
				if (user.image)
					deleteImage(user.image[0] === '/' ? user.image.substring(1) : user.image).catch((e) => {
						console.error(e);
					});
				const imageurl = await uploadImage(imageBlob, `users/${user.id}/profile_${imageId}.png`);

				//save the image in the database
				await db
					.update(schema.user)
					.set({ image: `/users/${user.id}/profile_${imageId}.png` })
					.where(eq(schema.user.id, user.id));
				return `/users/${user.id}/profile_${imageId}.png`;
			}
		),

	changePassword: privateProcedure
		.input(
			z.object({
				password: z.string().min(8),
				newPassword: z.string().min(8)
			})
		)
		.output(z.boolean())
		.mutation(async ({ input: { password, newPassword }, ctx: { auth, db, session } }) => {
			// get the hashed passwords
			const ctxAuth = await auth.$context;
			const newPasswordHash = await ctxAuth.password.hash(newPassword);

			// Check if the user exists and the password is correct
			const account = await db.query.account.findFirst({
				where: eq(schema.account.userId, session.user.id),
				columns: { password: true }
			});
			if (!account) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'account_not_found'
				});
			}
			const isPasswordCorrect = await ctxAuth.password.verify({
				password: password,
				hash: account.password || ''
			});

			if (!isPasswordCorrect) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'invalid_password'
				});
			}

			// Update the password
			await ctxAuth.internalAdapter.updatePassword(session.user.id, newPasswordHash);
			return true;
		}),

	changeName: privateProcedure
		.input(
			z.object({
				name: z.string().min(3)
			})
		)
		.output(z.boolean())
		.mutation(
			async ({
				input: { name },
				ctx: {
					session: { user },
					db
				}
			}) => {
				await db.update(schema.user).set({ name }).where(eq(schema.user.id, user.id));
				return true;
			}
		),

	changeEmail: privateProcedure
		.input(
			z.object({
				email: z.string().email()
			})
		)
		.output(z.boolean())
		.mutation(
			async ({
				input: { email },
				ctx: {
					session: { user },
					db
				}
			}) => {
				await db
					.update(schema.user)
					.set({ email, emailVerified: false })
					.where(eq(schema.user.id, user.id));
				return true;
			}
		)
}); //
