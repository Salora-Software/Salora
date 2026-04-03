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

export interface ForgotPasswordEmailProps {
	previewText?: string;
	logoUrl?: string;
	companyName?: string;
	companyAddress?: string;
	heading?: string;
	content?: string;
	buttonText?: string;
	buttonLink?: string;
}

export const ForgotPasswordEmail = ({
	previewText = 'Reset je wachtwoord',
	logoUrl = 'https://cdn.salora.app/storage/unnamed.png',
	companyName = 'Salora Beauty',
	companyAddress = 'Keizersgracht 123, 1015 CJ Amsterdam',
	heading = 'Wachtwoord Vergeten',
	content = 'Beste {{ name }},\n\nWe hebben een verzoek ontvangen om je wachtwoord te resetten.\Klik op de onderstaande knop om een nieuw wachtwoord in te stellen. Als je dit niet hebt aangevraagd, kun je deze e-mail negeren.',
	buttonText = 'Reset Wachtwoord',
	buttonLink = 'https://jouw-app.com/reset-password',
}: ForgotPasswordEmailProps) => {
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

export default ForgotPasswordEmail;
