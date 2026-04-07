import {
	Body,
	Button,
	Container,
	Head,
	Hr,
	Html,
	Preview,
	Section,
	Text,
} from '@react-email/components';
import { main, container, box, hr, headingStyle, paragraph, button } from './lib/styles';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { DetailsBox } from './components/DetailsBox';

export interface AppointmentCancelledEmployeeEmailProps {
	previewText?: string;
	logoUrl?: string;
	companyName?: string;
	companyAddress?: string;
	heading?: string;
	content?: string;
	buttonText?: string;
	buttonLink?: string;
	details?: {
		date: string;
		time: string;
		location: string;
		customerName: string;
	};
}

export const AppointmentCancelledEmployeeEmail = ({
	previewText = 'Afspraak geannuleerd',
	logoUrl = 'https://cdn.salora.app/storage/unnamed.png',
	companyName = 'Salora Beauty',
	companyAddress = 'Keizersgracht 123, 1015 CJ Amsterdam',
	heading = 'Afspraak Geannuleerd',
	content = 'Beste {{ employeeName }},\n\nDe afspraak met {{ customerName }} voor {{ serviceName }} is helaas geannuleerd. Dit tijdslot is nu weer beschikbaar voor andere klanten.',
	buttonText = 'Bekijk Agenda',
	buttonLink = 'https://jouw-app.com/admin/agenda',
	details = {
		date: '12 mei 2026',
		time: '14:00',
		location: 'Hoofdstraat 1, Amsterdam',
		customerName: 'Klant Naam',
	},
}: AppointmentCancelledEmployeeEmailProps) => {
	// Extended details for employee
	const employeeDetails = {
		...details,
		location: `${details.location} (Klant: ${details.customerName})`,
	};

	return (
		<Html>
			<Head />
			<Body style={main}>
				<Preview>{previewText}</Preview>
				<Container style={container}>
					<Section style={box}>
						<Header logoUrl={logoUrl} companyName={companyName} />
						<Hr style={hr} />
						<Text style={headingStyle}>{heading}</Text>
						<Text style={{ ...paragraph, whiteSpace: 'pre-wrap' }}>
							{content}
						</Text>
						{employeeDetails && <DetailsBox details={employeeDetails} />}
						<Button style={button} href={buttonLink}>
							{buttonText}
						</Button>
						<Hr style={hr} />
						<Footer companyName={companyName} companyAddress={companyAddress} />
					</Section>
				</Container>
			</Body>
		</Html>
	);
};

export default AppointmentCancelledEmployeeEmail;
