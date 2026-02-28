import { isValidPhoneNumber, parsePhoneNumberWithError } from 'libphonenumber-js';
import { z } from 'zod';

export function phone(schema: z.ZodString) {
	return schema
		.refine(isValidPhoneNumber, 'invalid_phone_number')
		.transform((value) => parsePhoneNumberWithError(value));
}
