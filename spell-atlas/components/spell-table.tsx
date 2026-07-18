'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RuneLists, SpellStatus, TagInfo } from '@/lib/core/types';
import type { SearchFilters, SearchResult } from '@/lib/db/spells';
import { deleteSpellApi, importDatabase, searchSpellsApi } from '@/lib/api-client';
import { SpellDetailRow } from '@/components/spell-detail-row';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  StarIcon,
} from '@/components/ui/icons';

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
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query);
      setOffset(0);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

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

  const activeFilterCount = [status, tagFilter, circleBase, primaryRune, modifierRune, controlRune].filter(Boolean).length;
  const hasFilters = query || activeFilterCount > 0;

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

  const filterControls = (
    <>
      <select
        value={status}
        onChange={(e) => withPageReset(setStatus)(e.target.value as SpellStatus | '')}
        className="ui-select-sm w-full sm:w-auto"
      >
        <option value="">All status</option>
        <option value="favorite">Favorites</option>
        <option value="normal">Normal</option>
        <option value="dud">Duds</option>
      </select>
      <select
        value={tagFilter}
        onChange={(e) => withPageReset(setTagFilter)(e.target.value)}
        className="ui-select-sm w-full sm:w-auto"
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
        className="ui-select-sm w-full sm:w-auto"
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
        className="ui-select-sm w-full sm:w-auto"
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
        className="ui-select-sm w-full sm:w-auto"
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
        className="ui-select-sm w-full sm:w-auto"
      >
        <option value="">All control</option>
        <option value="none">No control</option>
        {runeLists.controlRunes.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="ui-panel space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, summary, description, tags, runes..."
            className="ui-input flex-1"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              className="ui-btn-sm ui-btn-secondary lg:hidden"
            >
              {filtersOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
              Filters
              {activeFilterCount > 0 && (
                <span className="ui-badge ui-badge-accent ml-1">{activeFilterCount}</span>
              )}
            </button>
            {hasFilters && (
              <button onClick={clearFilters} className="ui-btn-sm ui-btn-ghost">
                Clear
              </button>
            )}
          </div>
        </div>

        <div className={`grid gap-2 sm:grid-cols-2 lg:grid-cols-3 ${filtersOpen ? 'grid' : 'hidden lg:grid'}`}>
          {filterControls}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-3">
          <button onClick={handleExport} className="ui-btn-sm ui-btn-secondary">
            Export JSON
          </button>
          <label className="ui-btn-sm ui-btn-secondary cursor-pointer">
            Import
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
          <span className="ml-auto text-xs text-foreground-subtle">
            {result
              ? `${result.totalMatches} spell${result.totalMatches === 1 ? '' : 's'} match${hasFilters ? 'ing filters' : ''}`
              : loadError
              ? null
              : 'Loading...'}
          </span>
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-900 bg-danger-muted p-3 text-sm text-red-200">
          <p className="font-medium">Couldn&apos;t load spells: {loadError}</p>
          <button onClick={load} className="ui-btn-sm ui-btn-danger mt-2">
            Retry
          </button>
        </div>
      )}

      <div className="hidden overflow-hidden rounded-lg border border-border md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-raised text-left text-xs uppercase tracking-wide text-foreground-subtle">
              <tr>
                <th className="w-8 px-3 py-2.5"></th>
                <th className="px-3 py-2.5">Spell</th>
                <th className="px-3 py-2.5">Circle</th>
                <th className="px-3 py-2.5">Primary</th>
                <th className="px-3 py-2.5">Modifiers</th>
                <th className="px-3 py-2.5">Control</th>
                <th className="px-3 py-2.5">Tags</th>
                <th className="w-10 px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {loading && !result && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-foreground-subtle">
                    Loading...
                  </td>
                </tr>
              )}
              {result && result.results.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-foreground-subtle">
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
      </div>

      <div className="space-y-3 md:hidden">
        {loading && !result && <p className="text-sm text-foreground-subtle">Loading...</p>}
        {result && result.results.length === 0 && (
          <p className="rounded-lg border border-border bg-surface p-4 text-sm text-foreground-subtle">
            No spells match. {hasFilters ? 'Try clearing filters.' : 'Add a rune to generate some.'}
          </p>
        )}
        {result?.results.map((spell) => (
          <SpellCard
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
      </div>

      {result && result.totalMatches > 0 && (
        <div className="flex flex-col gap-3 text-sm text-foreground-muted sm:flex-row sm:items-center sm:justify-between">
          <span>
            Showing {offset + 1}-{offset + result.results.length} of {result.totalMatches}
          </span>
          <div className="flex gap-2">
            <button
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              className="ui-btn-sm ui-btn-secondary disabled:opacity-30"
            >
              <ChevronLeftIcon />
              Prev
            </button>
            <button
              disabled={!result.hasMore}
              onClick={() => setOffset(offset + PAGE_SIZE)}
              className="ui-btn-sm ui-btn-secondary disabled:opacity-30"
            >
              Next
              <ChevronRightIcon />
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
  return (
    <>
      <tr onClick={onToggle} className="cursor-pointer border-t border-border-subtle hover:bg-surface-hover/60">
        <td className="px-3 py-2.5 text-foreground-subtle">
          {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </td>
        <SpellCells spell={spell} />
        <td className="px-3 py-2.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded p-1 text-foreground-subtle hover:bg-danger-muted hover:text-red-300"
            title="Delete spell"
            aria-label={`Delete ${spell.name}`}
          >
            <CloseIcon />
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-t border-border-subtle bg-surface-raised/50">
          <td colSpan={8} className="px-3 py-4">
            <SpellDetailRow spellId={spell.id} availableTags={availableTags} onSaved={onSaved} />
          </td>
        </tr>
      )}
    </>
  );
}

function SpellCard({
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
  return (
    <div className="rounded-lg border border-border bg-surface">
      <button type="button" onClick={onToggle} className="w-full p-4 text-left">
        <div className="flex items-start justify-between gap-3">
          <div>
            <SpellName spell={spell} />
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-foreground-muted">
              <span>Circle: {spell.circleBase}</span>
              <span>Primary: {spell.primaryRune}</span>
              <span>Modifiers: {spell.modifierRunes.join(', ') || 'none'}</span>
              <span>Control: {spell.controlRune || 'none'}</span>
            </div>
            {spell.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {spell.tags.map((t) => (
                  <span key={t} className="ui-badge ui-badge-muted">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </div>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-border-subtle p-4">
          <SpellDetailRow spellId={spell.id} availableTags={availableTags} onSaved={onSaved} />
          <button onClick={onDelete} className="ui-btn-sm ui-btn-danger mt-3">
            Delete spell
          </button>
        </div>
      )}
    </div>
  );
}

function SpellName({ spell }: { spell: SearchResult['results'][number] }) {
  const statusClass =
    spell.status === 'favorite'
      ? 'text-warning'
      : spell.status === 'dud'
      ? 'text-red-400/80 line-through'
      : 'text-foreground';

  return (
    <div className={`flex items-center gap-1.5 font-medium ${statusClass}`}>
      {spell.status === 'favorite' && <StarIcon filled className="text-warning" />}
      {spell.name}
    </div>
  );
}

function SpellCells({ spell }: { spell: SearchResult['results'][number] }) {
  return (
    <>
      <td className="px-3 py-2.5">
        <SpellName spell={spell} />
      </td>
      <td className="px-3 py-2.5 text-foreground-muted">{spell.circleBase}</td>
      <td className="px-3 py-2.5 text-foreground-muted">{spell.primaryRune}</td>
      <td className="px-3 py-2.5 text-foreground-muted">{spell.modifierRunes.join(', ') || 'none'}</td>
      <td className="px-3 py-2.5 text-foreground-muted">{spell.controlRune || 'none'}</td>
      <td className="px-3 py-2.5 text-foreground-muted">
        <div className="flex flex-wrap gap-1">
          {spell.tags.map((t) => (
            <span key={t} className="ui-badge ui-badge-muted">
              {t}
            </span>
          ))}
        </div>
      </td>
    </>
  );
}
