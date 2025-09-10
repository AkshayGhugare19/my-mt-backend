import { EnumValues } from '@common/enums/common';
import { z } from 'zod';

export const DEMO_FLAG = 1 << 0;
export const FRONT_PAGE_FLAG = 1 << 1;
export const IS_MOBILE_FLAG = 1 << 2;
export const IS_DESKTOP_FLAG = 1 << 3;

export const GameTypes = {
  UNKNOWN: 1 << 4,
  LIVE: 1 << 5,
  SLOTS: 1 << 6,
  TABLE: 1 << 7,
  WEB3: 1 << 8,
} as const;

export type GameType = EnumValues<typeof GameTypes>;
export const GameTypeSchema = z.enum(Object.keys(GameTypes) as [string, ...string[]]);

export function getFavoriteGamesKey(userId: string): string {
  return `userFavoriteGames:${userId}`;
}

export function getFavoriteGamesCategoryKey(userId: string): string {
  return `userFavoriteGamesCategory:${userId}`;
}

export const gamesConfiguration = {
  disallowedProviders: [] as string[],
  tableGames: [
    // American Blackjack - PragmaticPlay
    '980357dab44947d79610b15535bebc98',
    // Baccarat - PragmaticPlay
    '70321d67752243118849d54250580765',
    // Multihand Blackjack - PragmaticPlay
    'a9bf613c332944c1bac42909b6162048',
    // Roulette - PragmaticPlay
    'fc9ed97d23d045ffb1ad6c76af6d3790',
    // American Roulette - BGaming
    '97b44e87f1ae3b71dc5c7e92913cc77234a1580e',
    // Multihand Blackjack Pro - BGaming
    '27edf85d499c935982b9ced360157b2569a012dc',
    // European Roulette - BGaming
    'c732011a78e064eebb47e077cbfb6c8e8283843d',
    // French Roulette - BGaming
    '5026e867f9101af117d2fb0ca192e1730f7f737a',
    // Multihand Blackjack - BGaming
    'c82de21cc34b6d1e388bba87b0b2b4b2d05c7e69',
    // // Space XY - BGaming
    // 'f10da42ab4693d959775180a33b5c7ff51e3cde9',
    // // DRAGON'S CRASH - BGaming
    // '2b77f20b9003476e9939daa6d2792cce',
    // Vulcano Roulette - GameArt
    'e82b347ea04e429aa03d4b00f6f1b699',
    // Roulette Classic 97 - IronDogTable
    '0c2813a8455854cd2ad748e00db27e37eb90a315',
  ],
  liveCasino: [
    // Zeppelin - Betsolutions
    // 'cd0128cf16a2fd94d1b7546657f64d94080956be',

    // Crazy Time - Evoluton2
    'b771a7c4f2285943a1d7562bbe6ce05f',
  ],
  web3Games: [
    // Spribe Trader
    'a8449e80bdec2429bd71fc1d33db4eb6aff250de',

    // Minesweeper - BGaming"
    '34e4dad686571ec3c91fba121215fbc98f117a47',

    // Minesweeper XY - BGaming"
    'b8d010004f84d5de112ee2ef9bf9badf6e4d31d9',

    // Aviator - Spribe:
    '3193817929df4f8481eb141698d331f0',

    // Mines - Betsolutions:
    '454d59f1a8eb1546433bf2440519f89644880f4c',

    // Plinko - Betsolutions:
    'bced615f3ff1482972e7246597e3230f0b0b67be',

    // Hamsta - Turbogames:
    'f74c230b916945d190ec4f54d6a08da7',

    // Towers - Turbogames:
    '5ec8feec03d44efda9d8d0558bf65b40',

    // Aviator:
    '5b1b299bf4f04b9f84643730a882e682',

    // Mines:
    'c8afa9b2a85bf5e9770eb8406c15e8e79b91d752',
    '09a100111e5146b6ab12b7fe9f38c1d2',
    'e0b0ef1264684a1588c7586b885333a6',
    '400dee13a1a2457f9588aed8b156b67a',
    '6457d7fb0ef6f1cce8fbbb220812e484e43ba505',
    'e16daf75ba6d5fe76a6bdcb543d23454a244948f',
    'f248d480ac5692f1fb17811d0fa11458a3427230',

    // Limbo:
    '556d8ef93573468692ab5c9e935ab1ef',

    // Plinko:
    'd3ea2911ae7c4a1c8230117db0295318',
    '238a7e5d784c4040ac42fd8f571a7019',
    'e2d3b1e6bf61857a9f14104b5769275033381637',
    '6c2a42ea006388718232896f6ad1fa4084ce9a88',
    'add867407ba051683c4444514b066db8240101df',

    //  Hotline:
    'e2d95478ee098d57241508b561a21d86a8906345',
    'e276f517ffce4454660c01cad41e84bc4459b6f8',

    '4e4bd2efa0424324b3dd4c9475d9c65b',
    '9822120a0a7246b688cad228579c4c93',

    '9eee9764948c4c300c1c575b7fdb36d0478a016e',
    '8a9799c0cdfec1834ef0023b38fc21b07aa71bc6',
    '2dba096b6001e9230e46a4bfa13577f17ebcaf43',
    'bae542065f1bc52a41f9362e0eb161c4814c7c5d',
    '7c34301b8c194a99a80bf1082f353bdd',
    '757663a84be64057b93ceda00fb4027e',
    '2d5cbf3324ce48f5a5df720c16a4e8e0',
    '185f0378c4c84501909265f9b502b761',
    '267242f074513afe257c7b5fb9908e9cd63c7ccf',
    'ccab808332d0b054d7c121684ee533149053a00f',
    '0f9ba6277de545427dd64656115148eac595ab28',

    // Spaceman - PragmaticPlay
    '3411729144840da3eef10f613c4f140f9c1db699',
    // Big Bass Crash - PragmaticPlay
    '1209a101a43b49918232c26301c147c8',
    // High Flyer - PragmaticPlay
    '930c4ac198024823bfc771c1cd9499e3',
    // Yellow Diver - GameArt
    '7ac04259939643059f10aaa1b785695e',
  ],
  frontPageSelection: {
    [GameTypes.LIVE]: [
      '3a120c12e78edbf77a954ec8a1d5d97be6b09fe8',
      '18504c52ea2c4f63b0b4d889f5ccd58c',
      'b771a7c4f2285943a1d7562bbe6ce05f',
      'b23a4ab032c88e206ed066b54db51371489d1a90',
      '05d4037db548da4beff0cb929dadc7f4024d7957',
      '0cbd3e5d08d141439a34e475c1426416',
      'f9a89f081fcc4b6aab235f7465fff4c6',
      'ae26847c79d64a855008ed18b007b74b1fa168f1',
      'f5477233821dcbe2367df4237f18fbac5b506b84',
      'f2da0e82e4b75724d2fffb51aca14434ddd6864b',
      '97b44e87f1ae3b71dc5c7e92913cc77234a1580e',
      '6ed1a261412f4d53845d9abf409be86d',
      '6043ac76f4de4b008d233b3e8d1203af',
      '7d608830b031b43cded3abbbb3719448adff3668',
      'da3e63886e304c36b42688ff07167a05',
      'f0405541cacc44e388e359f2c8863b18',
      '69eb6ce1a9b8409f9e115601c37947cb',
      '7c4e69a38f2047ed9525479209350ed8',
      '251eb4a40ec04df69e4e7fdde999d8be',
    ],
    [GameTypes.SLOTS]: [
      '0b6e2e38d76c4a40bf6ab7235f92c5e7',
      'f5470d59bedf4dfca216bb37f8c2e3ff',
      '5878c98bf96de5c3ecb4fa37ddb45928da161525',
      '260d4a6e9f99c91940517ac650330683f6f42408',
      'd8f118e9bfd01ace4f417a8adf3c72845788a658',
      'a90e2dfc927a7af291051b192c0ab32376cc5c2d',
      '70b4d615e17f49a78986cb07b284b3ed',
      '4276225f34e64fc6ae7454e6970d28e7',
      'c77c98f91cda405fb431a1c131f964a0',
      '092381c082ff4a9bbc711f7f5a64015a',
      '0af9e9998d2c46508d8dacff4bf9df08',
      'c7b004b83a3f46258c48aed886bfa296',
      '8b5b4d84ecf045f593bd4ece2fde6803',
      '1b809c01e6cc4519b5eb21501617e50e',
      'cb7c3a27854b44d6b7494e7ee5b5cd53',
      'c57279177495456591aedf3a4745af8f',

      '5167257ad69e4abd83d06ce4d1da7193',

      '0a1cee5d002548049cc556387d02a71f',
      '370d1b5090f649ae8de5a96e7d566cb9',
      'becf6cd289196c214e22432084284cbdd350c970',
      '2c7caa9fe8f9579bef45ad6eff7c2f332738b8dc',
      '01b0904cc4ff45d589cc9bacd5d715eb',
      '5564522b0ebf4d58969bfe32540a01db',
    ],
    [GameTypes.TABLE]: [
      '85976a222d28143547b14b142e82a96a26c56b14',
      '64e1a927fbfa282aa0dc54421e86abdbfa1b83cb',
      '640a01e273eb13ed2d4cbe0d701c7dcbb2316983',
      'c23e8fc13fe0c1c73e969af695ec6ba60bb02e30',
      'fd5dbf4f338996e1ce60f50f8ac32862a568c8e1',
      '5973481b155873bd273b5ecc239c70c803a8bd9f',
      '54a421fa87f741a6b432401ae90608d3',
      'fb5d85130a4d4d50bc70b7128b80dbf0',
      'ce9165185c0bda49bfafce5495760b08fe1dc77e',
      '7c1b4168d08465dbef567a559297de81184bdc76',
      'f3ccb3264d00dcd521152eef0de9f7a289d9ec68',
      '90156c1c002f4ec4a91e6cdade16ac22',
      'd76f36748cfc40b49101b31ed4612975',
      '51653dc533f54c389c794a8f38e2ba36',
      '66055b61a4d544ed90e91e7802f2316a',
      '9a82dbde84ab47a9945d9b6cbc316293',
      'b93b3418b10048d1a5b56a256081fe28',
    ],
  },
};
