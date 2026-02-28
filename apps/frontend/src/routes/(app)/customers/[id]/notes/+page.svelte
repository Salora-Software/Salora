<script lang="ts">
	import * as Card from '$lib/components/ui/card/';
	import Button from '$lib/components/ui/button/button.svelte';
	import { fly, scale, slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { Clock, Plus, Check, Calendar, Trash2, FileText, Search } from 'lucide-svelte';
	import { page } from '$app/state';
	import { trpc, trpcQuery } from '$lib/trpc';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { onMount } from 'svelte';
	import { DateTime } from 'luxon';

	let { data } = $props();

	let activeBranch = $state(data.branchesState.getActiveBranch());
	const customerId = $derived(page.params.id);

	data.branchesState.onBranchChange((branch) => {
		activeBranch = branch;
	});

	let pageSize: number = $state(20);
	let currentPage: number = $state(0);
	let searchQuery: string = $state('');
	let searchInputValue: string = $state('');
	let searchPollInterval: ReturnType<typeof setInterval> | null = null;
	let lastSearchInputValue: string = '';

	let newNote = $state('');
	let showForm = $state(false);
	let inputCardRef = $state<HTMLDivElement>();

	// TRPC queries
	let notesQuery = $derived(
		trpcQuery.v1.authenticated.customers.getCustomerNotes.createQuery(
			{
				customerId: customerId!,
				organizationId: activeBranch?.id || data.session.session.activeOrganizationId!,
				skip: currentPage * pageSize,
				take: pageSize,
				search: searchQuery.trim() || undefined
			},
			{
				queryKey: ['customerNotes', customerId, currentPage, pageSize, searchQuery],
				enabled: !!customerId && !!(activeBranch?.id || data.session.session.activeOrganizationId)
			}
		)
	);

	let notes = $derived(notesQuery.data?.notes || []);
	let totalCount = $derived(notesQuery.data?.totalCount || 0);

	// Search polling
	onMount(() => {
		searchPollInterval = setInterval(() => {
			if (searchInputValue !== lastSearchInputValue) {
				lastSearchInputValue = searchInputValue;
				searchQuery = searchInputValue;
				currentPage = 0;
			}
		}, 350);
		return () => {
			if (searchPollInterval) clearInterval(searchPollInterval);
		};
	});

	async function addNote(e: Event) {
		e.preventDefault();
		if (
			newNote.trim().length > 0 &&
			customerId &&
			(activeBranch?.id || data.session.session.activeOrganizationId)
		) {
			try {
				await trpc.v1.authenticated.customers.createCustomerNote.mutate({
					customerId,
					organizationId: activeBranch?.id || data.session.session.activeOrganizationId!,
					content: newNote.trim()
				});

				// Invalidate and refetch notes
				await notesQuery.refetch();

				newNote = '';
				showForm = false;
			} catch (error) {
				console.error('Error creating note:', error);
			}
		}
	}

	async function deleteNote(noteId: string) {
		if (!customerId || !(activeBranch?.id || data.session.session.activeOrganizationId)) return;

		try {
			await trpc.v1.authenticated.customers.deleteCustomerNote.mutate({
				noteId,
				customerId,
				organizationId: activeBranch?.id || data.session.session.activeOrganizationId!
			});

			// Invalidate and refetch notes
			await notesQuery.refetch();
		} catch (error) {
			console.error('Error deleting note:', error);
		}
	}

	function toggleForm() {
		showForm = !showForm;
		if (showForm) {
			setTimeout(() => {
				document.getElementById('note-textarea')?.focus();
			}, 100);
		} else {
			// Reset form when closing
			newNote = '';
		}
	}

	function openFormAndFocus() {
		showForm = true;
		setTimeout(() => {
			document.getElementById('note-textarea')?.focus();
		}, 100);
	}

	function formatDate(dateStr: string) {
		return DateTime.fromISO(dateStr).toLocaleString({
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
	<div class=" flex items-center gap-2">
		<div class="text-3xl font-semibold">Notities</div>
		{#if notesQuery.isLoading}
			<Skeleton class="h-5 w-8 rounded-full" />
		{:else}
			<span class="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium"
				>{totalCount}</span
			>
		{/if}
	</div>
	<div class="flex flex-wrap items-center justify-between gap-4 sm:justify-end">
		{#if notesQuery.isLoading}
			<Skeleton class="h-4 w-32" />
		{:else}
			<span class="text-muted-foreground text-xs"
				>Laatste activiteit: {notes.length > 0
					? formatDate(notes[0].createdAt.toISOString())
					: '—'}</span
			>
		{/if}
		<Button
			variant="outline"
			size="sm"
			class="hover:bg-accent hover:text-accent-foreground gap-1 "
			onclick={openFormAndFocus}
		>
			<Plus class="h-4 w-4" />
			Notitie toevoegen
		</Button>
	</div>
</div>
<!-- Search Bar -->
<div class="my-6 mt-0">
	<div class="relative">
		<Search class="text-muted-foreground absolute left-3  h-4 w-4 -translate-y-[-75%]" />
	</div>

	<Input placeholder="Zoek in notities..." bind:value={searchInputValue} class="pl-9" />
</div>

<!-- New Note Form Card -->
<div class="space-y-3">
	{#if showForm}
		<div transition:slide={{ duration: 200 }} class="">
			<div
				class="border-primary/20 bg-accent/50 rounded-lg border px-4 py-6 shadow-sm"
				bind:this={inputCardRef}
			>
				<form class="flex flex-col gap-3" onsubmit={addNote}>
					<div>
						<textarea
							id="note-textarea"
							class="border-input bg-background focus:border-primary focus:ring-primary min-h-20 w-full resize-none rounded border p-3 text-sm shadow-sm focus:ring-1 focus:outline-none"
							placeholder="Voeg een nieuwe notitie toe..."
							bind:value={newNote}
							maxlength={500}
							rows={3}
						></textarea>
						<div
							class="text-muted-foreground mt-1 grid grid-cols-[1fr_auto_auto] items-end gap-4 text-xs"
						>
							<span>{newNote.length}/500 karakters</span>
							<span class="text-red-500"
								>{newNote.trim().length === 0 ? 'Notitie kan niet leeg zijn' : ' '}</span
							>

							<div class="flex gap-2">
								<Button
									type="button"
									variant="outline"
									size="sm"
									onclick={toggleForm}
									class="border-border hover:bg-secondary"
								>
									Annuleren
								</Button>
								<Button
									type="submit"
									size="sm"
									class="bg-primary text-primary-foreground hover:bg-primary/90 gap-1 px-4"
									disabled={newNote.trim().length === 0}
								>
									<Check class="h-4 w-4" />
									Opslaan
								</Button>
							</div>
						</div>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>

<!-- Notes List -->
<div class="mt-6 space-y-3">
	{#if notesQuery.isLoading}
		<!-- Loading skeletons -->
		{#each Array(3) as _}
			<div class="border-border bg-card rounded-lg border p-4 shadow-sm">
				<div class="flex justify-between">
					<div class="mb-2 flex items-center gap-2">
						<Skeleton class="h-7 w-7 rounded-full" />
						<div>
							<Skeleton class="h-4 w-24" />
							<Skeleton class="mt-1 h-3 w-16" />
						</div>
					</div>
					<Skeleton class="h-5 w-5" />
				</div>
				<Skeleton class="h-12 w-full" />
			</div>
		{/each}
	{:else if notes.length === 0}
		<div
			class="bg-muted text-muted-foreground border-border rounded-lg border border-dashed p-6 text-center"
		>
			<FileText class="text-muted-foreground/70 mx-auto mb-2 h-10 w-10" />
			<p>
				{searchQuery ? `Geen notities gevonden voor "${searchQuery}".` : 'Geen notities gevonden.'}
			</p>
			{#if !searchQuery}
				<Button
					variant="outline"
					size="sm"
					class="hover:bg-accent hover:text-accent-foreground mt-3"
					onclick={openFormAndFocus}
				>
					Eerste notitie toevoegen
				</Button>
			{/if}
		</div>
	{:else}
		{#each notes as note (note.id)}
			<div
				transition:scale={{ duration: 200, start: 0.96 }}
				class="border-border bg-card hover:border-primary/30 group relative rounded-lg border p-4 shadow-sm transition-all hover:shadow-md"
			>
				<div class="flex justify-between">
					<div class="mb-2 flex items-center gap-2">
						<div
							class="bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-full"
						>
							{note.author.name.charAt(0).toUpperCase()}
						</div>
						<div>
							<div class="text-card-foreground text-sm font-medium">{note.author.name}</div>
							<div class="text-muted-foreground flex items-center gap-1 text-xs">
								<Calendar class="h-3 w-3" />
								{formatDate(note.createdAt.toISOString())}
							</div>
						</div>
					</div>
					<button
						class="m-0 h-max cursor-pointer p-0 opacity-0 transition-opacity group-hover:opacity-100"
						title="Verwijder notitie"
						aria-label="Verwijder notitie"
						onclick={() => deleteNote(note.id)}
					>
						<Trash2 class="text-destructive hover:text-destructive/80 h-5 w-5" />
					</button>
				</div>
				<p class="text-card-foreground text-sm whitespace-pre-wrap">{note.content}</p>
			</div>
		{/each}

		<!-- Load more button if there are more notes -->
		{#if totalCount > notes.length}
			<div class="flex justify-center pt-4">
				<Button
					variant="outline"
					onclick={() => {
						currentPage += 1;
					}}
					disabled={notesQuery.isFetching}
				>
					{notesQuery.isFetching ? 'Laden...' : 'Meer laden'}
				</Button>
			</div>
		{/if}
	{/if}
</div>
