export const AppointmentEmailSchema = {
	companyName: {
		type: 'text',
		label: 'Bedrijfsnaam',
		defaultValue: 'Salora Beauty'
	},
	heading: {
		type: 'text',
		label: 'Titel',
		defaultValue: 'Afspraak Bevestigd'
	},
	// 2. Dit vertelt Svelte: "Maak jouw slimme editor"
	content: {
		type: 'editor', // Jouw custom editor component
		label: 'Bericht',
		defaultValue: 'Beste {{ naam }},\n\nBedankt voor de boeking!'
	},
	buttonText: {
		type: 'text',
		label: 'Knop Tekst',
		defaultValue: 'Bekijk Afspraak'
	}
} as const;

export type AppointmentEmailVariables = {
	[K in keyof typeof AppointmentEmailSchema]: string;
};
