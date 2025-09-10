import crypto from 'crypto';

export function encryptPassword(password: string): string {
  const salt = crypto.randomBytes(32).toString('base64');

  const hash = crypto
    .pbkdf2Sync(password, salt, 210000, 64, 'sha512')
    .toString('base64');

  return [salt, hash].join('$');
}

export function verifyPassword(
  toBeVerified: string,
  original: string,
): boolean {
  const [originalSalt, originalHash] = original.split('$');

  const toBeVerifiedHash = crypto
    .pbkdf2Sync(toBeVerified, originalSalt, 210000, 64, 'sha512')
    .toString('base64');

  return toBeVerifiedHash === originalHash;
}
