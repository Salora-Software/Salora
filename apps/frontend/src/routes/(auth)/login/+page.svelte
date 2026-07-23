<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { signIn, signUp } from '$lib/auth-client';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { PasswordInput } from '$lib/components/ui/password-input';
	import { t } from '$lib/translation';
	import { onMount } from 'svelte';
	let loginState: 'login' | 'signup' = $state('login');
	let authError = {
		message: '',
		errored: false,
		loading: false
	};
	let isRegister = $derived(loginState === ('signup' as const));
	let name = $state('');
	let email = $state('');
	let password = $state('');
	const errorMessage = page.url.searchParams.get('error');
	if (errorMessage) {
		authError.errored = true;
		const errorCode = page.url.searchParams.get('code');
		const errorVal = errorCode ? t.errors[errorCode as keyof typeof t.errors] : '';
		authError.message = typeof errorVal === 'string' ? errorVal : '';
	}
	onMount(() => {
		goto('/login', { replaceState: true });
	});
</script>

<div class="h-screen lg:grid lg:grid-cols-2">
	<div class="bg-muted hidden lg:block">
		<img
			src="/images/counter.png"
			alt="placeholder"
			width="1920"
			height="1080"
			class="h-full w-full object-cover saturate-[0.6] dark:brightness-[0.2] dark:grayscale"
		/>
	</div>
	<div class="flex items-center justify-center p-2.5 py-12">
		{#if !isRegister}
			<div class="mx-auto grid w-87.5 gap-6">
				<div class="grid gap-2 text-center">
					<h1 class="text-3xl font-bold">{t.login.login}</h1>
					<p class="text-muted-foreground text-balance">
						{t.login.loginDescription}
					</p>
				</div>
				<div class="grid gap-2">
					<div class="mb-4 grid gap-2">
						<Label for="email">
							{t.login.email}
						</Label>
						<Input
							error={authError.errored}
							bind:value={email}
							id="email"
							type="email"
							placeholder="johndoe@example.com"
							class="h-10"
							required
						/>
					</div>
					<div class="mb-4 grid gap-2">
						<div class="flex items-center">
							<Label for="password">
								{t.login.password}
							</Label>
							<button
								type="button"
								class="ml-auto inline-block cursor-pointer border-none bg-transparent p-0 text-sm underline"
							>
								{t.login.forgotPassword}
							</button>
						</div>
						<PasswordInput
							error={authError.errored}
							id="password"
							bind:value={password}
							required
							class="h-10"
						/>
					</div>
					<Button
						disabled={authError.loading}
						onclick={async () => {
							if (email && password) {
								authError.loading = true;
								await signIn.email({
									email: email,
									password: password,
									fetchOptions: {
										onSuccess: (ctx) => {
											document.location.href = '/';
										},
										onError: (ctx) => {
											authError.errored = true;
											authError.message = ctx.error.message;
											authError.loading = false;
										}
									}
								});
							}
						}}
						class="w-full"
					>
						{t.login.login}
					</Button>
					{#if authError.errored}
						<p class="text-red-700">
							<span>{authError.message}</span>
						</p>
					{/if}
				</div>
				<div class="mt-4 text-center text-sm">
					{t.login.noAccount}
					<button
						type="button"
						class="cursor-pointer border-none bg-transparent p-0 underline"
						onclick={() => {
							authError.errored = false;
							loginState = loginState === 'login' ? 'signup' : 'login';
						}}
					>
						{t.login.noAccountDescription}
					</button>
				</div>
			</div>
		{:else}
			<div class="mx-auto grid w-87.5 gap-6">
				<div class="grid gap-2 text-center">
					<h1 class="text-3xl font-bold">{t.login.register}</h1>
					<p class="text-muted-foreground text-balance">
						{t.login.signUpDescription}
					</p>
				</div>
				<div class="grid gap-2">
					<div class="mb-4 grid gap-2">
						<Label for="username">
							{t.login.name}
						</Label>
						<Input
							error={authError.errored}
							bind:value={name}
							id="username"
							type="text"
							placeholder="John Doe"
							required
						/>
					</div>
					<div class="mb-4 grid gap-2">
						<Label for="email">
							{t.login.email}
						</Label>
						<Input
							error={authError.errored}
							bind:value={email}
							id="email"
							type="email"
							placeholder="johndoe@example.com"
							required
						/>
					</div>
					<div class="mb-4 grid gap-2">
						<div class="flex items-center">
							<Label for="password">
								{t.login.password}
							</Label>
						</div>
						<PasswordInput error={authError.errored} bind:value={password} id="password" required />
					</div>
					<Button
						onclick={async () => {
							if (name && email && password) {
								authError.loading = true;
								await signUp.email(
									{
										email: email,
										password: password,
										name: name
									},
									{
										onSuccess: (ctx) => {
											document.location.href = '';
										},
										onError: (ctx) => {
											authError.errored = true;
											authError.message = ctx.error.message;
											authError.loading = false;
										}
									}
								);
							}
						}}
						class="w-full"
					>
						{t.login.signUp}
					</Button>

					{#if authError.errored}
						<p class="text-red-700">
							<span>{authError.message}</span>
						</p>
					{/if}
				</div>
				<div class="mt-4 text-center text-sm">
					{t.login.haveAccount}
					<button
						type="button"
						class="cursor-pointer border-none bg-transparent p-0 underline"
						onclick={() => {
							authError.errored = false;
							loginState = loginState === 'login' ? 'signup' : 'login';
						}}
					>
						{t.login.haveAccountDescription}
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
