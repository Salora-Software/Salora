import { Section, Text } from "@react-email/components";
import { footerSection, footerText } from "../lib/styles";

export const Footer = ({
  companyName,
  companyAddress,
}: {
  companyName: string;
  companyAddress: string;
}) => {
  const currentYear = new Date().getFullYear();
  return (
    <Section style={footerSection}>
      <Text style={footerText}>
        © {currentYear} {companyName}. Alle rechten voorbehouden.
      </Text>
      <Text style={footerText}>{companyAddress}</Text>
    </Section>
  );
};
