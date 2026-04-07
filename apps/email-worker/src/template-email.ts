import { createDb, schema } from "@salora/database";
import { renderEmail } from "@salora/emails";
import type { EmailTargetAudience, TemplateEmailQueueMessage } from "@salora/mailer";
import { and, eq } from "drizzle-orm";
import type { Env } from "./types";

interface ResolvedTemplateEmail {
	senderName: string;
	from: string;
	to: string;
	subject: string;
	body: string;
}

const DEFAULT_SENDER = "noreply@salora.app";

const getTemplateName = (
	templateType: string,
	targetAudience: EmailTargetAudience,
) => {
	if (targetAudience === "EMPLOYEE") {
		switch (templateType) {
			case "EMAIL_CANCELED":
				return "AppointmentCancelledEmployeeEmail" as const;
			case "EMAIL_CREATED":
				return "AppointmentPendingEmployeeEmail" as const;
			default:
				return "AppointmentEmployeeEmail" as const;
		}
	}

	switch (templateType) {
		case "EMAIL_CANCELED":
			return "AppointmentCancelledEmail" as const;
		case "EMAIL_CREATED":
			return "AppointmentPendingEmail" as const;
		default:
			return "AppointmentEmail" as const;
	}
};

const getDefaultSubject = (templateType: string): string => {
	switch (templateType) {
		case "EMAIL_APPROVED":
			return "Je afspraak is bevestigd";
		case "EMAIL_CANCELED":
			return "Je afspraak is geannuleerd";
		case "EMAIL_DENIED":
			return "Update over je afspraak";
		case "EMAIL_CREATED":
			return "Je afspraak is ingepland";
		default:
			return "Update over je afspraak";
	}
};

const getDefaultHeading = (templateType: string): string => {
	switch (templateType) {
		case "EMAIL_APPROVED":
			return "Afspraak Bevestigd";
		case "EMAIL_CANCELED":
			return "Afspraak Geannuleerd";
		case "EMAIL_DENIED":
			return "Afspraak Gewijzigd";
		case "EMAIL_CREATED":
			return "Afspraak Ingepland";
		default:
			return "Afspraak Update";
	}
};

const getDefaultContent = (templateType: string): string => {
	switch (templateType) {
		case "EMAIL_CREATED":
			return "Beste {{ customer.name }},\n\nJe afspraakaanvraag voor {{ booking.name }} is ontvangen en wacht op goedkeuring.";
		case "EMAIL_CANCELED":
			return "Beste {{ customer.name }},\n\nJe afspraak voor {{ booking.name }} is geannuleerd.";
		case "EMAIL_APPROVED":
			return "Beste {{ customer.name }},\n\nJe afspraak voor {{ booking.name }} is bevestigd.";
		default:
			return "Beste {{ customer.name }},\n\nEr is een update over je afspraak voor {{ booking.name }}.";
	}
};

const getValueByPath = (
	data: Record<string, unknown>,
	path: string,
): unknown => {
	return path.split(".").reduce<unknown>((acc, part) => {
		if (typeof acc !== "object" || acc === null) return undefined;
		return (acc as Record<string, unknown>)[part];
	}, data);
};

const replaceTemplateVariables = (
	template: string,
	data: Record<string, unknown>,
): string => {
	return template.replace(/{{\s*([^}]+)\s*}}/g, (_, path: string) => {
		const value = getValueByPath(data, path.trim());
		if (value === null || value === undefined) return "";
		return String(value);
	});
};

const interpolateRecord = (
	value: unknown,
	data: Record<string, unknown>,
): unknown => {
	if (typeof value === "string") {
		return replaceTemplateVariables(value, data);
	}

	if (Array.isArray(value)) {
		return value.map((item) => interpolateRecord(item, data));
	}

	if (typeof value === "object" && value !== null) {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			out[k] = interpolateRecord(v, data);
		}
		return out;
	}

	return value;
};

const parseTemplateBody = (body?: string | null): Record<string, unknown> => {
	if (!body) return {};

	try {
		const parsed = JSON.parse(body) as unknown;
		if (typeof parsed === "object" && parsed !== null) {
			return parsed as Record<string, unknown>;
		}
	} catch {
		return { content: body };
	}

	return {};
};

const toStringValue = (value: unknown, fallback = ""): string => {
	return typeof value === "string" && value.trim().length > 0
		? value
		: fallback;
};

const formatDateTime = (date: Date, timeZone: string): string =>
	new Intl.DateTimeFormat("nl-NL", {
		dateStyle: "long",
		timeStyle: "short",
		timeZone,
	}).format(date);

const formatDate = (date: Date, timeZone: string): string =>
	new Intl.DateTimeFormat("nl-NL", {
		dateStyle: "long",
		timeZone,
	}).format(date);

const formatTime = (date: Date, timeZone: string): string =>
	new Intl.DateTimeFormat("nl-NL", {
		hour: "2-digit",
		minute: "2-digit",
		timeZone,
	}).format(date);

export const resolveTemplateEmail = async (
	payload: TemplateEmailQueueMessage,
	env: Env,
): Promise<ResolvedTemplateEmail | null> => {
	const db = createDb(env.DB as any);

	const organization = await db.query.organization.findFirst({
		where: eq(schema.organization.id, payload.organizationId),
	});

	if (!organization) {
		throw new Error(`Organization not found: ${payload.organizationId}`);
	}

	const isTestTemplate = payload.eventType === "TEST_TEMPLATE";

	const booking = payload.bookingId
		? await db.query.booking.findFirst({
			where: and(
				eq(schema.booking.id, payload.bookingId),
				eq(schema.booking.organizationId, payload.organizationId),
			),
			with: {
				customer: true,
				service: true,
				employee: {
					with: {
						user: true,
					},
				},
				calendarItems: true,
			},
		})
		: null;

	if (!isTestTemplate && payload.bookingId && !booking) {
		throw new Error(`Booking not found: ${payload.bookingId}`);
	}

	const firstCalendarItem = booking?.calendarItems
		?.filter((item) => item.startTime)
		.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())[0];

	const appointmentDate = firstCalendarItem?.startTime ?? new Date();
	const organizationTimeZone = organization.timeZone || "UTC";

	const targetAudience = payload.targetAudience ?? "CUSTOMER";

	const customerName = isTestTemplate
		? "Test Klant"
		: booking?.customer?.name || "Klant";
	const employeeName = booking?.employee?.user?.name || "Medewerker";
	const customerEmail = booking?.customer?.email || "";
	const employeeEmail = booking?.employee?.user?.email || "";
	const recipientEmail =
		isTestTemplate
			? "test@salora.app"
			: targetAudience === "EMPLOYEE"
				? employeeEmail
				: customerEmail;

	if (!isTestTemplate && !recipientEmail) {
		throw new Error(
			`No recipient available for template ${payload.templateType} (bookingId=${payload.bookingId || "n/a"}, target=${targetAudience})`,
		);
	}

	const template = await db.query.template.findFirst({
		where: and(
			eq(schema.template.organizationId, payload.organizationId),
			eq(schema.template.type, payload.templateType),
			eq(schema.template.target, targetAudience),
		),
	});

	if (template && !template.enabled) {
		console.info("Skipping email because template is disabled", {
			organizationId: payload.organizationId,
			templateType: payload.templateType,
			targetAudience,
			bookingId: payload.bookingId,
		});
		return null;
	}

	const variables: Record<string, unknown> = {
		branch: {
			id: organization.id,
			name: organization.name,
			location: organization.location || "",
			email: organization.email || "",
			phone: organization.phone || "",
			timeZone: organizationTimeZone,
		},
		date: {
			now: formatDateTime(new Date(), organizationTimeZone),
			year: new Date().getFullYear(),
			month: new Date().getMonth() + 1,
			day: new Date().getDate(),
		},
		customer: {
			name: customerName,
			firstName: customerName.split(" ")[0] || customerName,
			lastName: customerName.split(" ").slice(1).join(" "),
			email: customerEmail,
			phone: booking?.customer?.phone || "",
		},
		employee: {
			name: employeeName,
			email: employeeEmail,
		},
		booking: {
			name: booking?.service?.name || "Intake",
			price:
				typeof booking?.service?.price === "number"
					? new Intl.NumberFormat("nl-NL", {
						style: "currency",
						currency: "EUR",
					}).format(booking.service.price)
					: "",
			date: formatDateTime(appointmentDate, organizationTimeZone),
			time: formatTime(appointmentDate, organizationTimeZone),
			location: organization.location || "Onbekende locatie",
		},
	};

	const parsedBody = parseTemplateBody(template?.body as string | null | undefined);
	const interpolatedBody = interpolateRecord(parsedBody, variables) as Record<
		string,
		unknown
	>;

	const detailsInput =
		typeof interpolatedBody.details === "object" &&
			interpolatedBody.details !== null
			? (interpolatedBody.details as Record<string, unknown>)
			: {};

	const mailProps = {
		companyName: toStringValue(interpolatedBody.companyName, organization.name),
		companyAddress: toStringValue(
			interpolatedBody.companyAddress,
			organization.location || "",
		),
		companyUrl: toStringValue(
			interpolatedBody.companyUrl,
			organization.website || "",
		),
		heading: toStringValue(
			interpolatedBody.heading,
			getDefaultHeading(payload.templateType),
		),
		content: toStringValue(
			interpolatedBody.content,
			getDefaultContent(payload.templateType),
		),
		buttonText: toStringValue(interpolatedBody.buttonText, "Bekijk afspraak"),
		buttonLink: toStringValue(
			interpolatedBody.buttonLink,
			"https://salora.app",
		),
		details: {
			date: toStringValue(
				detailsInput.date,
				formatDate(appointmentDate, organizationTimeZone),
			),
			time: toStringValue(
				detailsInput.time,
				formatTime(appointmentDate, organizationTimeZone),
			),
			location: toStringValue(
				detailsInput.location,
				organization.location || "Onbekende locatie",
			),
		},
	};

	const subjectTemplate =
		template?.subject || getDefaultSubject(payload.templateType);
	const subject = replaceTemplateVariables(subjectTemplate, variables);
	const body = await renderEmail(
		getTemplateName(payload.templateType, targetAudience),
		mailProps as any,
	);

	return {
		senderName: organization.name || "Salora",
		from: env.MAIL_EMAIL_SENDER || DEFAULT_SENDER,
		to: recipientEmail,
		subject,
		body,
	};
};
