import CheckCircle from '@solar-icons/svelte/linear/check-circle';
import CheckSquare from '@solar-icons/svelte/linear/check-square';
import CloseCircle from '@solar-icons/svelte/linear/close-circle';
import Hourglass from '@solar-icons/svelte/linear/hourglass';

/**
 * Icons for the appointment/booking statuses. The status labels themselves no
 * longer contain emoji, so the icon is rendered separately next to the label.
 */
export const bookingStatusIcons = {
	CONFIRMED: CheckCircle,
	COMPLETED: CheckSquare,
	CANCELLED: CloseCircle,
	PENDING: Hourglass
} as const;

/** Subtle per-status colors so the icons stay distinguishable at a glance. */
export const bookingStatusColors = {
	CONFIRMED: 'text-emerald-600 dark:text-emerald-400',
	COMPLETED: 'text-sky-600 dark:text-sky-400',
	CANCELLED: 'text-red-600 dark:text-red-400',
	PENDING: 'text-amber-600 dark:text-amber-400'
} as const;

export type BookingStatus = keyof typeof bookingStatusIcons;
