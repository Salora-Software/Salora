import { Column, Img, Row, Section, Text } from "@react-email/components";
import { companyHeaderStyle, headerSection, logoStyle } from "../lib/styles";

export const Header = ({
  logoUrl,
  companyName,
}: {
  logoUrl: string;
  companyName: string;
}) => (
  <Section style={headerSection}>
    <Row>
      <Column style={{ width: "55px" }}>
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
);
