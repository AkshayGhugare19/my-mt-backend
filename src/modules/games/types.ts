import { GameType } from '@modules/games/constants';

export interface Game {
  id: string;
  providerName: string;
  name: string;
  title: string;
  slug: string;
  oldSlug: string;
  image: string;
  coverImage: string;
  isMobile: boolean;
  demo: boolean;
  type: GameType;
  category: string;
}

export interface NewReleaseGame {
  id: string;
  providerName: string;
  name: string;
  title: string;
  slug: string;
  oldSlug: string;
  image: string;
  coverImage: string;
  isMobile: boolean;
  demo: boolean;
  type: GameType;
  category: string;
  newRelease: boolean;
}


export type CompressionVersion = 1;
export type CompressedProvider = string; // just the name (string) of the provider; skipping array saves at least 2 bytes per provider
// arrays are more compact than objects
export type CompressedGame = [
  id: string,
  providerIdx: number,
  flags: number, // 5 bits number (2 digits max): DEMO_FLAG | FRONT_PAGE_FLAG | GameType
  name: string,
  title: string,
  slug: string,
  oldSlug: string,
  image: string,
  coverImage: string,
  category: string,
];

export type CompressedResult = {
  v: CompressionVersion;
  p: CompressedProvider[];
  g: CompressedGame[];
  sbi: string;
  cpb: [string, number[]][];
};

export type GamesFilter = {
  search?: string;
  category?: string;
  provider?: string;
  available?: boolean;
  disabled?: boolean;
  page?: number;
  limit?: number;
};