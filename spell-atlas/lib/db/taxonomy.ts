import type Database from 'better-sqlite3';
import { getRuneLists, getRuneMeanings, getRuneNameConfig } from '@/lib/db/naming';
import { getAllTags } from '@/lib/db/tags';
import { countAllSpells, countByStatus } from '@/lib/db/spells';
import type { RuneLists, RuneMeaningConfig, RuneNameConfig, TagInfo } from '@/lib/core/types';

export interface Taxonomy {
  runeLists: RuneLists;
  runeNameConfig: RuneNameConfig;
  runeMeanings: RuneMeaningConfig;
  tags: TagInfo[];
  tagCategories: string[];
  totalSpellCount: number;
  statusCounts: { normal: number; favorite: number; dud: number };
}

/**
 * Assembles the "shape of the database" -- every distinct rune, its display
 * name, every tag (with usage counts and optional category), and aggregate
 * counts. This object is always small (bounded by the number of *distinct*
 * runes/tags, not the number of spells), so it's safe to hand to the AI
 * chat in full at the start of every conversation as orientation, letting
 * it choose sensible filters before it ever calls search_spells.
 */
export function getTaxonomy(db: Database.Database): Taxonomy {
  const tags = getAllTags(db);
  const tagCategories = Array.from(new Set(tags.map((t) => t.category).filter((c): c is string => Boolean(c)))).sort();

  return {
    runeLists: getRuneLists(db),
    runeNameConfig: getRuneNameConfig(db),
    runeMeanings: getRuneMeanings(db),
    tags,
    tagCategories,
    totalSpellCount: countAllSpells(db),
    statusCounts: countByStatus(db),
  };
}
