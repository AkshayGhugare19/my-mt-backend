import { Decimal } from '@prisma/client/runtime/library';

/**
 * Convert Decimal to number with a default precision of 4
 * @param value
 * @param precision
 *
 * @example
 * Convert Decimal to number with default precision
 * const decimal = Decimal.fromString('1.000000000000000000');
 * const number = decimalToNumber(decimal); // 1.0000
 *
 * Convert Decimal to number with custom precision
 * const decimal = Decimal.fromString('1.000000000000000000');
 * const number = decimalToNumber(decimal, 2); // 1.00
 */
export const decimalToNumber = <T extends Decimal | number | undefined | null>(
  value: T,
  precision = 4,
): T extends undefined ? number | undefined : number => {
  if (value === null || value === undefined) {
    return undefined as T extends undefined ? number | undefined : number;
  }

  return parseFloat(value.toFixed(precision));
};
