<script>
	import Button from '$lib/components/ui/button/button.svelte';
	import { colors } from '$lib/colors';
	import Confetti from 'svelte-confetti';
</script>

<div class="mx-auto flex w-full max-w-md flex-col items-center space-y-8 px-6 text-center">
	<!-- Logo/Brand area -->
	<div class="space-y-4">
		<img
			alt="Salora Logo"
			src="/logos/logo-square.svg"
			class="mx-auto flex h-24 w-24 items-center justify-center rounded-xl bg-[#65b4d8] shadow-lg"
		/>
	</div>

	<!-- Main content -->
	<div class=" relative space-y-6 text-gray-700">
		<div class="space-y-3">
			<h1 class="text-4xl leading-tight font-light">
				Welkom bij
				<span class="font-bold text-black">Salora!</span>
				<span class="relative">
					<div class="absolute top-3 right-3.75">
						<Confetti cone delay={[800, 1300]} x={[0, 1.5]} y={[0.25, 0.8]} />
					</div>
					<span class="shake inline-block"> 🎉 </span>
				</span>
			</h1>
			<h2 class="text-2xl text-gray-600">
				Laten we samen je eerste <br />vestiging opzetten
			</h2>
		</div>
	</div>

	<!-- Action buttons -->
	<div class="w-full space-y-3">
		<Button
			class="h-12 w-full text-base font-medium text-white shadow-lg transition-all duration-200 hover:shadow-xl"
			onclick={async () => {
				// if (nextStep) {
				// 	await nextStep();
				// }
			}}
		>
			Laten we beginnen!
		</Button>

		<p class="text-muted-foreground text-center text-xs">Duurt slechts een paar minuten</p>
	</div>

	<!-- Footer text -->
	<div class="space-y-1 text-center">
		<p class="text-muted-foreground text-xs">
			Door verder te gaan ga je akkoord met onze
			<a href="/algemene-voorwaarden" class="text-primary hover:underline">Voorwaarden</a>
			& <a href="/privacy" class="text-primary hover:underline">Privacy</a>
		</p>
		<p class="text-muted-foreground text-xs">
			Salora – Eenvoudig afspraken beheren voor jouw bedrijf ❤️
		</p>
	</div>
</div>

<style>
	@keyframes shake {
		0% {
			transform: rotate(0deg);
		}
		20% {
			transform: rotate(-8deg);
		}
		40% {
			transform: rotate(8deg);
		}
		60% {
			transform: rotate(-8deg);
		}
		80% {
			transform: rotate(8deg);
		}
		100% {
			transform: rotate(0deg);
		}
	}
	.shake {
		animation: shake 1s;
		animation-delay: 800ms;
	}
</style>
