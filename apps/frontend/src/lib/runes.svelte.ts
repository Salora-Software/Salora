import { organization } from './auth-client';
import { trpc, type RouterOutput } from './trpc';
import { orpc } from './orpc';

export type SessionUserType = {
	user: {
		id: string;
		email: string;
		emailVerified: boolean;
		name: string;
		createdAt: Date;
		updatedAt: Date;
		image?: string | null | undefined;
	};
	session: {
		id: string;
		createdAt: Date;
		updatedAt: Date;
		userId: string;
		expiresAt: Date;
		token: string;
		ipAddress?: string | null | undefined | undefined;
		userAgent?: string | null | undefined | undefined;
		activeOrganizationId?: string | null | undefined;
	};
};
export type BranchesType = RouterOutput['v1']['authenticated']['organization']['getBranches'];
export type BranchType = BranchesType[number] | undefined;

export class SessionUserState {
	value: SessionUserType = $state(<SessionUserType>{});
	constructor(initialValue: SessionUserType = {} as SessionUserType) {
		this.value = initialValue;
	}
}

export class BranchesState {
	value: { branches: BranchesType } = $state(<{ branches: BranchesType }>{ branches: [] });
	private onChangeCallbacks: Array<(branch: BranchType) => void> = [];
	resetOnChangeCallbacks() {
		this.onChangeCallbacks = [];
	}
	constructor(initialValue: BranchesType = []) {
		this.value = { branches: initialValue };
	}
	_lastUpdatedBranches: Date = new Date();
	_lastUpdatedOpeningTimes: Date = new Date();

	/** Reactive list of branches (reads the $state proxy). */
	get branches(): BranchesType {
		return this.value.branches;
	}

	/** Reactive active branch. */
	get activeBranch(): BranchType {
		return this.value.branches.find((branch) => branch.active);
	}

	/** Reactive active branch id. */
	get activeBranchId(): string | undefined {
		return this.activeBranch?.id;
	}

	getActiveBranch(): BranchType {
		return this.value.branches.find((branch) => branch.active);
	}
	setActiveBranch(index: number) {
		this.value.branches.forEach((branch, i) => {
			branch.active = i === index;
		});
		const activeBranch = this.value.branches.find((b) => b.active);
		this.onChangeCallbacks.forEach((cb) => cb(activeBranch));
		return activeBranch;
	}
	async setActiveBranchById(id: string) {
		//update the branches array as its now based on real data
		const branches = await this.updateBranches(true);
		// get index of branch with id
		const index = branches.findIndex((b) => b.id === id);
		this.setActiveBranch(index);
		return this.getActiveBranch();
	}

	/**
	 * Single entry point for switching branches.
	 *
	 * Updates the reactive local state immediately, then persists the active
	 * organization server-side. Everything that reads `branchesState.activeBranch`
	 * (or `activeBranchId`) updates automatically.
	 */
	async switchTo(branchId: string) {
		const index = this.value.branches.findIndex((branch) => branch.id === branchId);
		if (index === -1) return this.getActiveBranch();

		const branch = this.setActiveBranch(index);
		await organization.setActive({ organizationId: branchId });

		if (typeof document !== 'undefined') {
			// Store only the id (branch objects can exceed the cookie size limit).
			document.cookie = `cache_org_active=${encodeURIComponent(branchId)}; path=/;`;
		}

		return branch;
	}
	updateActiveBranch(branch: BranchType) {
		this.onChangeCallbacks.forEach((cb) => cb(branch));
	}
	onBranchChange(onChange: (branch: BranchType) => void) {
		this.onChangeCallbacks.push(onChange);
		return this.value.branches;
	}
	async testCreateBranch() {
		this.updateBranches(true);
	}
	async updateBranches(force: boolean = false) {
		if (!force && new Date().getTime() - this._lastUpdatedBranches.getTime() < 500) {
			return this.value.branches;
		}
		const branches = await trpc.v1.authenticated.organization.getBranches.query({});
		// check if session has active organization
		const activeBranch = this.getActiveBranch();
		if (!activeBranch) {
			await organization.setActive({ organizationId: branches[0].id });
		}
		const prefValue = $state.snapshot(this.value.branches);
		//pop out every branch
		for (let i = 0; i < prefValue.length; i++) {
			this.value.branches.pop();
		}
		for (let i = 0; i < branches.length; i++) {
			this.value.branches[i] = {
				...branches[i],
				active: prefValue[i]?.active || false
			};
		}
		this._lastUpdatedBranches = new Date();
		this.onChangeCallbacks.forEach((cb) => cb(this.getActiveBranch()));
		return this.value.branches;
	}
	async updateOpeningTimes() {
		if (new Date().getTime() - this._lastUpdatedOpeningTimes.getTime() < 2000) {
			return;
		}

		const activeBranch = this.getActiveBranch();
		const openingTimes = await orpc.v1.schedule.getOpeningTimes({
			organizationId: activeBranch?.id || '',
			timezone: activeBranch?.timeZone || ''
		});
		const prefValue = this.value.branches;
		for (let i = 0; i < prefValue.length; i++) {
			if (prefValue[i].id === activeBranch?.id) {
				prefValue[i].openingTimes = openingTimes.map((time) => ({
					...time
				}));
			}
		}
		this._lastUpdatedOpeningTimes = new Date();
		this.onChangeCallbacks.forEach((cb) => cb(this.getActiveBranch()));
	}
	setBranches(branches: BranchesType, activeBranchId?: string) {
		const activeBranch = this.getActiveBranch();
		const newBranches = branches.map((branch) => {
			if (activeBranchId) {
				branch.active = activeBranchId === branch.id;
			} else {
				branch.active = activeBranch ? activeBranch.id === branch.id : true;
			}
			return branch;
		});
		for (let i = 0; i < newBranches.length; i++) {
			this.value.branches[i] = newBranches[i];
		}
		this._lastUpdatedBranches = new Date();
		this.onChangeCallbacks.forEach((cb) => cb(this.getActiveBranch()));
	}
}
