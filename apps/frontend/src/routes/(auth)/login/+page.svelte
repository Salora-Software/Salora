<script lang="ts">
	import { page } from '$app/state';
	import { login, register } from './auth.remote';
	import { loginSchema, registerSchema } from '$lib/auth-schema';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { PasswordInput } from '$lib/components/ui/password-input';
	import { t } from '$lib/translation';

	let mode = $state<'login' | 'register'>('login');
	let isRegister = $derived(mode === 'register');

	// Where to send the user after a successful login/register (?redirectTo=/...)
	const redirectTo = $derived(page.url.searchParams.get('redirectTo') ?? '/');
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

				<form {...login.preflight(loginSchema)} class="grid gap-2" oninput={() => login.validate()}>
					<input type="hidden" name="redirectTo" value={redirectTo} />

					<div class="mb-4 grid gap-2">
						<Label for="login-email">
							{t.login.email}
						</Label>
						<Input
							{...login.fields.email.as('email')}
							id="login-email"
							placeholder="johndoe@example.com"
							autocomplete="email"
							autocapitalize="none"
							spellcheck="false"
							class="h-10"
						/>
						{#each login.fields.email.issues() ?? [] as issue}
							<p class="text-destructive text-sm">{issue.message}</p>
						{/each}
					</div>

					<div class="mb-4 grid gap-2">
						<div class="flex items-center">
							<Label for="login-password">
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
							{...login.fields._password.as('password')}
							id="login-password"
							placeholder="••••••••"
							autocomplete="current-password"
							class="h-10"
						/>
						{#each login.fields._password.issues() ?? [] as issue}
							<p class="text-destructive text-sm">{issue.message}</p>
						{/each}
					</div>

					<Button type="submit" disabled={login.pending} class="w-full">
						{login.pending ? t.login.loggingIn : t.login.login}
					</Button>

					{#each login.fields
						.allIssues()
						?.filter((issue) => issue.path.length === 0) ?? [] as issue}
						<p class="text-destructive text-center text-sm" role="alert">{issue.message}</p>
					{/each}
				</form>

				<div class="mt-4 text-center text-sm">
					{t.login.noAccount}
					<button
						type="button"
						class="cursor-pointer border-none bg-transparent p-0 underline"
						onclick={() => (mode = 'register')}
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

				<form
					{...register.preflight(registerSchema)}
					class="grid gap-2"
					oninput={() => register.validate()}
				>
					<input type="hidden" name="redirectTo" value={redirectTo} />

					<div class="mb-4 grid gap-2">
						<Label for="register-name">
							{t.login.name}
						</Label>
						<Input
							{...register.fields.name.as('text')}
							id="register-name"
							placeholder="John Doe"
							autocomplete="name"
							class="h-10"
						/>
						{#each register.fields.name.issues() ?? [] as issue}
							<p class="text-destructive text-sm">{issue.message}</p>
						{/each}
					</div>

					<div class="mb-4 grid gap-2">
						<Label for="register-email">
							{t.login.email}
						</Label>
						<Input
							{...register.fields.email.as('email')}
							id="register-email"
							placeholder="johndoe@example.com"
							autocomplete="email"
							autocapitalize="none"
							spellcheck="false"
							class="h-10"
						/>
						{#each register.fields.email.issues() ?? [] as issue}
							<p class="text-destructive text-sm">{issue.message}</p>
						{/each}
					</div>

					<div class="mb-4 grid gap-2">
						<Label for="register-password">
							{t.login.password}
						</Label>
						<PasswordInput
							{...register.fields._password.as('password')}
							id="register-password"
							placeholder="••••••••"
							autocomplete="new-password"
							class="h-10"
						/>
						{#each register.fields._password.issues() ?? [] as issue}
							<p class="text-destructive text-sm">{issue.message}</p>
						{/each}
					</div>

					<Button type="submit" disabled={register.pending} class="w-full">
						{register.pending ? t.login.registering : t.login.signUp}
					</Button>

					{#each register.fields
						.allIssues()
						?.filter((issue) => issue.path.length === 0) ?? [] as issue}
						<p class="text-destructive text-center text-sm" role="alert">{issue.message}</p>
					{/each}
				</form>

				<div class="mt-4 text-center text-sm">
					{t.login.haveAccount}
					<button
						type="button"
						class="cursor-pointer border-none bg-transparent p-0 underline"
						onclick={() => (mode = 'login')}
					>
						{t.login.haveAccountDescription}
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
