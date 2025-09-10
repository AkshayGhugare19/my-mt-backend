export type PriceConversionResponse = {
  data: {
    symbol: string;
    id: string;
    name: string;
    amount: number;
    last_updated: string;
    quote: {
      [currency: string]: {
        price: number;
        last_updated: string;
      };
    };
  };
  status: {
    timestamp: string;
    error_code: number;
    error_message: string;
    elapsed: number;
    credit_count: number;
    notice: string;
  };
};
