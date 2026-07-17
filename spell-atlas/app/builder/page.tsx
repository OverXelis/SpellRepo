'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Taxonomy } from '@/lib/db/taxonomy';
import { fetchTaxonomy } from '@/lib/api-client';
import { RunePanel } from '@/components/rune-panel';
import { TagManager } from '@/components/tag-manager';
import { SpellTable } from '@/components/spell-table';

export default function BuilderPage() {
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);

  const reload = useCallback(() => {
    fetchTaxonomy().then(setTaxonomy);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100">Spell Database</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {taxonomy ? `${taxonomy.totalSpellCount} spells · ${taxonomy.statusCounts.favorite} favorites · ${taxonomy.statusCounts.dud} duds` : 'Loading...'}
        </p>
      </div>

      {taxonomy && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <RunePanel runeLists={taxonomy.runeLists} runeNameConfig={taxonomy.runeNameConfig} onChanged={reload} />
            <TagManager tags={taxonomy.tags} onChanged={reload} />
          </div>
          <SpellTable runeLists={taxonomy.runeLists} tags={taxonomy.tags} onDataChanged={reload} />
        </>
      )}
    </div>
  );
}
