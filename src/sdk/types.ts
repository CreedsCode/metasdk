import { type Action } from '@near-js/transactions';

export interface MetaTransaction {
  receiverId: string;
  actions: Action[];
  maxGas?: string;
}

export interface SubsidyRule {
  id: string;
  name: string;
  maxAmount: string;
  maxTransactionsPerUser: number;
  totalBudget: string;
  usedBudget: string;
}

export interface TransactionResult {
  status: 'success' | 'error';
  txHash?: string;
  error?: string;
}
