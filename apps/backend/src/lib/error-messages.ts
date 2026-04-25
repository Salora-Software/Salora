export const ERROR_MESSAGES = {
	INVALID_DATE: "invalid_date",
	INVALID_DATE_RANGE: "invalid_date_range",
	SLOT_TOO_SOON: "slot_too_soon",
	NO_EMPLOYEES_FOR_SERVICE: "no_employees_for_service",
	SLOT_NOT_AVAILABLE: "slot_not_available",
	EMPLOYEE_LOOKUP_FAILED: "employee_lookup_failed",
	FAILED_TO_CREATE_USER: "failed_to_create_user",
	UNAUTHORIZED_CANCEL: "you_need_to_be_authenticated_to_cancel_an_appointment",
	BRANCH_NOT_FOUND: "branch_not_found",
	APPOINTMENT_NOT_FOUND: "appointment_not_found",
	FORBIDDEN_CANCEL: "not_allowed_to_cancel_this_appointment",
	CANNOT_CANCEL_PAST: "cannot_cancel_past_appointment",
	ORGANIZATION_NOT_FOUND: "organization_not_found",
} as const;

export type ErrorMessage = (typeof ERROR_MESSAGES)[keyof typeof ERROR_MESSAGES];
