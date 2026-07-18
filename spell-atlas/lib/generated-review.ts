export interface GeneratedReviewEntry {
  id: string;
  batchId: string;
  generatedAt: number;
  name: string;
  summary: string;
  description: string;
  tags: string[];
  generatedFields: string[];
  circleBase: string;
  primaryRune: string;
  modifierRunes: string[];
  controlRune: string | null;
}

export interface GeneratedReviewBatch {
  id: string;
  startedAt: number;
  completedAt?: number;
  entries: GeneratedReviewEntry[];
}

const STORAGE_KEY = 'spell-atlas-generated-review';

export function loadReviewBatches(): GeneratedReviewBatch[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GeneratedReviewBatch[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveReviewBatches(batches: GeneratedReviewBatch[]): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
}

export function clearReviewBatches(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export function displaySpellName(entry: Pick<GeneratedReviewEntry, 'name'>): string {
  return entry.name.trim() || 'Untitled spell';
}
