/** The type of a file by its first bytes (never by the name or the type the browser says). */
export function fileTypeOf(
  bytes: Uint8Array,
): 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp' | null {
  const at = (index: number) => bytes[index];
  if (at(0) === 0x25 && at(1) === 0x50 && at(2) === 0x44 && at(3) === 0x46) return 'application/pdf';
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'image/jpeg';
  if (at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47) return 'image/png';
  if (
    at(0) === 0x52 &&
    at(1) === 0x49 &&
    at(2) === 0x46 &&
    at(3) === 0x46 &&
    at(8) === 0x57 &&
    at(9) === 0x45 &&
    at(10) === 0x42 &&
    at(11) === 0x50
  )
    return 'image/webp';
  return null;
}
