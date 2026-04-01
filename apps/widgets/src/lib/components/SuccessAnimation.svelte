<script lang="ts">
</script>

<div class="icon-wrap">
	<svg class="success-svg" viewBox="0 0 100 100" width="120" height="120">
		<circle
			class="success-circle"
			cx="50"
			cy="50"
			r="40"
			fill="none"
			stroke="#10b981"
			stroke-width="6"
			stroke-linecap="round"
		></circle>
		<polyline
			class="success-check"
			points="35 50 45 60 65 40"
			fill="none"
			stroke="#10b981"
			stroke-width="6"
			stroke-linecap="round"
			stroke-linejoin="round"
		></polyline>
	</svg>
</div>

<style>
	.icon-wrap {
		margin-bottom: 20px;
		transform: scale(0);
		animation: pop-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1.3) forwards;
	}

	@keyframes pop-in {
		0% {
			transform: scale(0);
		}
		80% {
			transform: scale(1.1);
		}
		100% {
			transform: scale(1);
		}
	}

	.success-circle {
		stroke-dasharray: 252;
		stroke-dashoffset: 252;
		animation: draw-circle 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s forwards;
	}

	/* Mathematical exact length of the checkmark path */
	.success-check {
		stroke-dasharray: 50;
		stroke-dashoffset: 50;
		animation: draw-check 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.7s forwards;
	}

	@keyframes draw-circle {
		to {
			stroke-dashoffset: 0;
		}
	}

	@keyframes draw-check {
		to {
			stroke-dashoffset: 0;
		}
	}
</style>
