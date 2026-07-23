<script lang="ts">
	import { colors } from '$lib/colors';

	const { children } = $props();
</script>

<div class="relative flex min-h-screen w-full overflow-hidden">
	<div class="flex w-full">
		<!-- Inline SVG instead of <img> for blob1, so fill works -->
		<div
			class="absolute top-[0%] left-0 -z-10 size-125 -translate-x-1/2 -translate-y-1/6"
			style={`
					background-color: ${colors[0]};
					-webkit-mask: url('/blobs/blob1.svg') no-repeat center / cover;
					mask: url('/blobs/blob1.svg') no-repeat center / cover;
				`}
			aria-label="blob1"
		></div>
		<!-- Decorative blobs for welcome screen -->
		<div
			class="absolute top-0 right-0 -z-10 size-87.5 translate-x-1/2 -translate-y-1/3"
			style={`
					background-color: ${colors[1]};
					-webkit-mask: url('/blobs/blob2.svg') no-repeat center / cover;
					mask: url('/blobs/blob2.svg') no-repeat center / cover;
				`}
			aria-label="blob2"
		></div>
		<div
			class=" absolute bottom-0 left-0 -z-10 size-87.5 -translate-x-1/3 translate-y-1/2 rotate-[145deg]"
			style={`
					background-color: ${colors[2]};
					-webkit-mask: url('/blobs/blob3.svg') no-repeat center / cover;
					mask: url('/blobs/blob3.svg') no-repeat center / cover;
				`}
			aria-label="blob3"
		></div>
		<div
			class="absolute right-0 bottom-0 -z-10 size-50 translate-x-1/3 translate-y-1/4 rotate-[90deg]"
			style={`
					background-color: ${colors[3]};
					-webkit-mask: url('/blobs/blob4.svg') no-repeat center / cover;
					mask: url('/blobs/blob4.svg') no-repeat center / cover;
				`}
			aria-label="blob4"
		></div>
		<div
			class="absolute bottom-0 left-0 -z-10 size-45 translate-x-[45%] -translate-y-[25%] -rotate-45"
			style={`
					background-color: ${colors[4]};
					-webkit-mask: url('/blobs/blob5.svg') no-repeat center / cover;
					mask: url('/blobs/blob5.svg') no-repeat center / cover;
				`}
			aria-label="blob5"
		></div>
		{@render children()}
	</div>
</div>
