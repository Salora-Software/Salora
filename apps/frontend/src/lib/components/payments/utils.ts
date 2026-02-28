export function discountedPrice(
	price: number,
	discount: number | null,
	type: 'euro' | 'percent'
): number {
	if (!discount) discount = 0;
	if (type === 'percent') {
		return Math.max(0, price - price * (discount / 100));
	}
	return Math.max(0, price - discount);
}

export function enforceSingleMinus(val: string): string {
	// Remove all minus except at the start
	val = val.replace(/^-+/, '-'); // Collapse multiple leading minuses to one
	val = val.replace(/(?!^)-+/g, ''); // Remove any minus not at the start
	return val;
}

export function formatPrice(price: number): string {
	return `€ ${price.toFixed(2)}`;
}
