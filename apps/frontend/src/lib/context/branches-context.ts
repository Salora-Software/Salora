import { createContext } from 'svelte';
import type { BranchesState } from '$lib/runes.svelte';

/**
 * Provides the shared, reactive BranchesState to the (app) tree.
 *
 * Consumers should read `branchesState.activeBranch` (or `activeBranchId`)
 * inside `$derived(...)` so switching branches updates their queries/data
 * automatically.
 */
export const [getBranchesContext, setBranchesContext] = createContext<BranchesState>();
