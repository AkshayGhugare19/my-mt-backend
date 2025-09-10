import crypto from 'crypto';

export function generateNumericalCode(length: number): string {
  let code = '';

  const characters = '0123456789';

  for (let i = 0; i < length; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return code;
}

export function generateAlphaNumericalCode(length: number): string {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}
