const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Database ids are UUIDs; a mock-style or made-up id can never match a row (so it is "not found"). */
export const isUuid = (value: string | null | undefined): value is string => !!value && UUID.test(value);
