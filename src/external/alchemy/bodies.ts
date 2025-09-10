export type AssetTransfersBody = {
  jsonrpc: string;
  id: number;
  method: string;
  params: {
    fromBlock?: string;
    toBlock?: string;
    fromAddress?: string;
    toAddress?: string;
    contractAddresses?: string[];
    category: ('external' | 'internal' | 'erc20' | 'erc721')[];
    order?: 'asc' | 'desc';
    withMetadata?: boolean;
    excludeZeroValue?: boolean;
    maxCount?: string;
    pageKey?: string;
  }[];
};
