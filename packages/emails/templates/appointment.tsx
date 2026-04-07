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

export interface AppointmentEmailProps {
	previewText?: string;
	logoUrl?: string;
	companyName?: string;
	companyAddress?: string;
	companyUrl?: string;
	heading?: string;
	content?: string;
	buttonText?: string;
	buttonLink?: string;
	details?: {
		date: string;
		time: string;
		location: string;
	};
}

export const AppointmentEmail = ({
	previewText = 'Je afspraak is bevestigd',
	logoUrl = 'https://cdn.salora.app/storage/unnamed.png',
	companyName = 'Salora Beauty',
	companyAddress = 'Keizersgracht 123, 1015 CJ Amsterdam',
	companyUrl = 'https://salora.app',
	heading = 'Afspraak Bevestigd',
	content = 'Beste {{ name }},\n\nBedankt voor je afspraak. We hebben deze in onze agenda gezet.\n\nMet vriendelijke groet,\nHet Team',
	buttonText = 'Bekijk Afspraak',
	buttonLink = 'https://jouw-app.com/dashboard',
	details = {
		date: '12 mei 2026',
		time: '14:00',
		location: 'Hoofdstraat 1, Amsterdam',
	},
}: AppointmentEmailProps) => {
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
						{details && <DetailsBox details={details} />}
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

export default AppointmentEmail;
