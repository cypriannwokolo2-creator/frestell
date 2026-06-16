export type JobStatus = 'draft' | 'open' | 'in_progress' | 'submitted' | 'disputed' | 'completed' | 'cancelled';

export type AcceptanceCriterion = {
  id: string;
  description: string;
  done: boolean;
};

export interface Job {
  id: string;
  clientId: string;
  freelancerId?: string;
  title: string;
  description: string;
  budget: { amount: string; asset: 'XLM' | 'USDC' };
  status: JobStatus;
  acceptanceCriteria: AcceptanceCriterion[];
  createdAt: string;
  updatedAt: string;
}
