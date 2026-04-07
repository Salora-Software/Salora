export type TemplateVariableAudience = "CUSTOMER" | "EMPLOYEE";

export interface TemplateVariableDefinition {
	path: string;
	label: string;
	audiences: TemplateVariableAudience[];
}

const PLACEHOLDER_PATTERN = /{{\s*([^}]+)\s*}}/g;

export const TEMPLATE_VARIABLE_DEFINITIONS: TemplateVariableDefinition[] = [
	{
		path: "branch.name",
		label: "Bedrijfsnaam",
		audiences: ["CUSTOMER", "EMPLOYEE"],
	},
	{
		path: "branch.location",
		label: "Locatie",
		audiences: ["CUSTOMER", "EMPLOYEE"],
	},
	{
		path: "branch.email",
		label: "Bedrijfs e-mail",
		audiences: ["CUSTOMER", "EMPLOYEE"],
	},
	{
		path: "branch.phone",
		label: "Bedrijfs telefoon",
		audiences: ["CUSTOMER", "EMPLOYEE"],
	},
	{
		path: "booking.name",
		label: "Dienstnaam",
		audiences: ["CUSTOMER", "EMPLOYEE"],
	},
	{
		path: "booking.price",
		label: "Prijs",
		audiences: ["CUSTOMER", "EMPLOYEE"],
	},
	{
		path: "booking.date",
		label: "Datum",
		audiences: ["CUSTOMER", "EMPLOYEE"],
	},
	{
		path: "booking.time",
		label: "Tijd",
		audiences: ["CUSTOMER", "EMPLOYEE"],
	},
	{
		path: "booking.location",
		label: "Afspraaklocatie",
		audiences: ["CUSTOMER", "EMPLOYEE"],
	},
	{
		path: "customer.name",
		label: "Klantnaam",
		audiences: ["CUSTOMER", "EMPLOYEE"],
	},
	{
		path: "customer.firstName",
		label: "Voornaam klant",
		audiences: ["CUSTOMER", "EMPLOYEE"],
	},
	{
		path: "customer.lastName",
		label: "Achternaam klant",
		audiences: ["CUSTOMER", "EMPLOYEE"],
	},
	{
		path: "customer.email",
		label: "Klant e-mail",
		audiences: ["CUSTOMER", "EMPLOYEE"],
	},
	{
		path: "customer.phone",
		label: "Klant telefoon",
		audiences: ["CUSTOMER", "EMPLOYEE"],
	},
	{
		path: "employee.name",
		label: "Medewerkernaam",
		audiences: ["CUSTOMER", "EMPLOYEE"],
	},
	{
		path: "employee.email",
		label: "Medewerker e-mail",
		audiences: ["CUSTOMER", "EMPLOYEE"],
	},
	{
		path: "date.now",
		label: "Huidige datum + tijd",
		audiences: ["CUSTOMER", "EMPLOYEE"],
	},
	{
		path: "date.year",
		label: "Huidig jaar",
		audiences: ["CUSTOMER", "EMPLOYEE"],
	},
	{
		path: "date.month",
		label: "Huidige maand",
		audiences: ["CUSTOMER", "EMPLOYEE"],
	},
	{
		path: "date.day",
		label: "Huidige dag",
		audiences: ["CUSTOMER", "EMPLOYEE"],
	},
];

export const extractTemplateVariablePaths = (value: string): string[] => {
	if (!value) return [];

	const matches = Array.from(value.matchAll(PLACEHOLDER_PATTERN));
	return matches
		.map((match) => match[1]?.trim())
		.filter((path): path is string => Boolean(path));
};

export const getAllowedTemplateVariablePaths = (
	audience?: TemplateVariableAudience,
): string[] => {
	if (!audience) {
		return TEMPLATE_VARIABLE_DEFINITIONS.map((item) => item.path);
	}

	return TEMPLATE_VARIABLE_DEFINITIONS.filter((item) =>
		item.audiences.includes(audience),
	).map((item) => item.path);
};

export interface TemplateVariableValidationResult {
	used: string[];
	unknown: string[];
}

export const validateTemplateVariables = (
	value: string,
	allowedPaths: readonly string[],
): TemplateVariableValidationResult => {
	const used = extractTemplateVariablePaths(value);
	const allowedPathSet = new Set(allowedPaths);
	const unknown = Array.from(
		new Set(used.filter((path) => !allowedPathSet.has(path))),
	);

	return {
		used: Array.from(new Set(used)),
		unknown,
	};
};

export const validateTemplateRecordVariables = (
	record: Record<string, unknown>,
	allowedPaths: readonly string[],
): TemplateVariableValidationResult => {
	const collected: string[] = [];

	const walk = (value: unknown): void => {
		if (typeof value === "string") {
			collected.push(...extractTemplateVariablePaths(value));
			return;
		}

		if (Array.isArray(value)) {
			value.forEach(walk);
			return;
		}

		if (typeof value === "object" && value !== null) {
			Object.values(value).forEach(walk);
		}
	};

	walk(record);

	const allowedPathSet = new Set(allowedPaths);
	const uniqueUsed = Array.from(new Set(collected));

	return {
		used: uniqueUsed,
		unknown: uniqueUsed.filter((path) => !allowedPathSet.has(path)),
	};
};