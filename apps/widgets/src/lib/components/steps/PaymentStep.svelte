<script lang="ts">
	import type { BookingValues } from '$lib/booking-utils.js';
	import { language } from '$lib/translation';
	import { DateTime } from 'luxon';

	interface Props {
		bookingState: BookingValues;
		branch: any;
	}

	let { bookingState, branch }: Props = $props();
</script>

<div class="grid gap-2">
	<h2 class="widget-content-text">Samenvatting</h2>
	<div class="widget-input rounded-md border p-4">
		<div class="flex justify-between">
			<p class="widget-content-text">Dienst</p>
			<p class="widget-content-text">
				{branch.services.find((service: any) => service.id === bookingState.appointment.value)
					?.name || ''}
			</p>
		</div>
		<div class="flex justify-between">
			<p class="widget-content-text">Prijs</p>
			<p class="widget-content-text">
				€
				{branch.services
					.find((service: any) => service.id === bookingState.appointment.value)
					?.price.toFixed(2) || ''}
			</p>
		</div>
		<div class="flex justify-between">
			<p class="widget-content-text">Datum</p>
			<p class="widget-content-text">
				{bookingState.date.calendarValue
					? DateTime.fromJSDate(bookingState.date.calendarValue.toDate(branch?.timeZone || 'utc'))
							.setLocale(language)
							.toFormat('DDDD')
					: ''}
			</p>
		</div>
		<div class="flex justify-between">
			<p class="widget-content-text">Tijd</p>
			<p class="widget-content-text">
				{bookingState.date.timeValue &&
				typeof bookingState.date.timeValue === 'object' &&
				'start' in bookingState.date.timeValue &&
				bookingState.date.timeValue.start &&
				'end' in bookingState.date.timeValue &&
				bookingState.date.timeValue.end
					? `${bookingState.date.timeValue.start.setLocale(language).toFormat('HH:mm')} - ${bookingState.date.timeValue.end.setLocale(language).toFormat('HH:mm')}`
					: ''}
			</p>
		</div>
	</div>
	<h2 class="widget-content-text">Betalingsmethode</h2>
	<p class="widget-content-text-muted w-full text-center">Betaling vindt ter plaatse plaats</p>
</div>
