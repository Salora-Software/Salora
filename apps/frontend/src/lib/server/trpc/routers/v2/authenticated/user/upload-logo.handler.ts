import { TRPCError } from '@trpc/server';
import { generateUploadUrl } from '$lib/server/s3';
import type { GenerateLogoUploadUrlInput } from './upload-logo.schema';

export const generateLogoUploadUrlHandler = async ({
	input: { fileSize },
	ctx: { session }
}: {
	input: GenerateLogoUploadUrlInput;
	ctx: any;
}) => {
	const userId = session.user.id;

	// Validate file size if provided (max 2MB)
	if (fileSize && fileSize > 2 * 1024 * 1024) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'file_size_must_be_2mb_or_less'
		});
	}

	// Generate a unique image ID
	const imageId = crypto.randomUUID().replace(/-/g, '');
	const imageKey = `users/${userId}/profile_${imageId}.png`;

	// Generate presigned upload URL
	const uploadUrl = await generateUploadUrl(imageKey, 'image/*');

	return { uploadUrl, imageId };
};
