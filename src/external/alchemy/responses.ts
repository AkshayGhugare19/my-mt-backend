export type AssetTransfersResponse = {
  jsonrpc: string;
  id: number;
  result: {
    transfers: {
      blockNum: string;
      uniqueId: string;
      hash: string;
      from: string;
      to: string;
      value: number;
      asset: 'USDT' | 'ETH' | 'USDC';
      category: 'external' | 'internal' | 'erc20' | 'erc721';
      rawContract: {
        value: string;
        address: string;
        decimal: string;
      };

      metadata: {
        blockTimestamp: string;
      };
    }[];
    pageKey?: string;
  };
};
