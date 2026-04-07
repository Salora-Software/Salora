import { Section, Row, Column, Text } from '@react-email/components';
import { detailsBox, detailsLabel, detailsValue } from '../lib/styles';

export const DetailsBox = ({ details }: { details: { date: string, time: string, location: string } }) => (
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
);
