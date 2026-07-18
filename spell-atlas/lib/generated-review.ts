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
/** Keep the checklist bounded so localStorage quota cannot wipe newer runs. */
const MAX_BATCHES = 8;
const MAX_DESCRIPTION_CHARS = 500;

function compactEntry(entry: GeneratedReviewEntry): GeneratedReviewEntry {
  const description = entry.description ?? '';
  return {
    ...entry,
    description:
      description.length > MAX_DESCRIPTION_CHARS
        ? `${description.slice(0, MAX_DESCRIPTION_CHARS)}…`
        : description,
  };
}

function compactBatches(batches: GeneratedReviewBatch[]): GeneratedReviewBatch[] {
  return batches.slice(0, MAX_BATCHES).map((batch) => ({
    ...batch,
    entries: batch.entries.map(compactEntry),
  }));
}

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
      try {
        localStorage.setItem(STORAGE_KEY, raw);
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // Keep reading from sessionStorage if localStorage is unavailable.
      }
    }
    return parsed;
  } catch {
    return [];
  }
}

export function saveReviewBatches(batches: GeneratedReviewBatch[]): void {
  if (typeof window === 'undefined') return;
  const compacted = compactBatches(batches);
  const payload = JSON.stringify(compacted);
  try {
    localStorage.setItem(STORAGE_KEY, payload);
    sessionStorage.removeItem(STORAGE_KEY);
    return;
  } catch {
    // Quota or private-mode restrictions -- fall through and retry smaller.
  }

  // Retry with fewer batches if storage is tight.
  for (const limit of [4, 2, 1]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compacted.slice(0, limit)));
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    } catch {
      // keep trying
    }
  }

  // Last resort: keep an in-tab copy so the current session can still review.
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(compacted.slice(0, 1)));
  } catch {
    // Persistence unavailable; React state still holds the review list.
  }
}

export function clearReviewBatches(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
}

export function displaySpellName(entry: Pick<GeneratedReviewEntry, 'name'>): string {
  return entry.name.trim() || 'Untitled spell';
}
