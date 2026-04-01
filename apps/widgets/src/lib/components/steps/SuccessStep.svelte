<script lang="ts">
	import { fly, scale } from 'svelte/transition';
	import Confetti from 'svelte-confetti';
	import { onMount } from 'svelte';
	// Remove writable, use Svelte 5 runes
	import type { BookingValues } from '$lib/booking-utils.js';
	import Button from '../ui/button/button.svelte';
	import SuccessAnimation from '../SuccessAnimation.svelte';
	import { backOut } from 'svelte/easing';

	interface Props {
		bookingState: BookingValues;
		branch: any;
		resetWidget: () => void;
	}

	let { bookingState, branch, resetWidget }: Props = $props();
	let showConfetti = $state(true);
</script>

<div class="relative grid h-full grid-rows-[1fr_auto] gap-2">
	{#if showConfetti}
		<div class="pointer-events-none absolute inset-0 z-10 flex h-full w-full justify-between">
			<Confetti delay={[300, 550]} x={[-0.15, 1.25]} y={[0.3, -0.8]} />
			<Confetti delay={[300, 550]} x={[0.15, -1.25]} y={[0.3, -0.8]} />
		</div>
	{/if}
	<div class="flex h-max flex-col justify-center text-center">
		<div class="mx-auto mt-4">
			<SuccessAnimation />
		</div>
		<h1
			class="widget-content-text -mt-4 text-3xl font-bold"
			in:scale={{ duration: 500, start: 1.4, delay: 500, easing: backOut }}
		>
			Bedankt voor uw afspraak!
		</h1>
	</div>

	<div class="w-full p-4">
		{#await new Promise((resolve) => setTimeout(resolve, 0)) then}
			<div class="widget-content-text w-full">
				<p class="flex justify-between" transition:fly={{ y: 25, duration: 400, delay: 700 }}>
					<span class="widget-content-text-muted font-semibold">Datum:</span>
					<span class="widget-content-text">
						{bookingState.date.calendarValue
							? bookingState.date.calendarValue.toString().split('-').join(' ')
							: ''}
					</span>
				</p>
				<p class="flex justify-between" transition:fly={{ y: 25, duration: 400, delay: 800 }}>
					<span class="widget-content-text-muted font-semibold">Lokale tijd:</span>
					<span class="widget-content-text"
						>{bookingState.date.timeValue?.toFormat('HH:mm') || ''}</span
					>
				</p>
				<p class="flex justify-between" transition:fly={{ y: 25, duration: 400, delay: 900 }}>
					<span class="widget-content-text-muted font-semibold">Dienst:</span>
					<span class="widget-content-text">
						{branch?.services.find((service: any) => service.id === bookingState.appointment.value)
							?.name || ''}
					</span>
				</p>
				<p class="flex justify-between" transition:fly={{ y: 25, duration: 400, delay: 1000 }}>
					<span class="widget-content-text-muted font-semibold">Medewerker:</span>
					<span class="widget-content-text"
						>{branch.members.find(
							(member: any) => member.id === bookingState.appointment.employeeId
						)?.name || 'Geen voorkeur'}</span
					>
				</p>
				<p class="flex justify-between" transition:fly={{ y: 25, duration: 400, delay: 1100 }}>
					<span class="widget-content-text-muted font-semibold">Locatie:</span>
					<span class="widget-content-text">{branch?.location || ''}</span>
				</p>
				<p class="flex justify-between" transition:fly={{ y: 25, duration: 400, delay: 1200 }}>
					<span class="widget-content-text-muted font-semibold">Betaling:</span>
					<span class="widget-content-text">Betaling vindt ter plaatse plaats</span>
				</p>
			</div>
		{/await}
		<Button onclick={resetWidget} class="w-full widget-button z-10 relative mt-4" size="lg"
			>Maak nog een afspraak</Button
		>
	</div>
</div>
