import { BetMetadata } from '@modules/bet/types';

type BetMetadataType = 'placeBet' | 'settleBet' | 'bonusBalanceChange';

export function mergeBetMetadata(
  type: BetMetadataType,
  metadata: BetMetadata,
  newEvent: Record<string, any>,
): BetMetadata {
  const initialData = getInitialData(type, metadata);

  const updatedData = initialData
    ? Array.isArray(initialData)
      ? [...initialData, newEvent]
      : [initialData, newEvent]
    : newEvent;

  return {
    ...metadata,
    [type]: updatedData,
  };
}

function getInitialData(
  type: BetMetadataType,
  metadata: BetMetadata,
): Record<string, any> | Record<string, any>[] {
  switch (type) {
    case 'placeBet':
      return metadata.placeBet;
    case 'settleBet':
      return metadata.settleBet;
    case 'bonusBalanceChange':
      return metadata.bonusBalanceChange ?? [];
  }
}
