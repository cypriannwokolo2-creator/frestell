export interface ProposalDraft {
  id: string;
  jobId: string;
  freelancerId: string;
  text: string;
  suggestions: { section: string; suggestion: string; confidence: number }[];
}
