<script>
	import Employees from '$lib/components/Employees.svelte';

	let newEmployee = $state({
		name: '',
		email: '',
		role: 'employee'
	});

	let employees = $state([
		{
			id: '8b5ZvpEghfplyuqVHiGZT0s4iIp2Ybbq',
			role: 'owner',
			invitationStatus: 'ACTIVE',
			services: [],
			user: {
				id: '07IoNrcccrSmk0cnK67Ro0wuaECHivqv',
				email: 'youri@salora.app',
				emailVerified: false,
				name: 'Youri Oldenzeel',
				createdAt: '2026-07-22T15:44:20.000Z',
				updatedAt: '2026-07-22T15:44:20.000Z',
				image: null,
				phone: null
			},
			availability: []
		}
	]);
</script>

<div>
	<Employees variant="small" {employees} />
</div>
