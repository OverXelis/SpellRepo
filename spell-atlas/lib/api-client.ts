'use client';

import type { RuneKind, SpellRecord, SpellStatus, TagInfo } from '@/lib/core/types';
import type { Taxonomy } from '@/lib/db/taxonomy';
import type { SearchFilters, SearchResult } from '@/lib/db/spells';

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function fetchTaxonomy(): Promise<Taxonomy> {
  return jsonFetch('/api/taxonomy');
}

export function searchSpellsApi(filters: SearchFilters): Promise<SearchResult> {
  const params = new URLSearchParams();
  if (filters.query) params.set('query', filters.query);
  if (filters.tags?.length) params.set('tags', filters.tags.join(','));
  if (filters.tagMode) params.set('tagMode', filters.tagMode);
  if (filters.circleBase) params.set('circleBase', filters.circleBase);
  if (filters.primaryRune) params.set('primaryRune', filters.primaryRune);
  if (filters.modifierRunes?.length) params.set('modifierRunes', filters.modifierRunes.join(','));
  if (filters.controlRune) params.set('controlRune', filters.controlRune);
  if (filters.status) params.set('status', filters.status);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.offset) params.set('offset', String(filters.offset));
  return jsonFetch(`/api/spells?${params.toString()}`);
}

export function getSpell(id: string): Promise<SpellRecord> {
  return jsonFetch(`/api/spells/${id}`);
}

export function updateSpellApi(
  id: string,
  patch: Partial<{ status: SpellStatus; description: string; customName: string; summary: string; tags: string[] }>
): Promise<SpellRecord> {
  return jsonFetch(`/api/spells/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export function deleteSpellApi(id: string): Promise<{ success: boolean }> {
  return jsonFetch(`/api/spells/${id}`, { method: 'DELETE' });
}

export function addRuneApi(kind: RuneKind, name: string): Promise<{ addedCount: number; batchId: string }> {
  return jsonFetch('/api/runes', { method: 'POST', body: JSON.stringify({ kind, name }) });
}

export function getRuneAffectedCountApi(kind: RuneKind, name: string): Promise<{ affectedSpellCount: number }> {
  return jsonFetch(`/api/runes/${kind}/${encodeURIComponent(name)}`);
}

export function removeRuneApi(kind: RuneKind, name: string): Promise<{ removedSpellCount: number }> {
  return jsonFetch(`/api/runes/${kind}/${encodeURIComponent(name)}`, { method: 'DELETE' });
}

export function renameRuneApi(kind: RuneKind, name: string, newName: string): Promise<{ success: boolean }> {
  return jsonFetch(`/api/runes/${kind}/${encodeURIComponent(name)}`, { method: 'PATCH', body: JSON.stringify({ newName }) });
}

export function setRuneDisplayNameApi(kind: RuneKind, name: string, displayName: string): Promise<{ success: boolean }> {
  return jsonFetch(`/api/runes/${kind}/${encodeURIComponent(name)}`, { method: 'PATCH', body: JSON.stringify({ displayName }) });
}

export function setModifierPairNameApi(mod1: string, mod2: string, displayName: string): Promise<{ success: boolean }> {
  return jsonFetch('/api/runes/pair-name', { method: 'POST', body: JSON.stringify({ mod1, mod2, displayName }) });
}

export function undoLastBatchApi(): Promise<{ id: string; type: RuneKind; runeName: string; spellIds: string[] }> {
  return jsonFetch('/api/runes/undo', { method: 'POST' });
}

export function fetchTags(): Promise<TagInfo[]> {
  return jsonFetch('/api/tags');
}

export function addTagApi(name: string, category?: string | null): Promise<{ success: boolean }> {
  return jsonFetch('/api/tags', { method: 'POST', body: JSON.stringify({ name, category }) });
}

export function renameTagApi(name: string, newName: string): Promise<{ success: boolean }> {
  return jsonFetch(`/api/tags/${encodeURIComponent(name)}`, { method: 'PATCH', body: JSON.stringify({ newName }) });
}

export function setTagCategoryApi(name: string, category: string | null): Promise<{ success: boolean }> {
  return jsonFetch(`/api/tags/${encodeURIComponent(name)}`, { method: 'PATCH', body: JSON.stringify({ category }) });
}

export function removeTagApi(name: string): Promise<{ success: boolean }> {
  return jsonFetch(`/api/tags/${encodeURIComponent(name)}`, { method: 'DELETE' });
}

export async function importDatabase(jsonText: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetch('/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: jsonText });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { success: false, error: data.error };
  }
  return { success: true };
}
