import { TRPCError } from '@trpc/server';
import { prisma } from '$lib/server/prisma';
import { deleteImage, validateUploadedFileSize } from '$lib/server/s3';
import type { ConfirmLogoUploadInput } from './confirm-logo.schema';

export const confirmLogoUploadHandler = async ({
	input: { imageId },
	ctx: { session }
}: {
	input: ConfirmLogoUploadInput;
	ctx: any;
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
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { image: true }
	});

	// Delete old image if it exists
	if (user?.image) {
		deleteImage(user.image[0] === '/' ? user.image.substring(1) : user.image).catch((e) => {
			console.error('Error deleting old profile picture:', e);
		});
	}

	// Update user with new image path
	await prisma.user.update({
		where: { id: userId },
		data: { image: `/${imageKey}` }
	});

	return `/${imageKey}`;
};
