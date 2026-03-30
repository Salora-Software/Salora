import {
	S3Client,
	PutObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '$lib/server/env';

const isWorkerTarget = process.env?.DEPLOY_TARGET === 'worker';

//@ts-ignore
const S3 = new S3Client({
	region: 'auto',
	endpoint: `https://${env?.ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: env?.ACCESS_KEY_ID,
		secretAccessKey: env?.SECRET_ACCESS_KEY
	}
});
const bucket = env?.S3_BUCKET;

export async function generateAccessToken(fileId: string) {
	const token = await getSignedUrl(
		S3,
		new GetObjectCommand({
			Bucket: bucket,
			Key: fileId
		}),
		{ expiresIn: 60 * 60 }
	);

	return token;
}

export async function generateUploadUrl(
	key: string,
	contentType: string = 'image/*',
	maxSizeBytes: number = 2 * 1024 * 1024
) {
	const command = new PutObjectCommand({
		Bucket: bucket,
		Key: key,
		ContentType: contentType,
		Metadata: {
			'uploaded-via': 'presigned-url',
			'max-size': maxSizeBytes.toString()
		}
	});

	const uploadUrl = await getSignedUrl(S3, command, {
		expiresIn: 60 * 15 // 15 minutes
	});

	return uploadUrl;
}

// Enhanced validation function that works with File objects and size in bytes
export function validateFileSize(file: File | number, maxSizeInMB: number = 2): boolean {
	const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
	const fileSize = typeof file === 'number' ? file : file.size;
	return fileSize <= maxSizeInBytes;
}

// New function to validate uploaded file size by checking the object in S3
export async function validateUploadedFileSize(
	key: string,
	maxSizeBytes: number = 2 * 1024 * 1024
): Promise<boolean> {
	try {
		const command = new GetObjectCommand({
			Bucket: bucket,
			Key: key
		});

		const response = await S3.send(command);
		const contentLength = response.ContentLength || 0;

		return contentLength <= maxSizeBytes;
	} catch (error) {
		console.error('Error validating file size:', error);
		return false;
	}
}

export async function uploadImage(imageBlob: Blob, key: string) {
	if (isWorkerTarget) {
		const command = new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			Body: new Uint8Array(await imageBlob.arrayBuffer()),
			ContentType: imageBlob.type || 'application/octet-stream'
		});

		await S3.send(command);
		return;
	}

	const { default: sharp } = await import('sharp');

	// Convert Blob to Buffer
	const inputBuffer = Buffer.from(await imageBlob.arrayBuffer());
	// Process the image with Sharp
	const processedImage = await sharp(inputBuffer)
		.resize(500, 500) // Resize to 500x500 pixels
		.toFormat('png') // Convert to png
		.png({ quality: 90, colours: 4 }) // Set compression quality
		.toBuffer();

	// Upload the processed image to S3
	const command = new PutObjectCommand({
		Bucket: bucket,
		Key: key,
		Body: processedImage,
		ContentType: 'image/png'
	});

	await S3.send(command);
}

export async function deleteImage(key: string) {
	const command = new DeleteObjectCommand({
		Bucket: bucket,
		Key: key
	});
	await S3.send(command);
}
