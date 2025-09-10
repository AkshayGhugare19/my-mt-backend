import { createHash } from 'node:crypto';

export const hashSha256InB64 = (value: string): string => {
  return createHash('sha256').update(value).digest('base64');
};
