import { GameType, GameTypes } from '@modules/games/constants';

export function gameTypeToString(type: GameType): string {
  switch (type) {
    case GameTypes.LIVE:
      return 'live';
    case GameTypes.SLOTS:
      return 'slots';
    case GameTypes.TABLE:
      return 'table';
    case GameTypes.WEB3:
      return 'web3';
    default:
      return 'unknown';
  }
}

export function gameTypeFromString(type: string): GameType {
  switch (type) {
    case 'live':
      return GameTypes.LIVE;
    case 'slots':
      return GameTypes.SLOTS;
    case 'table':
      return GameTypes.TABLE;
    case 'web3':
      return GameTypes.WEB3;
    default:
      return GameTypes.UNKNOWN;
  }
}
