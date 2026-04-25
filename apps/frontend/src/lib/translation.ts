export const translations = {
	nl: {
		appointments: {
			no_upcoming: 'Geen aankomende afspraken.',
			no_finished: 'Geen voltooide afspraken.',
			no_canceled: 'Geen geannuleerde afspraken.',
			book_again: 'Opnieuw boeken',
			leave_review: 'Laat review achter',
			my_appointment: 'Mijn afspraken',
			upcoming: 'Aankomend',
			completed: 'Voltooid',
			canceled: 'Geannuleerd',
			cancel: 'Annuleren',
			call: 'Bellen',
			cancel_title: 'Weet je zeker dat je deze afspraak wilt annuleren?',
			cancel_desc:
				'Deze actie kan niet ongedaan worden gemaakt. Je afspraak bij {company} voor {service} met {staff} op {date} om {time} wordt geannuleerd.',
			cancel_confirm: 'Ja, annuleer afspraak',
			cancel_dismiss: 'Nee, terug',
			cancel_success: 'Afspraak succesvol geannuleerd.',
			cancel_error: 'Kon afspraak niet annuleren.'
		},
		general: {
			coming_soon: 'Binnenkort beschikbaar'
		},
		database: {
			enums: {
				bookingStatus: {
					CONFIRMED: '✅ Bevestigd',
					COMPLETED: '☑️ Voltooid',
					CANCELLED: '❌ Geannuleerd',
					PENDING: '⏳ In afwachting'
				},
				calendarItemType: {
					BOOKING: 'Boeking',
					REMINDER: 'Herinnering'
				}
			}
		},
		login: {
			login: 'Inloggen',
			loginDescription: 'Vul je e-email hieronder om in te ',
			signUp: 'Aanmelden',
			signUpDescription: 'Vul je naam hieronder in om een nieuw account aan te maken',
			name: 'Naam',
			email: 'E-email',
			password: 'Wachtwoord',
			forgotPassword: 'Wachtwoord vergeten?',
			noAccount: 'Nog geen account?',
			noAccountDescription: 'Maak een account aan',
			haveAccount: 'Heb je al een account?',
			haveAccountDescription: 'Log in',
			register: 'Registreren'
		},
		pages: {
			overview: 'Overzicht',
			bookings: 'Boekingen',
			notes: 'Notities',
			dashboard: 'Dashboard',
			calendar: 'Kalender',
			products: 'Producten',
			customers: 'Klanten',
			settings: 'Instellingen',
			general: 'Algemeen',
			employees: 'Medewerkers',
			notifications: 'Notificaties',
			'business-hours': 'Openingstijden',
			branch: 'Vestiging',
			profile: 'Profiel',
			'my-account': 'Mijn account'
		},
		errors: {
			default: 'Er is iets fout gegaan. Probeer het later opnieuw.',
			USER_NOT_FOUND: 'Gebruiker niet gevonden',
			credentials: 'De e-email of het wachtwoord is fout',
			too_small: 'Ingevoerde waarde is te klein',
			'Invalid email': 'Ongeldig e-mailadres',
			employee_not_found: 'Er zijn geen medewerkers gevonden voor deze dienst!',
			too_many_requests: 'Ho! Je gaat te snel! Wacht even voordat je het opnieuw probeert.',
			invalid_phone_number: 'Ongeldig telefoonnummer',
			slot_not_available: 'De ingevoerde tijd is niet beschikbaar',
			max_members_reached: 'Het maximum aantal medewerkers is bereikt',
			invalid_password: 'Ongeldig wachtwoord',
			invalid_link_title: 'Ongeldige link',
			invalid_link_description:
				'Deze link is ongeldig of verlopen. Neem contact op met het bedrijf om je afspraak te annuleren of voor meer informatie.',
			back_to_home: 'Ga terug',
			expired_link_title: 'Verlopen link',
			expired_link_description:
				'Deze link is verlopen. Je moet je e-mailadres opnieuw verifiëren om door te gaan.',
			resend_verification_label: 'E-mailadres opnieuw verifiëren',
			resend_verification_button: 'Verzend verificatie e-mail opnieuw',
			resend_verification_success: 'Verificatie e-mail is verzonden! Controleer je inbox.',
			resend_verification_error: 'Kon verificatie e-mail niet verzenden. Probeer het opnieuw.',
			not_a_member_of_organization: 'Je bent geen lid van deze organisatie.',
			organization_slug_already_exists: 'Er bestaat al een organisatie met deze indentatie.',
			// Organization related errors
			organization_not_found: 'Organisatie niet gevonden',
			branch_not_found: 'Vestiging niet gevonden',
			organization_member_not_found: 'Organisatielid niet gevonden',
			slug_can_not_be_empty: 'URL-identificatie kan niet leeg zijn',
			max_organizations_reached: 'Maximaal aantal organisaties bereikt',
			// Service related errors
			service_not_found: 'Dienst niet gevonden',
			no_employees_for_service: 'Geen medewerkers beschikbaar voor deze dienst',
			package_not_found: 'Pakket niet gevonden',
			// Employee related errors
			employee_already_exists: 'Medewerker bestaat al',
			start_time_must_be_before_end_time: 'Starttijd moet voor eindtijd zijn',
			// Customer related errors
			customer_not_found: 'Klant niet gevonden',
			// Calendar related errors
			calendar_item_not_found: 'Kalenderitem niet gevonden',
			appointment_not_found: 'Afspraak niet gevonden',
			// Authentication related errors
			account_not_found: 'Account niet gevonden',
			you_need_to_be_authenticated_to_change_your_name:
				'Je moet ingelogd zijn om je naam te wijzigen',
			you_need_to_be_authenticated_to_cancel_an_appointment:
				'Je moet ingelogd zijn om een afspraak te annuleren',
			not_allowed_to_cancel_this_appointment: 'Je mag deze afspraak niet annuleren',
			// Booking related errors
			no_booking_found_for_the_customer: 'Geen boeking gevonden voor de klant',
			failed_to_send_magic_link: 'Kon magic link niet verzenden',
			magic_link_verification_not_found: 'Magic link verificatie niet gevonden',
			// File upload errors
			file_size_must_be_2mb_or_less: 'Bestandsgrootte moet 2MB of minder zijn',
			uploaded_file_exceeds_2mb_limit_and_has_been_deleted:
				'Geüpload bestand overschrijdt 2MB limiet en is verwijderd',
			// Communication related errors
			template_not_found: 'Sjabloon niet gevonden',
			communication_not_found: 'Communicatie niet gevonden',
			invalid_port: 'Ongeldige poort',
			missing_fields: 'Ontbrekende velden',
			// General errors
			employees_not_found: 'Medewerkers niet gevonden',
			opening_times_not_found: 'Openingstijden niet gevonden',
			invalid_date_range: 'Ongeldig datumbereik',
			note_not_found: 'Notitie niet gevonden',
			not_authorized_to_delete_this_note: 'Niet geautoriseerd om deze notitie te verwijderen',
			for_non_booking_calendar_items_use_a_type_other_than_booking:
				'Voor niet-boekingskalenderitems, gebruik een ander type dan BOOKING',
			regex: {
				'/Unique constraint failed.*email/i': 'Dit e-mailadres is al in gebruik'
			}
		},
		roles: {
			owner: 'Eigenaar',
			admin: 'Manager',
			member: 'Medewerker',
			invited: 'Uitgenodigd',
			declined: 'Geweigerd'
		},
		days: {
			1: 'Maandag',
			2: 'Dinsdag',
			3: 'Woensdag',
			4: 'Donderdag',
			5: 'Vrijdag',
			6: 'Zaterdag',
			7: 'Zondag',
			Maandag: 1,
			Dinsdag: 2,
			Woensdag: 3,
			Donderdag: 4,
			Vrijdag: 5,
			Zaterdag: 6,
			Zondag: 7
		},
		dateRange: {
			format: 'MMMM D, YYYY',
			applyLabel: 'Toepassen',
			cancelLabel: 'Annuleren',
			fromLabel: 'Van',
			toLabel: 'Aan',
			customRangeLabel: 'Aangepast bereik',
			tomorrow: 'Morgen',
			today: 'Vandaag',
			anyTime: 'Elk moment',
			yesterday: 'Gisteren',
			last_7: 'Afgelopen 7 dagen',
			last_30: 'Afgelopen 30 dagen',
			next: 'Volgende',
			previous: 'Vorige',
			next_7: 'Volgende 7 dagen',
			next_30: 'Volgende 30 dagen',
			thisMonth: 'Deze maand',
			nextMonth: 'Volgende maand',
			lastMonth: 'Afgelopen maand',
			firstDay: 1
		}
	},
	en: {
		appointments: {
			no_upcoming: 'No upcoming appointments.',
			no_finished: 'No completed appointments.',
			no_canceled: 'No canceled appointments.',
			book_again: 'Book again',
			leave_review: 'Leave a review',
			my_appointment: 'My Appointments',
			upcoming: 'Upcoming',
			completed: 'Completed',
			canceled: 'Canceled',
			cancel: 'Cancel',
			call: 'Call',
			cancel_title: 'Are you sure you want to cancel this appointment?',
			cancel_desc:
				'This action cannot be undone. Your appointment at {company} for {service} with {staff} on {date} at {time} will be canceled.',
			cancel_confirm: 'Yes, cancel appointment',
			cancel_dismiss: 'No, go back',
			cancel_success: 'Appointment successfully canceled.',
			cancel_error: 'Could not cancel appointment.',
			not_a_member_of_organization: 'You are not a member of this organization.',
			regex: {
				'/Unique constraint failed.*email/i': 'This email address is already in use'
			}
		},
		general: {
			coming_soon: 'Coming soon'
		},
		database: {
			enums: {
				bookingStatus: {
					CONFIRMED: '✅ Confirmed',
					COMPLETED: '☑️ Completed',
					CANCELLED: '❌ Cancelled',
					PENDING: '⏳ Pending'
				},

				calendarItemType: {
					BOOKING: 'Booking',
					REMINDER: 'Reminder'
				}
			}
		},
		login: {
			login: 'Login',
			loginDescription: 'Enter your email below to login to your account',
			signUp: 'Sign up',
			signUpDescription: 'Enter your name below to create a new account',
			name: 'Name',
			email: 'Email',
			password: 'Password',
			forgotPassword: 'Forgot password?',
			noAccount: 'No account yet?',
			noAccountDescription: 'Sign in',
			haveAccount: 'Already have an account?',
			haveAccountDescription: 'Log in',
			register: 'Register'
		},
		pages: {
			overview: 'Overview',
			bookings: 'Bookings',
			notes: 'Notes',
			dashboard: 'Dashboard',
			calendar: 'Calendar',
			products: 'Products',
			customers: 'Customers',
			settings: 'Settings',
			general: 'General',
			employees: 'Employees',
			notifications: 'Notifications',
			'business-hours': 'Business hours',
			branch: 'Branch',
			profile: 'Profile',
			'my-account': 'My account'
		},
		errors: {
			default: 'Something went wrong. Please try again later.',
			credentials: 'The email or password is incorrect',
			USER_NOT_FOUND: 'User not found',
			too_small: 'Input value is too small',
			'Invalid email': 'Invalid email address',
			employee_not_found: 'No employees found for this service!',
			too_many_requests: "Whoa! You're going too fast! Wait a bit before trying again.",
			invalid_phone_number: 'Invalid phone number',
			slot_not_available: 'The selected time is not available',
			max_members_reached: 'The maximum number of employees has been reached',
			invalid_password: 'Invalid password',
			invalid_link_title: 'Invalid link',
			invalid_link_description:
				'This link is invalid or expired. Please contact the company directly to cancel your appointment or for more information.',
			back_to_home: 'Go back',
			expired_link_title: 'Expired link',
			expired_link_description:
				'This link has expired. You need to reverify your email address to continue.',
			resend_verification_label: 'Reverify email address',
			resend_verification_button: 'Resend verification email',
			resend_verification_success: 'Verification email sent! Please check your inbox.',
			resend_verification_error: 'Could not send verification email. Please try again.',
			organization_slug_already_exists: 'An organization with this slug already exists.',
			not_a_member_of_organization: 'You are not a member of this organization.',
			// Organization related errors
			organization_not_found: 'Organization not found',
			branch_not_found: 'Branch not found',
			organization_member_not_found: 'Organization member not found',
			slug_can_not_be_empty: 'URL identifier cannot be empty',
			max_organizations_reached: 'Maximaal aantal organisaties bereikt',
			// Service related errors
			service_not_found: 'Service not found',
			no_employees_for_service: 'No employees available for this service',
			package_not_found: 'Package not found',
			// Employee related errors
			employee_already_exists: 'Employee already exists',
			start_time_must_be_before_end_time: 'Start time must be before end time',
			// Customer related errors
			customer_not_found: 'Customer not found',
			// Calendar related errors
			calendar_item_not_found: 'Calendar item not found',
			appointment_not_found: 'Appointment not found',
			// Authentication related errors
			account_not_found: 'Account not found',
			you_need_to_be_authenticated_to_change_your_name:
				'You need to be authenticated to change your name',
			you_need_to_be_authenticated_to_cancel_an_appointment:
				'You need to be authenticated to cancel an appointment',
			not_allowed_to_cancel_this_appointment: 'Not allowed to cancel this appointment',
			// Booking related errors
			no_booking_found_for_the_customer: 'No booking found for the customer',
			failed_to_send_magic_link: 'Failed to send magic link',
			magic_link_verification_not_found: 'Magic link verification not found',
			// File upload errors
			file_size_must_be_2mb_or_less: 'File size must be 2MB or less',
			uploaded_file_exceeds_2mb_limit_and_has_been_deleted:
				'Uploaded file exceeds 2MB limit and has been deleted',
			// Communication related errors
			template_not_found: 'Template not found',
			communication_not_found: 'Communication not found',
			invalid_port: 'Invalid port',
			missing_fields: 'Missing fields',
			// General errors
			employees_not_found: 'Employees not found',
			opening_times_not_found: 'Opening times not found',
			invalid_date_range: 'Invalid date range',
			note_not_found: 'Note not found',
			not_authorized_to_delete_this_note: 'Not authorized to delete this note',
			for_non_booking_calendar_items_use_a_type_other_than_booking:
				'For non-booking calendar items, use a type other than BOOKING',
			regex: {
				'/Unique constraint failed.*email/i': 'This email address is already in use'
			}
		},
		roles: {
			owner: 'Owner',
			admin: 'Manager',
			member: 'Employee',
			invited: 'Invited',
			declined: 'Declined'
		},
		days: {
			1: 'Monday',
			2: 'Tuesday',
			3: 'Wednesday',
			4: 'Thursday',
			5: 'Friday',
			6: 'Saturday',
			7: 'Sunday',
			monday: 1,
			tuesday: 2,
			wednesday: 3,
			thursday: 4,
			friday: 5,
			saturday: 6,
			sunday: 7
		},
		dateRange: {
			format: 'MMMM D, YYYY',
			applyLabel: 'Apply',
			cancelLabel: 'Cancel',
			fromLabel: 'From',
			toLabel: 'To',
			customRangeLabel: 'Custom range',
			tomorrow: 'Tomorrow',
			today: 'Today',
			anyTime: 'Any time',
			yesterday: 'Yesterday',
			last_7: 'Last 7 days',
			last_30: 'Last 30 days',
			next: 'Next',
			previous: 'Previous',
			next_7: 'Next 7 days',
			next_30: 'Next 30 days',
			thisMonth: 'This month',
			nextMonth: 'Next month',
			lastMonth: 'Last month',
			firstDay: 1
		}
	}
} as const;
export let language: 'nl' | 'en' = 'nl';
export let t = translations[language];

export function getErrorMessage(error: string | { message: string }): string | undefined {
	let errorMessage: string;

	if (typeof error === 'string') {
		errorMessage = error;
	} else if (error && typeof error.message === 'string') {
		errorMessage = error.message;
	} else {
		return t.errors.default;
	}

	// Check for direct match first
	if (t.errors[errorMessage as keyof typeof t.errors]) {
		return t.errors[errorMessage as keyof typeof t.errors] as string;
	}

	// Check regex patterns
	if (t.errors.regex) {
		for (const [pattern, message] of Object.entries(t.errors.regex)) {
			// Remove the surrounding slashes and flags from the pattern string
			const regexMatch = pattern.match(/^\/(.+)\/([gimuy]*)$/);
			if (regexMatch) {
				const [, regexPattern, flags] = regexMatch;
				const regex = new RegExp(regexPattern, flags);
				if (regex.test(errorMessage)) {
					return message;
				}
			}
		}
	}

	return;
}
