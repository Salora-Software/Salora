<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import {
		HandCoins,
		House,
		Calendar,
		Settings,
		ChevronsUpDown,
		LogOut,
		Landmark,
		Scissors,
		ShoppingCart,
		UsersRound,
		Plus,
		Sparkles,
		Check,
		Loader,
		BellDot,
		PiggyBank,
		Minus,
		Undo2
	} from 'lucide-svelte';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { goto, preloadData } from '$app/navigation';
	import { onMount, tick } from 'svelte';
	import { organization, signOut } from '$lib/auth-client';
	import { Label } from './ui/label/index';
	import { Input } from './ui/input/index';
	import { Button } from './ui/button/index';
	import { trpc, type RouterOutput } from '$lib/trpc';
	import { toast } from 'svelte-sonner';
	import { Skeleton } from './ui/skeleton/index';
	import {
		type BranchesType,
		type SessionUserType,
		BranchesState,
		SessionUserState,
		BranchWizardState
	} from '$lib/runes.svelte';
	import { t } from '$lib/translation';
	import { page } from '$app/state';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { cn } from '$lib/utils';
	import { env } from '$env/dynamic/public';
	let accountSettings = $state(false);
	let {
		open = $bindable(false),
		data
	}: {
		open?: boolean;
		data: {
			session: SessionUserType;
			branches: BranchesType;
			sessionState: SessionUserState;
			branchesState: BranchesState;
			branchWizardState: BranchWizardState;
		};
	} = $props();

	// Menu items.
	const items = {
		default: {
			top: [
				{
					id: 'dashboard',
					url: '/',
					icon: House
				},
				{
					id: 'calendar',
					url: '/calendar',
					icon: Calendar
				},
				{
					id: 'customers',
					url: '/customers',
					icon: UsersRound
				},
				{
					id: 'products',
					url: '/products',
					icon: ShoppingCart
				}
			],
			bottom: [
				{
					id: 'settings',
					url: '/settings/general',
					icon: Settings
				}
			]
		},
		settings: {
			top: {
				general: [
					{
						id: 'general',
						url: '/settings/general',
						icon: Settings
					},
					{
						id: 'branch',
						url: '/settings/branch',
						icon: Landmark
					},
					{
						id: 'business-hours',
						url: '/settings/business-hours',
						icon: Calendar
					},
					{
						id: 'employees',
						url: '/settings/employees',
						icon: UsersRound
					},
					{
						id: 'notifications',
						url: '/settings/notifications',
						icon: BellDot
					}
				],
				'my-account': [
					{
						id: 'profile',
						url: '/settings/profile',
						icon: UsersRound
					}
				]
			}
		}
	};
	let logos = {
		Scissors,
		Landmark
	};
	const sidebar = useSidebar();
	onMount(async () => {
		trpc.v1.authenticated.organization.getBranches.query({}).then(async (branches) => {
			if (branches.length <= 0) {
				data.branchWizardState.open(true);
				return;
			}
			let { data: org } = await organization.getFullOrganization();
			if (org && org.onboardingStep) {
				data.branchWizardState.open(data.branches.length > 2, org.onboardingStep, org.id);
			}
			if (!org && branches.length > 0) {
				const branch = data.branchesState.setActiveBranch(0);
				await organization.setActive({
					organizationId: branches[0].id
				});

				if (branch && branch.onboardingStep) {
					data.branchWizardState.open(data.branches.length > 2, branch.onboardingStep, branch.id);
				}
			}
			data.branchesState.setBranches(branches, org?.id || branches[0]?.id);

			if (branches.length === 0) {
				data.branchWizardState.open(true);
			}
		});
	});
</script>

<Sidebar.Root collapsible="icon">
	<Sidebar.Header class="border-border flex h-16 items-center justify-center border-b">
		<Sidebar.Menu>
			{#if page.url.pathname.split('/')[1] === 'settings'}
				<Sidebar.MenuItem>
					<Sidebar.MenuButton>
						{#snippet child({ props })}
							<a
								{...props}
								class={cn(props?.class || '', 'text-foreground !h-12 cursor-pointer font-semibold')}
								onclick={() => {
									goto('/');
								}}
							>
								<Undo2 class="size-6" />
								<span class="truncate">{t.pages.settings}</span>
							</a>
						{/snippet}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			{:else}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						<Sidebar.MenuItem>
							<Sidebar.MenuButton>
								{#snippet child({ props })}
									<a
										{...props}
										class={(open
											? (props.class as String)
											: (typeof props.class === 'string' ? props.class.replace('!p-2', '') : '') +
												' !p-0') + ' !h-12 cursor-pointer '}
									>
										{#if data.branches.find((branch) => branch.active)}
											<div class="bg-muted flex h-8 min-w-8 items-center justify-center rounded-md">
												{#if data.branches.find((branch) => branch.active)?.logo}
													<img
														src={env.PUBLIC_CDN_URL +
															data.branches.find((branch) => branch.active)?.logo}
														alt="@shadcn"
														class="h-full w-full rounded-md"
													/>
												{:else}
													<Landmark size="20" />
												{/if}
											</div>
											<div class="flex max-w-36.25 flex-col gap-1">
												<h3 class="text-foreground truncate text-sm font-semibold">
													{data.branches.find((branch) => branch.active)?.name}
												</h3>
												<h4 class="text-muted-foreground truncate text-xs">
													{data.branches.find((branch) => branch.active)?.location}
												</h4>
											</div>
											<Sidebar.MenuBadge>
												<ChevronsUpDown size="16" />
											</Sidebar.MenuBadge>
										{:else}
											<Skeleton class="bg-muted h-8 w-8 rounded-md"></Skeleton>
											<div class="flex max-w-36.25 flex-col gap-1">
												<Skeleton class="bg-muted h-5 w-37.5"></Skeleton>
												<Skeleton class="bg-muted h-4 w-25"></Skeleton>
											</div>
										{/if}
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content
						class="w-[--bits-dropdown-menu-anchor-width] min-w-[239.2px] rounded-lg"
						align="start"
						side="bottom"
						sideOffset={4}
					>
						<DropdownMenu.Label class="text-muted-foreground flex justify-between gap-2 text-xs">
							<p>Vestigingen</p>
							<Tooltip.Provider delayDuration={0}>
								<Tooltip.Root>
									<Tooltip.Trigger class="text-muted-foreground flex items-center font-normal">
										{data.branches.length}/1
									</Tooltip.Trigger>
									<Tooltip.Content class="w-31.25">
										<p class="text-muted-foreground text-xs">Maximum aantal vestigingen</p>
									</Tooltip.Content>
								</Tooltip.Root>
							</Tooltip.Provider>
						</DropdownMenu.Label>
						{#if data.branches}
							{#each data.branches as branch, index (branch.name)}
								<DropdownMenu.Item
									onSelect={async () => {
										data.branchesState.setActiveBranch(index);
										if (branch.onboardingStep) {
											data.branchWizardState.open(false, branch.onboardingStep, branch.id);
										}
										await organization.setActive({
											organizationId: branch.id
										});
										const encodedOrgId = btoa(JSON.stringify(branch));
										document.cookie = `cache_org_active=${encodedOrgId}; path=/;`;
									}}
									class="gap-2 p-2"
								>
									<div class="grid w-full grid-cols-[auto_1fr_auto] items-center gap-2">
										<div class="flex size-6 items-center justify-center rounded-sm border">
											{#if branch.logo}
												<img
													src={env.PUBLIC_CDN_URL + branch.logo}
													alt="@shadcn"
													class="h-full w-full rounded-md"
												/>
											{:else}
												<Landmark size="20" />
											{/if}
										</div>
										{branch.name}
										{#if branch.active}
											<Check class="text-primary-500" />
										{/if}
									</div>
								</DropdownMenu.Item>
							{/each}
						{/if}
						<DropdownMenu.Separator />
						<DropdownMenu.Item
							class="gap-2 p-2"
							onclick={() => {
								data.branchWizardState.open(false);
							}}
						>
							<div class=" flex size-6 items-center justify-center rounded-md border">
								<Plus class="size-4" />
							</div>
							<div class="text-muted-foreground font-medium">Maak een vestiging</div>
						</DropdownMenu.Item>
						<DropdownMenu.Item
							onclick={() => {
								goto('/settings/branch');
							}}
							onmouseenter={() => {
								preloadData('/settings/branch');
							}}
							class="gap-2 p-2"
						>
							<div class=" flex size-6 items-center justify-center">
								<Settings class="size-4" />
							</div>
							<div class="text-muted-foreground font-medium">Vestiging instellingen</div>
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{/if}
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content class="h-full">
		<Sidebar.Group class="h-full">
			<Sidebar.GroupContent class="h-full">
				<div class="grid h-full grid-rows-[1fr_auto]">
					{#each Object.entries(items[page.url.pathname.split('/')[1] as keyof typeof items] || items.default) as [key, value]}
						{#if Array.isArray(value)}
							<Sidebar.Menu>
								<!-- {#each (items[page.url.pathname.split('/')[1] as keyof typeof items] || items.default)[key] as item} -->
								{#each value as item}
									<Sidebar.MenuItem
										class={(() => {
											const current = page.url.pathname;
											// Find the length of the matching prefix between current and item.url
											const matchLength = (a: string, b: string) => {
												let i = 0;
												while (i < a.length && i < b.length && a[i] === b[i]) i++;
												return i;
											};
											// Get all menu items for this group
											const groupItems = value;
											// Find the item with the longest matching prefix
											let bestMatch = groupItems.reduce(
												(acc, cur) => {
													const len = matchLength(current, cur.url);
													return len > acc.len ? { len, url: cur.url } : acc;
												},
												{ len: 0, url: '' }
											);
											const isBest =
												item.url === bestMatch.url &&
												bestMatch.len > 0 &&
												current.includes(item.url);
											return isBest
												? 'bg-secondary outline-border rounded-md outline-1'
												: '' + key === 'bottom'
													? `flex h-full flex-col items-end`
													: '';
										})()}
									>
										<Sidebar.MenuButton>
											{#snippet child({ props })}
												<Tooltip.Provider delayDuration={0} disabled={sidebar.open}>
													<Tooltip.Root>
														<Tooltip.Trigger class="w-full">
															<a href={item.url} {...props} class={'w-full ' + props.class}>
																<item.icon />
																<span>{t.pages[item.id as keyof typeof t.pages] || item.id} </span>
															</a>
														</Tooltip.Trigger>
														<Tooltip.Content side="right">
															<p>{t.pages[item.id as keyof typeof t.pages] || item.id}</p>
														</Tooltip.Content>
													</Tooltip.Root>
												</Tooltip.Provider>
											{/snippet}
										</Sidebar.MenuButton>
									</Sidebar.MenuItem>
								{/each}
							</Sidebar.Menu>
						{:else}
							<div>
								{#each Object.entries(value) as [key, innerValue]}
									<Sidebar.Menu>
										<Collapsible.Root open class="group/collapsible">
											<Sidebar.MenuItem>
												<Collapsible.Trigger>
													{#snippet child({ props })}
														<Tooltip.Provider delayDuration={0} disabled={sidebar.open}>
															<Tooltip.Root>
																<Tooltip.Trigger class="flex w-full items-center justify-between">
																	<Sidebar.MenuButton
																		{...props}
																		class={cn(props?.class || '', 'flex justify-between')}
																	>
																		<span>{t.pages[key as keyof typeof t.pages] || key}</span>
																		<Minus size="16" />
																	</Sidebar.MenuButton>
																</Tooltip.Trigger>
																<Tooltip.Content side="right">
																	<p>{t.pages[key as keyof typeof t.pages] || key}</p>
																</Tooltip.Content>
															</Tooltip.Root>
														</Tooltip.Provider>
													{/snippet}
												</Collapsible.Trigger>
												<Collapsible.Content>
													<Sidebar.MenuSub>
														{#each innerValue as any[] as item}
															<Sidebar.MenuItem
																class={page.url.pathname == item.url
																	? 'bg-secondary outline-border rounded-md outline-1'
																	: ''}
															>
																<Sidebar.MenuButton>
																	{#snippet child({ props })}
																		<Tooltip.Provider delayDuration={0} disabled={sidebar.open}>
																			<Tooltip.Root>
																				<Tooltip.Trigger class="w-full">
																					<a
																						href={item.url}
																						{...props}
																						class={'w-full ' + props.class}
																					>
																						<item.icon />
																						<span
																							>{t.pages[item.id as keyof typeof t.pages] || item.id}
																						</span>
																					</a>
																				</Tooltip.Trigger>
																				<Tooltip.Content side="right">
																					<p>
																						{t.pages[item.id as keyof typeof t.pages] || item.id}
																					</p>
																				</Tooltip.Content>
																			</Tooltip.Root>
																		</Tooltip.Provider>
																	{/snippet}
																</Sidebar.MenuButton>
															</Sidebar.MenuItem>
														{/each}
													</Sidebar.MenuSub>
												</Collapsible.Content>
											</Sidebar.MenuItem>
										</Collapsible.Root>
									</Sidebar.Menu>
								{/each}
							</div>
						{/if}
					{/each}
				</div>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>
	<Sidebar.Footer>
		<Sidebar.Menu>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					<Sidebar.MenuItem>
						<Sidebar.MenuButton>
							{#snippet child({ props })}
								<a
									{...props}
									class={(open
										? (props.class as String)
										: (typeof props.class === 'string' ? props.class.replace('!p-2', '') : '') +
											' !p-0') + ' !h-12 cursor-pointer'}
								>
									<Avatar.Root class="h-8 w-8 rounded-md">
										<Avatar.Image
											src={env.PUBLIC_CDN_URL + data.session?.user?.image}
											alt="@shadcn"
										/>

										<Avatar.Fallback>
											<img src="/images/placeholder-small.svg" alt="" />
										</Avatar.Fallback>
									</Avatar.Root>
									<div class="flex max-w-36.25 flex-col gap-1">
										<h3 class="text-foreground truncate text-sm font-semibold">
											{data.session?.user?.name}
										</h3>
										<h4 class="text-muted-foreground truncate text-xs">
											{data.session?.user?.email}
										</h4>
									</div>
									<Sidebar.MenuBadge>
										<ChevronsUpDown size="16" />
									</Sidebar.MenuBadge>
								</a>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				</DropdownMenu.Trigger>

				<DropdownMenu.Content
					class="w-[--bits-dropdown-menu-anchor-width] min-w-[239.2px] rounded-lg"
					side={sidebar.isMobile ? 'bottom' : 'right'}
					align="end"
					sideOffset={4}
				>
					<DropdownMenu.Label class="p-0 font-normal">
						<div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
							<Avatar.Root class="h-8 w-8 rounded-md">
								<Avatar.Image src={env.PUBLIC_CDN_URL + data.session?.user?.image} alt="@shadcn" />
								<Avatar.Fallback>CN</Avatar.Fallback>
							</Avatar.Root>
							<div class="grid flex-1 text-left text-sm leading-tight">
								<span class="truncate font-semibold">{data.session?.user?.name}</span>
								<span class="truncate text-xs">{data.session?.user?.email}</span>
							</div>
						</div>
					</DropdownMenu.Label>
					<DropdownMenu.Separator />
					<DropdownMenu.Group>
						<DropdownMenu.Item
							onclick={() => {
								// accountSettings = true;
								goto('/settings/profile');
							}}
						>
							<Settings />
							Account instellingen
						</DropdownMenu.Item>
					</DropdownMenu.Group>

					<DropdownMenu.Separator />
					<DropdownMenu.Item
						onclick={async () => {
							await signOut({
								fetchOptions: {
									onSuccess: () => {
										goto('/login');
									}
								}
							});
						}}
					>
						<LogOut />
						Log out
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</Sidebar.Menu>
	</Sidebar.Footer>
</Sidebar.Root>
