export const bookingContactFields = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "notes",
] as const;

export type BookingContactField = (typeof bookingContactFields)[number];

export const defaultRequiredBookingFields: BookingContactField[] = [
  "firstName",
  "lastName",
  "email",
];

export function parseRequiredBookingFields(
  value: string | null | undefined,
): BookingContactField[] {
  let fields: BookingContactField[] = [...defaultRequiredBookingFields];

  if (value) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        fields = parsed.filter((field): field is BookingContactField =>
          bookingContactFields.includes(field),
        );
      }
    } catch {
      // Invalid JSON, fall back to defaults
    }
  }

  // Email is always required
  if (!fields.includes("email")) {
    fields.push("email");
  }

  return fields;
}
