'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Taxonomy } from '@/lib/db/taxonomy';
import { fetchTaxonomy } from '@/lib/api-client';
import { RunePanel } from '@/components/rune-panel';
import { TagManager } from '@/components/tag-manager';
import { SpellTable } from '@/components/spell-table';

export default function BuilderPage() {
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setError(null);
    fetchTaxonomy()
      .then(setTaxonomy)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load the database'));
  }, []);

  useEffect(() => {
    // Standard fetch-on-mount pattern -- see the equivalent, more detailed
    // comment in components/spell-table.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100">Spell Database</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {taxonomy
            ? `${taxonomy.totalSpellCount} spells · ${taxonomy.statusCounts.favorite} favorites · ${taxonomy.statusCounts.dud} duds`
            : error
            ? null
            : 'Loading...'}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
          <p className="font-medium">Couldn&apos;t load the database.</p>
          <p className="mt-1 text-red-400">{error}</p>
          <p className="mt-2 text-xs text-red-500">
            Check the server/container logs for the full error. Common causes: the SQLite data directory isn&apos;t
            writable by the container user, or the volume mount is misconfigured.
          </p>
          <button
            onClick={reload}
            className="mt-3 rounded border border-red-800 px-3 py-1 text-xs text-red-200 hover:bg-red-900/40"
          >
            Retry
          </button>
        </div>
      )}

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
