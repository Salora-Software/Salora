import { TRPCError } from '@trpc/server';
import { generateUploadUrl } from '$lib/server/s3';
import type { GenerateLogoUploadUrlInput } from './upload-logo.schema';
import type { PrivateContext } from '$lib/server/trpc/context';

export const generateLogoUploadUrlHandler = async ({
	input: { organizationId, fileSize }
}: {
	input: GenerateLogoUploadUrlInput;
	ctx: PrivateContext;
}) => {
	// Validate file size if provided (max 2MB)
	if (fileSize && fileSize > 2 * 1024 * 1024) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'file_size_must_be_2mb_or_less'
		});
	}

	// Generate a unique image ID
	const imageId = crypto.randomUUID().replace(/-/g, '');
	const imageKey = `organizations/${organizationId}/logo_${imageId}.png`;

	// Generate presigned upload URL
	const uploadUrl = await generateUploadUrl(imageKey, 'image/*');

	return { uploadUrl, imageId };
};
