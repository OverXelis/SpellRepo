import type { SpellStatus } from '@/lib/core/types';

export interface GeneratedReviewEntry {
  id: string;
  batchId: string;
  generatedAt: number;
  name: string;
  summary: string;
  description: string;
  tags: string[];
  status?: SpellStatus;
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

/** Persist the review checklist in localStorage so it survives browser restarts
 * on the same device. Spell field edits themselves are saved to SQLite. */
export function loadReviewBatches(): GeneratedReviewBatch[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GeneratedReviewBatch[];
    if (!Array.isArray(parsed)) return [];
    // Migrate any older sessionStorage-only checklist into localStorage.
    if (!localStorage.getItem(STORAGE_KEY) && sessionStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, raw);
      sessionStorage.removeItem(STORAGE_KEY);
    }
    return parsed;
  } catch {
    return [];
  }
}

export function saveReviewBatches(batches: GeneratedReviewBatch[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
  sessionStorage.removeItem(STORAGE_KEY);
}

export function clearReviewBatches(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
}

export function displaySpellName(entry: Pick<GeneratedReviewEntry, 'name'>): string {
  return entry.name.trim() || 'Untitled spell';
}
