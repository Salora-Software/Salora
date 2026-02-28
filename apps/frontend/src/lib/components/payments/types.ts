export type Booking = {
	id: string;
	label: string;
	price: number;
	customer: string;
	serviceType: string;
	timeslot: string;
};

export type Service = {
	id: string;
	name: string;
	price: number;
	category: string;
	duration?: number; // in minutes
};

export type ServiceCategory = {
	name: string;
	color: string;
	bgColor: string;
	borderColor: string;
};

export type Terminal = {
	label: string;
	value: string;
};

export type PaymentRequest = {
	type: 'booking' | 'service';
	bookingId?: string;
	services?: { id: string; name: string; price: number }[];
	terminal: string;
	price: number;
	coupon: string;
};
