// Types for the golden memory annotation tool

export interface MemoryEvidence {
  session_id: string;
  utterance_index: number;
  text: string;
}

export interface GoldenMemory {
  memory_id: string;
  type: 'direct' | 'indirect';
  label: string;
  label_suggestion: string | null;
  value: string;
  reasoning: string;
  evidence: MemoryEvidence;
  confidence: number;
  time_scope: string;
  emotion: string | null;
  preference_attitude: string | null;
  updated_at: string;
}

export interface LlmMemoryItem {
  memory_id: string;
  type: string;
  label: string;
  label_suggestion?: string | null;
  value: string;
  confidence: number;
  evidence_text: string;
}

export interface LlmOutput {
  source_result_file: string;
  raw_output: string;
  memory_items: LlmMemoryItem[];
}

export interface DialogueTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface SessionData {
  task: string;
  canonical_id: string;
  session_id: string;
  stratum: string;
  stratum_source: string;
  source_dataset_file: string | null;
  dialogue: DialogueTurn[];
  memory_extraction_query: string;
  golden_answer: GoldenMemory[];
  llm_outputs: Record<string, LlmOutput>;
  llm_as_judge_results: unknown;
  metadata: unknown;
}

export interface AnnotatedSession {
  sessionKey: string; // e.g. "sess_xxx__123"
  golden_answer: GoldenMemory[];
  status: 'pending' | 'in_progress' | 'done';
  updatedAt: string;
}
