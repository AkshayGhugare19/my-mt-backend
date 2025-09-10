export type Instruction = {
  instructionIndex: number;
  innerInstructionIndex: number;
  action: 'pay_tx_fees' | 'transfer' | 'createAccount' | 'transferChecked';
  status: string;
  source: string;
  sourceAssociation: string;
  destination: string;
  destinationAssociation: string;
  token: string;
  amount: number;
  timestamp: number;
};

export type Transfer = {
  transactionHash: string;
  data: Instruction[];
};

export type AccountTransfersResponse = {
  status: string;
  message: string;
  results: Transfer[];
  pagination: {
    currentPage: number;
    totalPages: number;
  };
};
