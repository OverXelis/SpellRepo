'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RuneLists, SpellStatus, TagInfo } from '@/lib/core/types';
import type { SearchFilters, SearchResult } from '@/lib/db/spells';
import { deleteSpellApi, importDatabase, searchSpellsApi } from '@/lib/api-client';
import { SpellDetailRow } from '@/components/spell-detail-row';

interface Props {
  runeLists: RuneLists;
  tags: TagInfo[];
  onDataChanged: () => void;
}

const PAGE_SIZE = 25;

export function SpellTable({ runeLists, tags, onDataChanged }: Props) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [status, setStatus] = useState<'' | SpellStatus>('');
  const [tagFilter, setTagFilter] = useState('');
  const [circleBase, setCircleBase] = useState('');
  const [primaryRune, setPrimaryRune] = useState('');
  const [modifierRune, setModifierRune] = useState('');
  const [controlRune, setControlRune] = useState('');
  const [offset, setOffset] = useState(0);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query);
      setOffset(0);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // Reset to the first page whenever a filter (other than the page itself)
  // changes. Setting state directly from onChange handlers (rather than
  // from an effect watching the filter values) avoids a synchronous
  // setState-in-effect render cascade.
  const withPageReset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setOffset(0);
  };

  const filters: SearchFilters = useMemo(
    () => ({
      query: debouncedQuery || undefined,
      status: status || undefined,
      tags: tagFilter ? [tagFilter] : undefined,
      circleBase: circleBase || undefined,
      primaryRune: primaryRune || undefined,
      modifierRunes: modifierRune ? [modifierRune] : undefined,
      controlRune: controlRune || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    [debouncedQuery, status, tagFilter, circleBase, primaryRune, modifierRune, controlRune, offset]
  );

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const r = await searchSpellsApi(filters);
      setResult(r);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load spells');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Standard fetch-on-filter-change pattern: `load` sets a loading flag
    // before awaiting the request. This is intentional (drives the "..."
    // indicator) and safe here since there's no concurrent-rendering
    // requirement in this app.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const clearFilters = () => {
    setQuery('');
    setStatus('');
    setTagFilter('');
    setCircleBase('');
    setPrimaryRune('');
    setModifierRune('');
    setControlRune('');
  };

  const hasFilters = query || status || tagFilter || circleBase || primaryRune || modifierRune || controlRune;

  const handleExport = () => {
    window.open('/api/export', '_blank');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const res = await importDatabase(text);
      if (res.success) {
        onDataChanged();
        load();
      } else {
        alert(res.error || 'Import failed');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, summary, description, tags, runes..."
          className="min-w-[16rem] flex-1 rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-100 outline-none focus:border-neutral-500"
        />
        <select
          value={status}
          onChange={(e) => withPageReset(setStatus)(e.target.value as SpellStatus | '')}
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm"
        >
          <option value="">All status</option>
          <option value="favorite">★ Favorites</option>
          <option value="normal">Normal</option>
          <option value="dud">Duds</option>
        </select>
        <select
          value={tagFilter}
          onChange={(e) => withPageReset(setTagFilter)(e.target.value)}
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm"
        >
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name} ({t.count})
            </option>
          ))}
        </select>
        <select
          value={circleBase}
          onChange={(e) => withPageReset(setCircleBase)(e.target.value)}
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm"
        >
          <option value="">All circle bases</option>
          {runeLists.circleBases.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select
          value={primaryRune}
          onChange={(e) => withPageReset(setPrimaryRune)(e.target.value)}
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm"
        >
          <option value="">All primary</option>
          {runeLists.primaryRunes.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          value={modifierRune}
          onChange={(e) => withPageReset(setModifierRune)(e.target.value)}
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm"
        >
          <option value="">All modifiers</option>
          {runeLists.modifierRunes.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          value={controlRune}
          onChange={(e) => withPageReset(setControlRune)(e.target.value)}
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm"
        >
          <option value="">All control</option>
          <option value="none">No control</option>
          {runeLists.controlRunes.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button onClick={clearFilters} className="rounded border border-neutral-700 px-2 py-1.5 text-xs text-neutral-400 hover:bg-neutral-800">
            Clear filters
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button onClick={handleExport} className="rounded border border-neutral-700 px-2 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800">
            Export JSON
          </button>
          <label className="cursor-pointer rounded border border-neutral-700 px-2 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800">
            Import
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
        </div>
      </div>

      <div className="text-xs text-neutral-500">
        {result
          ? `${result.totalMatches} spell${result.totalMatches === 1 ? '' : 's'} match${hasFilters ? 'ing filters' : ''}`
          : loadError
          ? null
          : 'Loading...'}
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
          <p className="font-medium">Couldn&apos;t load spells: {loadError}</p>
          <button onClick={load} className="mt-2 rounded border border-red-800 px-3 py-1 text-xs text-red-200 hover:bg-red-900/40">
            Retry
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2 w-8"></th>
              <th className="px-3 py-2">Spell</th>
              <th className="px-3 py-2">Circle</th>
              <th className="px-3 py-2">Primary</th>
              <th className="px-3 py-2">Modifiers</th>
              <th className="px-3 py-2">Control</th>
              <th className="px-3 py-2">Tags</th>
              <th className="px-3 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {loading && !result && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-neutral-500">
                  Loading...
                </td>
              </tr>
            )}
            {result && result.results.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-neutral-500">
                  No spells match. {hasFilters ? 'Try clearing filters.' : 'Add a rune to generate some.'}
                </td>
              </tr>
            )}
            {result?.results.map((spell) => (
              <SpellRowGroup
                key={spell.id}
                spell={spell}
                expanded={expandedId === spell.id}
                availableTags={tags.map((t) => t.name)}
                onToggle={() => setExpandedId(expandedId === spell.id ? null : spell.id)}
                onDelete={async () => {
                  if (confirm(`Delete "${spell.name}"?`)) {
                    await deleteSpellApi(spell.id);
                    load();
                  }
                }}
                onSaved={() => load()}
              />
            ))}
          </tbody>
        </table>
      </div>

      {result && result.totalMatches > 0 && (
        <div className="flex items-center justify-between text-sm text-neutral-400">
          <span>
            Showing {offset + 1}-{offset + result.results.length} of {result.totalMatches}
          </span>
          <div className="flex gap-2">
            <button
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              className="rounded border border-neutral-700 px-3 py-1 disabled:opacity-30"
            >
              ← Prev
            </button>
            <button
              disabled={!result.hasMore}
              onClick={() => setOffset(offset + PAGE_SIZE)}
              className="rounded border border-neutral-700 px-3 py-1 disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SpellRowGroup({
  spell,
  expanded,
  availableTags,
  onToggle,
  onDelete,
  onSaved,
}: {
  spell: SearchResult['results'][number];
  expanded: boolean;
  availableTags: string[];
  onToggle: () => void;
  onDelete: () => void;
  onSaved: () => void;
}) {
  const statusColor = spell.status === 'favorite' ? 'text-amber-400' : spell.status === 'dud' ? 'text-red-500/70 line-through' : 'text-neutral-100';

  return (
    <>
      <tr onClick={onToggle} className="cursor-pointer border-t border-neutral-800 hover:bg-neutral-900/60">
        <td className="px-3 py-2 text-neutral-500">{expanded ? '▾' : '▸'}</td>
        <td className={`px-3 py-2 font-medium ${statusColor}`}>
          {spell.status === 'favorite' && '★ '}
          {spell.name}
        </td>
        <td className="px-3 py-2 text-neutral-400">{spell.circleBase}</td>
        <td className="px-3 py-2 text-neutral-400">{spell.primaryRune}</td>
        <td className="px-3 py-2 text-neutral-400">{spell.modifierRunes.join(', ') || '—'}</td>
        <td className="px-3 py-2 text-neutral-400">{spell.controlRune || '—'}</td>
        <td className="px-3 py-2 text-neutral-400">
          <div className="flex flex-wrap gap-1">
            {spell.tags.map((t) => (
              <span key={t} className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px]">
                {t}
              </span>
            ))}
          </div>
        </td>
        <td className="px-3 py-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-neutral-500 hover:text-red-400"
            title="Delete spell"
          >
            ×
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-t border-neutral-800 bg-neutral-900/40">
          <td colSpan={8} className="px-3 py-3">
            <SpellDetailRow spellId={spell.id} availableTags={availableTags} onSaved={onSaved} />
          </td>
        </tr>
      )}
    </>
  );
}
