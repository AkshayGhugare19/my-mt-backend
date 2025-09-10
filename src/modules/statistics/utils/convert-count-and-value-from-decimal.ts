import { FundsCountAndValue } from '@modules/statistics/types';

export function convertCountAndValueFromDecimal(
  countAndValue: FundsCountAndValue,
): {
  count: number;
  value: string;
} {
  return {
    count: countAndValue.count,
    value: countAndValue.value.toFixed(3),
  };
}
