import { createHmac } from 'crypto';

export function hmacSha512Inb64Url(key: string, data: string): string {
  return createHmac('sha512', key).update(data).digest('base64url');
}
