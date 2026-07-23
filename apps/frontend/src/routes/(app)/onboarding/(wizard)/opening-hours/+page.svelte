<script lang="ts">
	import TimeSlotScheduler from '$lib/components/ui/time-slot-scheduler/time-slot-scheduler.svelte';

	const defaultBusinessLayout = [
		{
			day: 1,
			openHour: '',
			openMinute: '',
			closeHour: '',
			closeMinute: ''
		},
		{
			day: 2,
			openHour: '',
			openMinute: '',
			closeHour: '',
			closeMinute: ''
		},
		{
			day: 3,
			openHour: '',
			openMinute: '',
			closeHour: '',
			closeMinute: ''
		},
		{
			day: 4,
			openHour: '',
			openMinute: '',
			closeHour: '',
			closeMinute: ''
		},
		{
			day: 5,
			openHour: '',
			openMinute: '',
			closeHour: '',
			closeMinute: ''
		}
	];
	let businessHours:
		| {
				id?: string;
				day: number;
				openHour: string;
				openMinute: string;
				closeHour: string;
				closeMinute: string;
		  }[]
		| [] = $state([...defaultBusinessLayout]);
</script>

<div>
	<TimeSlotScheduler bind:schedules={businessHours} />
</div>
