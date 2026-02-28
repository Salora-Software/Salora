import type { Booking, Service, ServiceCategory, Terminal } from './types';

export const terminals: Terminal[] = [
	{ label: 'Terminal1', value: 'terminal1' },
	{ label: 'Terminal2', value: 'terminal2' }
];

export const serviceCategories: Record<string, ServiceCategory> = {
	hair: {
		name: 'Haar',
		color: 'text-[var(--color-category-hair-text)]',
		bgColor: 'bg-[var(--color-category-hair-bg)]',
		borderColor:
			'border-[var(--color-category-hair-border)] hover:border-[var(--color-category-hair-active)]'
	},
	beard: {
		name: 'Baard',
		color: 'text-[var(--color-category-beard-text)]',
		bgColor: 'bg-[var(--color-category-beard-bg)]',
		borderColor:
			'border-[var(--color-category-beard-border)] hover:border-[var(--color-category-beard-active)]'
	},
	styling: {
		name: 'Styling',
		color: 'text-[var(--color-category-styling-text)]',
		bgColor: 'bg-[var(--color-category-styling-bg)]',
		borderColor:
			'border-[var(--color-category-styling-border)] hover:border-[var(--color-category-styling-active)]'
	},
	treatment: {
		name: 'Behandeling',
		color: 'text-[var(--color-category-treatment-text)]',
		bgColor: 'bg-[var(--color-category-treatment-bg)]',
		borderColor:
			'border-[var(--color-category-treatment-border)] hover:border-[var(--color-category-treatment-active)]'
	}
};

export const services: Service[] = [
	{ id: 's1', name: 'Knippen', price: 30, category: 'hair', duration: 30 },
	{ id: 's2', name: 'Wassen', price: 20, category: 'hair', duration: 15 },
	{ id: 's3', name: 'Föhnen', price: 25, category: 'styling', duration: 20 },
	{ id: 's4', name: 'Baard trimmen', price: 15, category: 'beard', duration: 15 },
	{ id: 's5', name: 'Baard scheren', price: 20, category: 'beard', duration: 20 },
	{ id: 's6', name: 'Kleuren', price: 65, category: 'treatment', duration: 90 },
	{ id: 's7', name: 'Highlights', price: 85, category: 'treatment', duration: 120 },
	{ id: 's8', name: 'Permanent', price: 95, category: 'treatment', duration: 150 },
	{ id: 's13', name: 'Haarspoeling', price: 12, category: 'treatment', duration: 10 },
	{ id: 's14', name: 'Massage', price: 35, category: 'treatment', duration: 30 }
];

export const bookings: Booking[] = [
	{
		id: 'b1',
		label: 'Boeking #1 - Jan Jansen',
		price: 50.0,
		customer: 'Jan Jansen',
		serviceType: 'Knippen',
		timeslot: '14:00 - 14:30'
	},
	{
		id: 'b2',
		label: 'Boeking #2 - Piet Pietersen',
		price: 75.0,
		customer: 'Piet Pietersen',
		serviceType: 'Wassen',
		timeslot: '14:00 - 14:45'
	},
	{
		id: 'b3',
		label: 'Boeking #3 - Maria Santos',
		price: 35.0,
		customer: 'Maria Santos',
		serviceType: 'Föhnen',
		timeslot: '14:00 - 14:25'
	},
	{
		id: 'b4',
		label: 'Boeking #4 - Ahmed Hassan',
		price: 60.0,
		customer: 'Ahmed Hassan',
		serviceType: 'Knippen + Baard',
		timeslot: '15:30 - 16:00'
	},
	{
		id: 'b5',
		label: 'Boeking #5 - Li Wei',
		price: 40.0,
		customer: 'Li Wei',
		serviceType: 'Knippen',
		timeslot: '16:00 - 16:30'
	},
	{
		id: 'b6',
		label: 'Boeking #6 - Anna Müller',
		price: 55.0,
		customer: 'Anna Müller',
		serviceType: 'Wassen + Föhnen',
		timeslot: '16:15 - 16:45'
	},
	{
		id: 'b7',
		label: 'Boeking #7 - Carlos Ruiz',
		price: 70.0,
		customer: 'Carlos Ruiz',
		serviceType: 'Knippen + Wassen',
		timeslot: '17:00 - 17:30'
	}
];
