import { TRPCError } from '@trpc/server';
import { prisma } from '$lib/server/prisma';
import { deleteImage, validateUploadedFileSize } from '$lib/server/s3';
import type { ConfirmLogoUploadInput } from './confirm-logo.schema';

export const confirmLogoUploadHandler = async ({
	input: { organizationId, imageId }
}: {
	input: ConfirmLogoUploadInput;
	ctx: any;
}) => {
	// Reconstruct the imageKey from the imageId to prevent path manipulation
	const imageKey = `organizations/${organizationId}/logo_${imageId}.png`;

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

	// Get current logo to delete it
	const org = await prisma.organization.findUnique({
		where: { id: organizationId },
		select: { logo: true }
	});

	// Delete old logo if it exists
	if (org?.logo) {
		deleteImage(org.logo[0] === '/' ? org.logo.substring(1) : org.logo).catch((e) => {
			console.error('Error deleting old logo:', e);
		});
	}

	// Update organization with new logo path
	await prisma.organization.update({
		where: { id: organizationId },
		data: { logo: `/${imageKey}` }
	});

	return `/${imageKey}`;
};
