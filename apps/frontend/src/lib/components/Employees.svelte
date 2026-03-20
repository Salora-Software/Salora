<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { t } from '$lib/translation';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { Ellipsis, Image, Plus, Trash2, CalendarIcon } from 'lucide-svelte';
	import type { BranchesState, BranchesType, BranchType, SessionUserType } from '$lib/runes.svelte';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import * as Table from './ui/table';
	import * as Popover from './ui/popover';
	import { Calendar } from './ui/calendar';
	import { RangeCalendar } from './ui/range-calendar';
	import { DateTime } from 'luxon';
	import type { DateRange } from 'bits-ui';
	import { type DateValue, getLocalTimeZone } from '@internationalized/date';
	import { Button, buttonVariants } from './ui/button';
	import { ScrollArea } from './ui/scroll-area';
	import { Label } from './ui/label';
	import { Input } from './ui/input';
	import { Textarea } from './ui/textarea';
	import { SettingsInput } from './ui/settings-input';
	import { toast } from 'svelte-sonner';
	import { trpc, type RouterOutput } from '$lib/trpc';
	import TimeSlotScheduler from './ui/time-slot-scheduler/time-slot-scheduler.svelte';
	import { onMount, tick } from 'svelte';
	import * as Select from './ui/select';
	import * as DropdownMenu from './ui/dropdown-menu';
	import Checkbox from './ui/checkbox/checkbox.svelte';
	import { env } from '$env/dynamic/public';
	import { Separator } from './ui/separator/';
	import ComingSoon from './ComingSoon.svelte';
	import { env } from '$lib/server/env';
	import { cn } from '$lib/utils';
	let {
		employees,
		data,
		variant = 'normal',
		newEmployee = $bindable(() => {})
	}: {
		employees: any[];
		data: {
			session: SessionUserType;
			branches: BranchesType;
			branchesState: BranchesState;
		};
		variant?: 'small' | 'normal';

		newEmployee?: () => void;
	} = $props();
	let pendingDeletion: string[] = $state([]);
	const colorMapping = {
		owner: '#D8CCFF',
		admin: '#BFE3FF',
		member: '#D4F2DD'
	};
	const statusColorMapping = {
		ACTIVE: '#D4F2DD',
		PENDING: '#FFE4B5',
		ACCEPTED: '#D4F2DD',
		DECLINED: '#FFB6C1'
	};
	let values = $state({
		image: '',
		name: {
			value: ''
		},
		role: {
			value: 'member',
			options: ['owner', 'admin', 'member']
		},
		save: {
			loading: false
		},
		email: {
			value: ''
		},
		assignServices: {
			value: [] as string[],
			open: false
		},
		sheet: {
			active: false,
			loading: false,
			editing: ''
		},
		sendInvitation: {
			value: false
		},
		timeOff: {
			range: {
				start: undefined,
				end: undefined
			} as DateRange,
			startTime: '09:00',
			endTime: '17:00',
			reason: '',
			loading: false,
			popoverOpen: false,
			items: [] as any[]
		}
	});
	let sliderContent: {
		active?: string;
		items: {
			label: string;
		}[];
	} = $state({
		active: 'Details',
		items: [
			{
				label: 'Details'
			},
			{
				label: 'Werktijden'
			},
			{
				label: 'Verlof'
			}
		]
	});
	let activeBranch: BranchType | null = null;
	newEmployee = () => {
		values.sheet.active = true;
		values.sheet.editing = '';
		values.name.value = '';
		values.email.value = '';
		values.role.value = 'member';
		values.sendInvitation.value = false;
	};
	let businessHours: {
		id: string;
		day: number;
		openHour: string;
		openMinute: string;
		closeHour: string;
		closeMinute: string;
	}[] = $state([]);
	let employeeAvailability: {
		id?: string;
		day: number;
		openHour: string;
		openMinute: string;
		closeHour: string;
		closeMinute: string;
	}[] = $state([
		{
			day: 1,
			openHour: '',
			openMinute: '',
			closeHour: '',
			closeMinute: ''
		}
	]);
	onMount(async () => {
		activeBranch = data.branchesState.getActiveBranch();
		if (activeBranch)
			businessHours = activeBranch.openingTimes.map((slot) => {
				const [openHour, openMinute] = slot.startTimeLocal.split(':');
				const [closeHour, closeMinute] = slot.endTimeLocal.split(':');
				return {
					id: slot.id,
					day: slot.dayOfWeek,
					openHour,
					openMinute,
					closeHour,
					closeMinute
				};
			});
	});

	function editEmployee(employee: BranchesType[number]['members'][number]) {
		values.sheet.active = true;
		values.sheet.editing = employee.id;
		values.name.value = employee.user.name;
		values.email.value = employee.user.email;
		values.role.value = employee.role;
		values.assignServices.value = employee.services || [];
		values.image = env.PUBLIC_CDN_URL + employee.user.image;
		employeeAvailability = (employee.availability || []).map(
			(time: { id: string; startTimeLocal: string; endTimeLocal: string; dayOfWeek: number }) => {
				const [openHour, openMinute] = time.startTimeLocal.split(':');
				const [closeHour, closeMinute] = time.endTimeLocal.split(':');
				return {
					id: time.id,
					day: time.dayOfWeek,
					openHour,
					openMinute,
					closeHour,
					closeMinute
				};
			}
		);
		//if employee.availability is empty, add a default slot
		if (employeeAvailability.length === 0) {
			employeeAvailability = [
				{
					day: 1,
					openHour: '',
					openMinute: '',
					closeHour: '',
					closeMinute: ''
				}
			];
		}
	}

	async function fetchTimeOff() {
		if (!values.sheet.editing || !activeBranch) return;
		try {
			values.timeOff.items = await trpc.v2.authenticated.employee.getTimeOffs.query({
				organizationId: activeBranch.id,
				memberId: values.sheet.editing
			});
		} catch (error) {
			toast.error('Fout bij ophalen verlof');
		}
	}

	async function addTimeOff() {
		if (!values.sheet.editing || !activeBranch || !values.timeOff.range.start) {
			toast.error('Selecteer een datum');
			return;
		}
		values.timeOff.loading = true;
		try {
			const startDate = values.timeOff.range.start.toDate(getLocalTimeZone());
			const endDate = values.timeOff.range.end
				? values.timeOff.range.end.toDate(getLocalTimeZone())
				: startDate;

			const [sH, sM] = values.timeOff.startTime.split(':').map(Number);
			const [eH, eM] = values.timeOff.endTime.split(':').map(Number);

			const start = DateTime.fromJSDate(startDate).set({ hour: sH, minute: sM }).toJSDate();
			const end = DateTime.fromJSDate(endDate).set({ hour: eH, minute: eM }).toJSDate();

			await trpc.v2.authenticated.employee.addTimeOff.mutate({
				organizationId: activeBranch.id,
				memberId: values.sheet.editing,
				startTime: start,
				endTime: end,
				reason: values.timeOff.reason,
				type: 'LEAVE'
			});

			toast.success('Verlof toegevoegd');
			values.timeOff.reason = '';
			values.timeOff.range = { start: undefined, end: undefined };
			await fetchTimeOff();
		} catch (error) {
			toast.error('Fout bij toevoegen verlof');
		} finally {
			values.timeOff.loading = false;
		}
	}

	async function removeTimeOff(id: string) {
		if (!activeBranch) return;
		try {
			await trpc.v2.authenticated.employee.removeTimeOff.mutate({
				organizationId: activeBranch.id,
				timeOffId: id
			});
			toast.success('Verlof verwijderd');
			await fetchTimeOff();
		} catch (error) {
			toast.error('Fout bij verwijderen verlof');
		}
	}

	$effect(() => {
		if (sliderContent.active === 'Verlof' && values.sheet.editing) {
			fetchTimeOff();
		}
	});

	$effect(() => {
		if (values.timeOff.range.start && values.timeOff.range.end) {
			values.timeOff.popoverOpen = false;
		}
	});

	async function saveEmployee() {
		values.save.loading = true;
		try {
			const activeBranch = data.branchesState.getActiveBranch();
			if (!activeBranch) {
				toast.error('Er is geen actieve vestiging');
				return;
			}
			const availability = employeeAvailability.filter((slot) => slot.openHour && slot.closeHour);
			if (!values.sheet.editing) {
				const user = await trpc.v1.authenticated.employees.createEmployee.mutate({
					organizationId: activeBranch.id,
					name: values.name.value,
					email: values.email.value,
					role: values.role.value,
					sendInvitation: values.sendInvitation.value
				});
				activeBranch.members.push({
					id: user.id,
					role: values.role.value,
					invitationStatus: user.invitationStatus || 'ACTIVE',
					services: [],
					user: {
						id: user.id,
						name: user.name,
						email: user.email,
						image: null,
						phone: null,
						createdAt: new Date(),
						updatedAt: new Date(),
						emailVerified: false
					},
					availability: []
				});
				toast.success(
					values.sendInvitation.value
						? 'Medewerker uitgenodigd!'
						: 'Medewerker is succesvol toegevoegd'
				);
			} else {
				const updatedEmployee = await trpc.v1.authenticated.employees.updateEmployee.mutate({
					organizationId: activeBranch.id,
					employeeId: values.sheet.editing,
					name: values.name.value,
					email: values.email.value,
					role: values.role.value,
					availability: availability.map((slot) => ({
						id: slot.id,
						dayOfWeek: slot.day,
						startTimeLocal: slot.openHour + ':' + slot.openMinute,
						endTimeLocal: slot.closeHour + ':' + slot.closeMinute
					})),
					removeItems: pendingDeletion,
					assignedServices: values.assignServices.value || []
				});
				const employee = activeBranch.members.find((member) => member.id === values.sheet.editing);
				if (employee) {
					employee.user.name = values.name.value;
					employee.user.email = values.email.value;
					employee.role = values.role.value;
				}
				// set the active branch employee to updatedEmployee so that the UI updates
				activeBranch.members = activeBranch.members.map((member) =>
					member.id === values.sheet.editing ? updatedEmployee : member
				);
				toast.success('Medewerker is succesvol bijgewerkt');
			}
			values.sheet.active = false;
		} catch {}
		values.save.loading = false;
	}
</script>

{#snippet customLabel(title: string, required: boolean, description: string | (() => string))}
	<h3 class="text-md font-semibold">
		{title}
		{#if required}
			<span class="text-red-500">*</span>
		{/if}

		{#if description && typeof description === 'function' && description()}
			<span class="mb-1 text-sm text-gray-500">({description()})</span>
		{/if}
	</h3>
{/snippet}
<div
	class={cn(
		`mt-4 grid grid-cols-1 gap-4 sm:grid-cols-1
md:grid-cols-1  `,
		variant === 'small' ? '' : 'lg:grid-cols-2 xl:grid-cols-3'
	)}
>
	{#each employees.slice().sort((a, b) => {
		const roleOrder = { owner: 0, admin: 1, member: 2 };
		const roleA = roleOrder[a.role as keyof typeof roleOrder] ?? 99;
		const roleB = roleOrder[b.role as keyof typeof roleOrder] ?? 99;
		if (roleA !== roleB) return roleA - roleB;
		// Sort by invitation status (active first, then pending, then declined)
		const statusOrder = { ACTIVE: 0, ACCEPTED: 0, PENDING: 1, DECLINED: 2 };
		const statusA = statusOrder[a.invitationStatus as keyof typeof statusOrder] ?? 99;
		const statusB = statusOrder[b.invitationStatus as keyof typeof statusOrder] ?? 99;
		if (statusA !== statusB) return statusA - statusB;
		// Compare by user creation date (oldest first)
		const dateA = new Date(a.user.createdAt).getTime();
		const dateB = new Date(b.user.createdAt).getTime();
		return dateA - dateB;
	}) as employee}
		<button class="text-left" onclick={() => editEmployee(employee)}>
			<Card.Root
				class={cn(
					'hover:bg-gray-100',
					employee.invitationStatus === 'DECLINED' || employee.invitationStatus === 'PENDING'
						? 'opacity-60'
						: ''
				)}
			>
				<Card.Content>
					<div class="mb-4 flex w-full justify-between">
						<div class="flex items-center gap-2">
							<Avatar.Root
								class={cn(
									'h-8 w-8 rounded-md',
									employee.invitationStatus === 'DECLINED' ? 'grayscale' : ''
								)}
							>
								<Avatar.Image src={env.PUBLIC_CDN_URL + employee.user.image} alt="@shadcn" />

								<Avatar.Fallback>
									<img src="/images/user.svg" alt="" />
								</Avatar.Fallback>
							</Avatar.Root>
							<Card.Title
								class={cn(
									'max-w-30 truncate text-lg',
									employee.invitationStatus === 'DECLINED' ? 'text-gray-500' : ''
								)}
							>
								{employee.user.name}
								{#if employee.invitationStatus === 'PENDING'}
									<span class="ml-1 text-sm text-orange-500">⏳</span>
								{:else if employee.invitationStatus === 'DECLINED'}
									<span class="ml-1 text-sm text-red-500">❌</span>
								{/if}
							</Card.Title>
						</div>
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								<Button variant="ghost" size="icon" class="relative size-4 p-0">
									<span class="sr-only">Open menu</span>
									<Ellipsis />
								</Button>
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="end">
								<DropdownMenu.Group>
									<DropdownMenu.GroupHeading>Acties</DropdownMenu.GroupHeading>
								</DropdownMenu.Group>
								<DropdownMenu.Item onclick={() => editEmployee(employee)}>Bewerk</DropdownMenu.Item>
								{#if employee.invitationStatus === 'PENDING'}
									<DropdownMenu.Item
										onclick={async () => {
											try {
												await trpc.v1.authenticated.employees.updateInvitationStatus.mutate({
													organizationId: activeBranch?.id || '',
													employeeId: employee.id,
													status: 'ACCEPTED'
												});
												employee.invitationStatus = 'ACCEPTED';
												toast.success('Uitnodiging geaccepteerd');
											} catch (error) {
												toast.error('Fout bij accepteren uitnodiging');
											}
										}}
									>
										Accepteer uitnodiging
									</DropdownMenu.Item>
									<DropdownMenu.Item
										onclick={async () => {
											try {
												await trpc.v1.authenticated.employees.updateInvitationStatus.mutate({
													organizationId: activeBranch?.id || '',
													employeeId: employee.id,
													status: 'DECLINED'
												});
												employee.invitationStatus = 'DECLINED';
												toast.success('Uitnodiging geweigerd');
											} catch (error) {
												toast.error('Fout bij weigeren uitnodiging');
											}
										}}
									>
										Weiger uitnodiging
									</DropdownMenu.Item>
								{:else if employee.invitationStatus === 'DECLINED'}
									<DropdownMenu.Item
										onclick={async () => {
											try {
												await trpc.v1.authenticated.employees.resendInvitation.mutate({
													organizationId: activeBranch?.id || '',
													employeeId: employee.id
												});
												employee.invitationStatus = 'PENDING';
												toast.success('Uitnodiging opnieuw verzonden');
											} catch (error) {
												toast.error('Fout bij versturen uitnodiging');
											}
										}}
									>
										Verstuur uitnodiging opnieuw
									</DropdownMenu.Item>
								{/if}
								<DropdownMenu.Item
									onclick={async () => {
										if (!activeBranch) return;
										await trpc.v1.authenticated.employees.removeEmployee.mutate({
											organizationId: activeBranch?.id || '',
											employeeId: employee.id
										});
										toast.success('Medewerker is succesvol verwijderd');
										activeBranch.members = activeBranch?.members.filter(
											(member) => member.id !== employee.id
										);
									}}
								>
									Verwijder
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</div>
					<div class="flex items-center justify-between gap-2">
						<div>
							<p
								class="text-muted-foreground text-sm"
								class:line-through={employee.role === 'declined'}
							>
								{employee.user.email}
							</p>
							<p
								class="text-muted-foreground text-sm"
								class:line-through={employee.invitationStatus === 'DECLINED'}
							>
								{employee.user.phone}
							</p>
							{#if employee.invitationStatus === 'PENDING'}
								<p class="text-xs text-orange-600 italic">Wacht op acceptatie</p>
							{:else if employee.invitationStatus === 'DECLINED'}
								<p class="text-xs text-red-600 italic">Uitnodiging geweigerd</p>
							{/if}
						</div>

						<div class="flex flex-col gap-1">
							<Badge
								class="text-gray-black h-6.25"
								style={`background-color: ${colorMapping[employee.role as keyof typeof colorMapping]}`}
							>
								{t.roles[employee.role as keyof typeof t.roles] || employee.role}
							</Badge>
							{#if employee.invitationStatus !== 'ACTIVE' && employee.invitationStatus !== 'ACCEPTED'}
								<Badge
									variant="outline"
									class="h-5 text-xs"
									style={`background-color: ${statusColorMapping[employee.invitationStatus as keyof typeof statusColorMapping]}; border-color: ${statusColorMapping[employee.invitationStatus as keyof typeof statusColorMapping]}`}
								>
									{employee.invitationStatus === 'PENDING' ? 'Uitgenodigd' : 'Geweigerd'}
								</Badge>
							{/if}
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</button>
	{/each}
</div>
<Sheet.Root bind:open={values.sheet.active}>
	<Sheet.Content side="right" class="w-full max-w-full! sm:w-162.5">
		<div>
			<Sheet.Header>
				<Sheet.Title>
					{values.sheet.editing ? 'Medewerker bijwerken' : 'Medewerker toevoegen'}
				</Sheet.Title>
				<Sheet.Description
					>Vul de gegevens in om een nieuw medewerker toe te voegen</Sheet.Description
				>
			</Sheet.Header>
			<ScrollArea class="h-[calc(100vh-56px-7rem)] max-w-full rounded-md pr-3">
				<!-- <TinySlider bind:this={slider}>
						{#snippet children({ sliderWidth })} -->
				{#each sliderContent.items as item, i}
					<button
						class="min-w-max-content relative mt-4 mr-4 cursor-pointer rounded-md"
						onclick={() => {
							// slider?.setIndex(i);
							sliderContent.active = item.label;
						}}
					>
						<h3
							class="text-md text-muted-foreground"
							class:active={item.label === sliderContent.active}
							class:text-black={item.label === sliderContent.active}
						>
							{item.label}
						</h3>
					</button>
				{/each}
				<!-- {/snippet}
					</TinySlider> -->
				<Separator class="mb-4" />
				<div class="grid gap-4 py-4">
					{#if sliderContent.active === 'Details'}
						<div class="flex w-full flex-col items-center justify-center gap-4">
							<Avatar.Root class=" h-25 w-25 rounded-md ">
								<Avatar.Image src={values.image} alt="@shadcn" />
								<Avatar.Fallback>
									<img src="/images/placeholder-small.svg" alt="" />
								</Avatar.Fallback>
							</Avatar.Root>

							<h1 class="text-lg" class:font-semibold={values.name.value}>
								{values.name.value || 'Naam van de medewerker'}
							</h1>
						</div>
						<div class="flex justify-between gap-2">
							<SettingsInput
								title="Naam"
								type="input"
								class="w-full"
								required
								bind:value={values.name.value}
							/>
							<SettingsInput
								title="E-mail"
								type="input"
								class="w-full"
								required
								bind:value={values.email.value}
							/>
						</div>
						<div class="flex items-center gap-2">
							<Checkbox id="send-invite" bind:checked={values.sendInvitation.value} />
							<Label for="send-invite">Stuur een uitnodiging naar de medewerker</Label>
						</div>
						<div>
							{@render customLabel('Rol', true, 'Selecteer de rol van de medewerker')}
							<Select.Root type="single" bind:value={values.role.value}>
								<Select.Trigger class={'w-full'}>
									<div class="flex flex-wrap gap-2">
										<h2>
											{t.roles[values.role.value as keyof typeof t.roles] || 'Selecteer een rol'}
										</h2>
									</div>
								</Select.Trigger>
								<Select.Content>
									{#each values.role.options as option}
										<Select.Item value={option}
											>{t.roles[option as keyof typeof t.roles]}</Select.Item
										>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>
						<div>
							<h3 class="text-md font-semibold">Aangewezen diensten</h3>

							<Select.Root
								type="multiple"
								bind:value={values.assignServices.value}
								bind:open={values.assignServices.open}
							>
								<Select.Trigger class="h-auto min-h-10 w-full px-3 py-1.5">
									<div class="flex flex-wrap gap-2">
										{#if values.assignServices.value && values.assignServices.value.length > 0}
											{#each values.assignServices.value as option}
												<Badge
													variant="outline"
													class="flex items-center gap-1 px-2 py-0.5 text-xs font-normal"
													onmousedown={(e) => e.stopPropagation()}
													onclick={async (e) => {
														e.stopPropagation();
														await tick();
														values.assignServices.open = false;
														values.assignServices.value = values.assignServices.value.filter(
															(s) => s !== option
														);
													}}
												>
													<Plus class="rotate-45" size="13" />
													<span class="max-w-32 truncate">
														{data.branchesState
															.getActiveBranch()
															?.services.find((s) => s.id === option)?.name}
													</span>
												</Badge>
											{/each}
										{:else}
											<span class="text-muted-foreground">Selecteer diensten...</span>
										{/if}
									</div>
								</Select.Trigger>
								<Select.Content>
									{#each data.branchesState
										.getActiveBranch()
										?.services.map( (service) => ({ label: service.name, value: service.id }) ) || [] as item}
										<Select.Item value={item.value}>{item.label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>
					{:else if sliderContent.active === 'Werktijden'}
						<TimeSlotScheduler
							bind:schedules={employeeAvailability}
							ondelete={(schedule) => {
								if (schedule.id) pendingDeletion = [...pendingDeletion, schedule.id];
							}}
						/>
					{:else if sliderContent.active === 'Verlof'}
						<div class="flex flex-col gap-6">
							<div class="space-y-4 rounded-xl border bg-gray-50/50 p-4">
								<div class="flex items-center gap-2">
									<h4 class="text-sm font-semibold tracking-wider text-gray-500 uppercase">
										Nieuw verlof toevoegen
									</h4>
								</div>
								<div class="space-y-4">
									<div class="space-y-2">
										<Label>Datum</Label>
										<Popover.Root bind:open={values.timeOff.popoverOpen}>
											<Popover.Trigger
												class={cn(
													buttonVariants({
														variant: 'outline',
														size: 'sm'
													}),
													'h-10 w-full justify-start text-left font-normal',
													!values.timeOff.range.start && 'text-muted-foreground'
												)}
											>
												<CalendarIcon class="mr-2 h-4 w-4" />
												{#if values.timeOff.range.start}
													{#if values.timeOff.range.end}
														{values.timeOff.range.start.toString()} - {values.timeOff.range.end.toString()}
													{:else}
														{values.timeOff.range.start.toString()}
													{/if}
												{:else}
													<span>Selecteer datum(s)</span>
												{/if}
											</Popover.Trigger>
											<Popover.Content class="w-auto p-0" align="start">
												<RangeCalendar bind:value={values.timeOff.range} />
											</Popover.Content>
										</Popover.Root>
									</div>

									<div class="space-y-2">
										<Label>Tijd</Label>
										<div class="grid h-10 grid-cols-[1fr_auto_1fr] place-items-center gap-2">
											<Input
												type="time"
												bind:value={values.timeOff.startTime}
												class="h-10 w-full justify-start px-3 text-left font-normal"
												placeholder="Start"
											/>
											<span class="text-muted-foreground">–</span>
											<Input
												type="time"
												bind:value={values.timeOff.endTime}
												class="h-10 w-full justify-start px-3 text-left font-normal"
												placeholder="Eind"
											/>
										</div>
									</div>
								</div>
								<div class="space-y-2">
									<Label for="verlof-reden">Reden</Label>
									<Textarea
										id="verlof-reden"
										bind:value={values.timeOff.reason}
										placeholder="Bijv. Vakantie, Doktersbezoek, Persoonlijke omstandigheden..."
										rows={3}
									/>
								</div>
								<Button class="w-full" onclick={addTimeOff} disabled={values.timeOff.loading}>
									<Plus class="mr-2" size={16} />
									Verlof toevoegen
								</Button>
							</div>

							<div class="space-y-4">
								<div class="flex items-center justify-between">
									<h4 class="text-sm font-semibold tracking-wider text-gray-500 uppercase">
										Geregistreerd verlof
									</h4>
								</div>

								<div class="overflow-hidden rounded-xl">
									<Table.Root>
										<Table.Header>
											<Table.Row>
												<Table.Head>Datum</Table.Head>
												<Table.Head>Reden</Table.Head>
												<Table.Head class="w-12.5 text-right"></Table.Head>
											</Table.Row>
										</Table.Header>
										<Table.Body>
											{#each values.timeOff.items as item}
												<Table.Row>
													<Table.Cell>
														<div class="flex flex-col">
															<span class="font-medium text-black">
																{#if DateTime.fromJSDate(item.calendarItem.startTime).hasSame(DateTime.fromJSDate(item.calendarItem.endTime), 'day')}
																	{DateTime.fromJSDate(item.calendarItem.startTime).toLocaleString(
																		DateTime.DATE_MED
																	)}
																	<span class="text-muted-foreground ml-1 text-xs font-normal">
																		({DateTime.fromJSDate(item.calendarItem.startTime).toFormat(
																			'HH:mm'
																		)} - {DateTime.fromJSDate(item.calendarItem.endTime).toFormat(
																			'HH:mm'
																		)})
																	</span>
																{:else}
																	{DateTime.fromJSDate(item.calendarItem.startTime).toFormat(
																		'dd MMM'
																	)}
																	<span class="text-muted-foreground mx-1 text-xs font-normal">
																		({DateTime.fromJSDate(item.calendarItem.startTime).toFormat(
																			'HH:mm'
																		)})
																	</span>
																	-
																	{DateTime.fromJSDate(item.calendarItem.endTime).toFormat(
																		'dd MMM'
																	)}
																	<span class="text-muted-foreground ml-1 text-xs font-normal">
																		({DateTime.fromJSDate(item.calendarItem.endTime).toFormat(
																			'HH:mm'
																		)})
																	</span>
																{/if}
															</span>
															<span class="text-muted-foreground text-xs font-normal">
																{DateTime.fromJSDate(item.calendarItem.startTime).toFormat('yyyy')}
															</span>
														</div>
													</Table.Cell>
													<Table.Cell>{item.reason || 'Geen reden'}</Table.Cell>
													<Table.Cell class="text-right">
														<Button
															variant="ghost"
															size="icon"
															onclick={() => removeTimeOff(item.id)}
															class="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700"
														>
															<Trash2 size={16} />
														</Button>
													</Table.Cell>
												</Table.Row>
											{:else}
												<Table.Row>
													<Table.Cell colspan={3} class="text-muted-foreground py-8 text-center">
														Geen verlof geregistreerd
													</Table.Cell>
												</Table.Row>
											{/each}
										</Table.Body>
									</Table.Root>
								</div>
							</div>
						</div>
					{:else}
						<ComingSoon />
					{/if}
				</div>
			</ScrollArea>
		</div>
		<Sheet.Footer>
			<Button class={buttonVariants({})} disabled={values.save.loading} onclick={saveEmployee}>
				{values.sheet.editing ? 'Bijwerken' : 'Toevoegen'}
			</Button>
		</Sheet.Footer>
	</Sheet.Content>
</Sheet.Root>

<style>
	.active {
		color: black;
	}
	.active::before {
		content: '';
		position: absolute;
		left: 0;
		bottom: 0;
		width: 100%;
		height: 1px;
		background-color: rgb(var(--secondary));
	}
</style>
