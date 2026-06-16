export type EscrowStatus = 'pending' | 'funded' | 'released' | 'refunded' | 'disputed';

export interface Escrow {
  id: string;
  jobId: string;
  contractId: string;
  amount: string;
  asset: 'XLM' | 'USDC';
  status: EscrowStatus;
  fundedAt?: string;
  releasedAt?: string;
}
