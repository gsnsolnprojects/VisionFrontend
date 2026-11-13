/**
 * Many stored file names are ids (long hex strings, uuids), which mean nothing to anyone. These show
 * a photo's own name only when it reads as a name; otherwise "Photo 12".
 */
const LONG_ID = /[0-9a-f]{16,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i;
/** A stored name: nothing but a hex id with letters and digits (e.g. 8aed46ceaef5.jpg), not a plain number */
const HEX_NAME = /^(?=[0-9a-f]*[a-f])(?=[0-9a-f]*\d)[0-9a-f]{10,}(\.[a-z0-9]+)?$/i;
const MAX_NAME = 60;

export const hasReadableName = (name?: string | null) => {
  const text = String(name ?? "").trim();
  return !!text && text.length <= MAX_NAME && !LONG_ID.test(text) && !HEX_NAME.test(text);
};

export const photoName = (name?: string | null, position?: number, noun = "Photo") =>
  hasReadableName(name) ? String(name).trim() : position ? `${noun} ${position}` : noun;
