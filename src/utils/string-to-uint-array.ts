export function stringToUint8Array(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

export function hexToUint8Array(hex: string): Uint8Array {
  // Remove '0x' prefix if present
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const pairs = cleanHex.match(/[\dA-F]{2}/gi);
  if (!pairs) return new Uint8Array();
  return new Uint8Array(pairs.map((s) => parseInt(s, 16)));
}
