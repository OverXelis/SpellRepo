'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Taxonomy } from '@/lib/db/taxonomy';
import type { ContentFilter } from '@/lib/db/spells';
import { fetchTaxonomy } from '@/lib/api-client';
import { PageBanner } from '@/components/page-banner';
import { RunePanel } from '@/components/rune-panel';
import { TagManager } from '@/components/tag-manager';
import { SpellTable } from '@/components/spell-table';

export default function BuilderPage() {
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contentFilter, setContentFilter] = useState<'' | ContentFilter>('');

  const reload = useCallback(() => {
    setError(null);
    fetchTaxonomy()
      .then(setTaxonomy)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load the database'));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  const toggleContentFilter = (value: ContentFilter) => {
    setContentFilter((prev) => (prev === value ? '' : value));
  };

  return (
    <div className="page-shell space-y-6">
      <PageBanner />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Spell Database</h1>
          <p className="page-subtitle">Browse, filter, and edit spells in your atlas.</p>
        </div>
        {taxonomy && (
          <div className="flex flex-wrap gap-2">
            <span className="ui-badge ui-badge-accent">{taxonomy.totalSpellCount} spells</span>
            <button
              type="button"
              onClick={() => toggleContentFilter('filled')}
              className={`ui-badge ${contentFilter === 'filled' ? 'ui-badge-primary' : 'ui-badge-muted'} cursor-pointer`}
              title="Show spells with name, summary, and description filled in"
            >
              {taxonomy.contentCounts.filled} filled
            </button>
            <button
              type="button"
              onClick={() => toggleContentFilter('unfilled')}
              className={`ui-badge ${contentFilter === 'unfilled' ? 'ui-badge-primary' : 'ui-badge-muted'} cursor-pointer`}
              title="Show spells still missing name, summary, or description"
            >
              {taxonomy.contentCounts.unfilled} unfilled
            </button>
            <span className="ui-badge ui-badge-primary">{taxonomy.statusCounts.favorite} favorites</span>
            <span className="ui-badge ui-badge-muted">{taxonomy.statusCounts.niche} niche</span>
            <span className="ui-badge ui-badge-muted">{taxonomy.statusCounts.dud} duds</span>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-900 bg-danger-muted p-4 text-sm text-red-200">
          <p className="font-medium">Couldn&apos;t load the database.</p>
          <p className="mt-1 text-red-300">{error}</p>
          <p className="mt-2 text-xs text-red-400">
            Check the server/container logs for the full error. Common causes: the SQLite data directory isn&apos;t
            writable by the container user, or the volume mount is misconfigured.
          </p>
          <button onClick={reload} className="ui-btn-sm ui-btn-danger mt-3">
            Retry
          </button>
        </div>
      )}

      {taxonomy && (
        <>
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <RunePanel
              title="Circle bases and primary runes"
              kinds={['circleBase', 'primary']}
              showAddForm
              runeLists={taxonomy.runeLists}
              runeNameConfig={taxonomy.runeNameConfig}
              runeMeanings={taxonomy.runeMeanings}
              onChanged={reload}
            />
            <RunePanel
              title="Modifier and control runes"
              kinds={['modifier', 'control']}
              showModifierPairs
              runeLists={taxonomy.runeLists}
              runeNameConfig={taxonomy.runeNameConfig}
              runeMeanings={taxonomy.runeMeanings}
              onChanged={reload}
            />
          </div>

          <TagManager tags={taxonomy.tags} onChanged={reload} />

          <SpellTable
            runeLists={taxonomy.runeLists}
            tags={taxonomy.tags}
            onDataChanged={reload}
            contentFilter={contentFilter}
            onContentFilterChange={setContentFilter}
          />
        </>
      )}
    </div>
  );
}
