import { hashSha1InHex } from '@utils/hash-sha1-in-hex';
import { serializeObjectInRedisKey } from '@utils/serialize-object-in-redis-key';

export const createWishlistFilterKey = (filterData: {
  checkIn: Date;
  checkOut: Date;
}): string => {
  return hashSha1InHex(serializeObjectInRedisKey(filterData));
};
