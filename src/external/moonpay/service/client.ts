import { createHmac } from 'crypto';

export function generateUrlSignature(url: string, secretKey: string): string {
  return createHmac('sha256', secretKey)
    .update(new URL(url).search)
    .digest('base64');
}
