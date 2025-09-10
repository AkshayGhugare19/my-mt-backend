import { createHash } from 'node:crypto';

export const hashSha1InHex = (value: string): string => {
  return createHash('sha1').update(value).digest('hex');
};
