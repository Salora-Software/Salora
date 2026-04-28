function groupPhoneDigits(digits: string): string {
	if (digits.startsWith('31') && digits.length > 2) {
		const nationalNumber = digits.slice(2);
		if (!nationalNumber) return '31';
		if (nationalNumber.length === 1) return `31 ${nationalNumber}`;
		return `31 ${nationalNumber[0]} ${nationalNumber.slice(1)}`;
	}

	if (digits.startsWith('0') && digits.length > 2) {
		if (digits.length <= 2) return digits;
		if (digits.length <= 4) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
		return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`.trim();
	}

	if (digits.length <= 3) return digits;
	if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
	return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`.trim();
}

export function formatPhoneInput(value: string): string {
	const trimmedValue = value.trim();
	if (!trimmedValue) return '';

	const hasLeadingPlus = trimmedValue.startsWith('+');
	const digitsOnly = trimmedValue.replace(/\D/g, '');

	if (!digitsOnly) return '';
	const formattedDigits = groupPhoneDigits(digitsOnly);
	return hasLeadingPlus ? `+${formattedDigits}` : formattedDigits;
}

export function normalizePhoneForSubmit(value: string): string | undefined {
	const digitsOnly = value.replace(/\D/g, '');
	return digitsOnly ? digitsOnly : undefined;
}