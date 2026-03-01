<script lang="ts">
	import type { BookingValues } from '$lib/booking-utils.js';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import { DateTime } from 'luxon';

	interface Props {
		bookingState: BookingValues;
		branch: any;
	}

	let { bookingState, branch }: Props = $props();
	const locale = getLocale();
</script>

<div class="grid gap-2">
	<h2 class="widget-content-text">{m['payment.summary.title']()}</h2>
	<div class="widget-input rounded-md border p-4">
		<div class="flex justify-between">
			<p class="widget-content-text">{m['payment.summary.service']()}</p>
			<p class="widget-content-text">
				{branch.services.find((service: any) => service.id === bookingState.appointment.value)
					?.name || ''}
			</p>
		</div>
		<div class="flex justify-between">
			<p class="widget-content-text">{m['payment.summary.price']()}</p>
			<p class="widget-content-text">
				€
				{branch.services
					.find((service: any) => service.id === bookingState.appointment.value)
					?.price.toFixed(2) || ''}
			</p>
		</div>
		<div class="flex justify-between">
			<p class="widget-content-text">{m['payment.summary.date']()}</p>
			<p class="widget-content-text">
				{bookingState.date.calendarValue
					? DateTime.fromJSDate(bookingState.date.calendarValue.toDate(branch?.timeZone || 'utc'))
							.setLocale(locale)
							.toFormat('DDDD')
					: ''}
			</p>
		</div>
		<div class="flex justify-between">
			<p class="widget-content-text">{m['payment.summary.time']()}</p>
			<p class="widget-content-text">
				{bookingState.date.timeValue &&
				typeof bookingState.date.timeValue === 'object' &&
				'start' in bookingState.date.timeValue &&
				bookingState.date.timeValue.start &&
				'end' in bookingState.date.timeValue &&
				bookingState.date.timeValue.end
					? `${bookingState.date.timeValue.start.setLocale(locale).toFormat('HH:mm')} - ${bookingState.date.timeValue.end.setLocale(locale).toFormat('HH:mm')}`
					: ''}
			</p>
		</div>
	</div>
	<h2 class="widget-content-text">{m['payment.method.title']()}</h2>
	<p class="widget-content-text-muted w-full text-center">{m['payment.method.payOnSite']()}</p>
</div>
