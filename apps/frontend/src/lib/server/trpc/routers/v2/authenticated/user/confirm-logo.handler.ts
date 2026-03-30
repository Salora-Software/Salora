import { TRPCError } from '@trpc/server';
import { schema } from '@salora/database';
import { deleteImage, validateUploadedFileSize } from '$lib/server/s3';
import type { ConfirmLogoUploadInput } from './confirm-logo.schema';
import type { PrivateContext } from '$lib/server/trpc/context';
import { eq } from 'drizzle-orm';

export const confirmLogoUploadHandler = async ({
	input: { imageId },
	ctx: { session, db }
}: {
	input: ConfirmLogoUploadInput;
	ctx: PrivateContext;
}) => {
	const userId = session.user.id;
	const imageKey = `users/${userId}/profile_${imageId}.png`;

	// Validate that the uploaded file doesn't exceed 2MB
	const isValidSize = await validateUploadedFileSize(imageKey, 2 * 1024 * 1024);
	if (!isValidSize) {
		// Delete the oversized file
		await deleteImage(imageKey);
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'uploaded_file_exceeds_2mb_limit_and_has_been_deleted'
		});
	}

	// Get current image to delete it
	const user = await db.query.user.findFirst({
		where: (user, { eq }) => eq(user.id, userId),
		columns: { image: true }
	});

	// Delete old image if it exists
	if (user?.image) {
		deleteImage(user.image[0] === '/' ? user.image.substring(1) : user.image).catch((e) => {
			console.error('Error deleting old profile picture:', e);
		});
	}

	// Update user with new image path
	await db
		.update(schema.user)
		.set({ image: `/${imageKey}` })
		.where(eq(schema.user.id, userId));

	return `/${imageKey}`;
};
