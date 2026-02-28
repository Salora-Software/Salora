import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Column,
  Section,
  Text,
} from '@react-email/components';

export interface AppointmentEmailProps {
  // Meta
  previewText?: string;
  logoUrl?: string;

  // Bedrijfsgegevens (Nieuw)
  companyName?: string;
  companyAddress?: string;
  companyUrl?: string;

  // Hoofd content (Bewerkbaar via jouw Editor)
  heading?: string;
  content?: string;

  // Actie
  buttonText?: string;
  buttonLink?: string;

  // Vaste data
  details?: {
    date: string;
    time: string;
    location: string;
  };
}

export const AppointmentEmail = ({
  previewText = 'Je afspraak is bevestigd',
  logoUrl = 'https://cdn.salora.app/users/sw2L4X1PKbryptzF30mfgqjms7xkqCbS/profile_de617364c3b947eb832e23f93671ae1a.png',
  companyName = 'Salora Beauty',
  companyAddress = 'Keizersgracht 123, 1015 CJ Amsterdam',
  companyUrl = 'https://salora.app',
  heading = 'Afspraak Bevestigd',
  content = 'Beste {{ naam }},\n\nBedankt voor je afspraak. We hebben deze in onze agenda gezet.\n\nMet vriendelijke groet,\nHet Team',
  buttonText = 'Bekijk Afspraak',
  buttonLink = 'https://jouw-app.com/dashboard',
  details = {
    date: '12 mei 2026',
    time: '14:00',
    location: 'Hoofdstraat 1, Amsterdam',
  },
}: AppointmentEmailProps) => {

  const currentYear = new Date().getFullYear();

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Preview>{previewText}</Preview>
        <Container style={container}>
          <Section style={box}>

            {/* --- HEADER MET LOGO EN NAAM --- */}
            <Section style={headerSection}>
              <Row>
                <Column style={{ width: '55px' }}>
                  <Img
                    src={logoUrl}
                    width="45"
                    height="45"
                    alt="Logo"
                    style={logoStyle}
                  />
                </Column>
                <Column>
                  <Text style={companyHeaderStyle}>{companyName}</Text>
                </Column>
              </Row>
            </Section>

            <Hr style={hr} />

            {/* --- HOOFD CONTENT --- */}
            <Text style={headingStyle}>{heading}</Text>

            <Text style={{ ...paragraph, whiteSpace: 'pre-wrap' }}>
              {content}
            </Text>

            {/* --- DETAILS BLOK --- */}
            <Section style={detailsBox}>
              <Row>
                <Column>
                  <Text style={detailsLabel}>DATUM & TIJD</Text>
                  <Text style={detailsValue}>{details.date} om {details.time}</Text>
                </Column>
              </Row>
              <Row style={{ marginTop: '10px' }}>
                <Column>
                  <Text style={detailsLabel}>LOCATIE</Text>
                  <Text style={detailsValue}>{details.location}</Text>
                </Column>
              </Row>
            </Section>

            <Button style={button} href={buttonLink}>
              {buttonText}
            </Button>

            <Hr style={hr} />

            {/* --- UITGEBREIDE FOOTER --- */}
            <Section style={footerSection}>
              <Text style={footerText}>
                © {currentYear} {companyName}. Alle rechten voorbehouden.
              </Text>
              <Text style={footerText}>
                {companyAddress}
              </Text>
            </Section>

          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default AppointmentEmail;

// --- STYLES ---

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0', // Padding verplaatst naar 'box' voor betere randen
  marginBottom: '64px',
  borderRadius: '8px', // Iets modernere look
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  maxWidth: '600px',
};

const box = {
  padding: '40px 48px',
};

const headerSection = {
  marginBottom: '20px',
};

const logoStyle = {
  borderRadius: '5px', // Optioneel: maakt logo rond
  display: 'block',
};

const companyHeaderStyle = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#1a1a1a',
  margin: '0',
  marginLeft: '10px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '24px 0',
};

const headingStyle = {
  color: '#32325d',
  fontSize: '22px', // Iets groter
  fontWeight: 'bold',
  lineHeight: '28px',
  textAlign: 'left' as const,
  marginBottom: '16px',
};

const paragraph = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '26px', // Iets meer lucht in de tekst
  textAlign: 'left' as const,
};

// Verbeterd Details Blok
const detailsBox = {
  backgroundColor: '#f8fafc',
  padding: '24px',
  borderRadius: '8px',
  margin: '24px 0',
  border: '1px solid #e2e8f0',
};

const detailsLabel = {
  color: '#8898aa',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  marginBottom: '4px',
  margin: '0',
};

const detailsValue = {
  color: '#32325d',
  fontSize: '16px',
  fontWeight: '500',
  margin: '0',
};

const button = {
  backgroundColor: '#656ee8',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '14px 0',
  marginTop: '32px',
  boxShadow: '0 4px 6px rgba(50, 50, 93, 0.11), 0 1px 3px rgba(0, 0, 0, 0.08)',
};

// Footer Styles
const footerSection = {
  marginTop: '32px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#8898aa',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '4px 0',
};

const footerLinks = {
  marginTop: '12px',
  fontSize: '13px',
};

const link = {
  color: '#656ee8',
  textDecoration: 'none',
};