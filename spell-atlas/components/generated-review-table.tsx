'use client';

import { useMemo, useState } from 'react';
import type { GeneratedReviewBatch, GeneratedReviewEntry } from '@/lib/generated-review';
import { displaySpellName } from '@/lib/generated-review';
import { SpellDetailRow } from '@/components/spell-detail-row';
import { ChevronDownIcon, ChevronRightIcon } from '@/components/ui/icons';

interface Props {
  batches: GeneratedReviewBatch[];
  availableTags: string[];
  onClearAll: () => void;
  onClearBatch: (batchId: string) => void;
  onEntryUpdated: (spellId: string) => void;
}

export function GeneratedReviewTable({ batches, availableTags, onClearAll, onClearBatch, onEntryUpdated }: Props) {
  const totalEntries = useMemo(() => batches.reduce((sum, batch) => sum + batch.entries.length, 0), [batches]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (totalEntries === 0) {
    return (
      <div className="ui-panel">
        <h2 className="ui-panel-header">Recent contemplation</h2>
        <p className="mt-2 text-sm text-foreground-muted">
          Spells generated in your most recent batch runs will appear here for review. Run a batch above to begin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="ui-panel-header">Recent contemplation</h2>
          <p className="mt-1 text-sm text-foreground-muted">
            {totalEntries} spell{totalEntries === 1 ? '' : 's'} from your latest batch run{batches.length === 1 ? '' : 's'}.
            Entries are saved to the database as they are generated; review and edit here before moving on to the Builder.
          </p>
        </div>
        <button type="button" onClick={onClearAll} className="ui-btn-sm ui-btn-secondary">
          Clear review list
        </button>
      </div>

      {batches.map((batch) => (
        <div key={batch.id} className="ui-panel space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">
                Batch run
                <span className="ml-2 text-xs font-normal text-foreground-subtle">
                  {new Date(batch.startedAt).toLocaleString()}
                </span>
              </p>
              <p className="text-xs text-foreground-muted">
                {batch.entries.length} spell{batch.entries.length === 1 ? '' : 's'}
                {batch.completedAt ? ` -- finished ${new Date(batch.completedAt).toLocaleTimeString()}` : ''}
              </p>
            </div>
            <button type="button" onClick={() => onClearBatch(batch.id)} className="ui-btn-sm ui-btn-ghost">
              Dismiss batch
            </button>
          </div>

          <div className="hidden overflow-hidden rounded-lg border border-border md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-raised text-left text-xs uppercase tracking-wide text-foreground-subtle">
                  <tr>
                    <th className="w-8 px-3 py-2.5"></th>
                    <th className="px-3 py-2.5">Spell</th>
                    <th className="px-3 py-2.5">Summary</th>
                    <th className="px-3 py-2.5">Runes</th>
                    <th className="px-3 py-2.5">Tags</th>
                    <th className="px-3 py-2.5">Generated</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.entries.map((entry) => (
                    <ReviewRow
                      key={entry.id}
                      entry={entry}
                      expanded={expandedId === entry.id}
                      availableTags={availableTags}
                      onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                      onEntryUpdated={onEntryUpdated}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {batch.entries.map((entry) => (
              <ReviewCard
                key={entry.id}
                entry={entry}
                expanded={expandedId === entry.id}
                availableTags={availableTags}
                onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                onEntryUpdated={onEntryUpdated}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReviewRow({
  entry,
  expanded,
  availableTags,
  onToggle,
  onEntryUpdated,
}: {
  entry: GeneratedReviewEntry;
  expanded: boolean;
  availableTags: string[];
  onToggle: () => void;
  onEntryUpdated: (spellId: string) => void;
}) {
  return (
    <>
      <tr onClick={onToggle} className="cursor-pointer border-t border-border-subtle hover:bg-surface-hover/60">
        <td className="px-3 py-2.5 text-foreground-subtle">
          {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </td>
        <td className="px-3 py-2.5 font-medium text-foreground">{displaySpellName(entry)}</td>
        <td className="max-w-xs px-3 py-2.5 text-foreground-muted">{entry.summary || '—'}</td>
        <td className="px-3 py-2.5 text-xs text-foreground-muted">
          {entry.circleBase} / {entry.primaryRune}
          {entry.modifierRunes.length > 0 ? ` / ${entry.modifierRunes.join(', ')}` : ''}
          {entry.controlRune ? ` / ${entry.controlRune}` : ''}
        </td>
        <td className="px-3 py-2.5">
          <div className="flex flex-wrap gap-1">
            {entry.tags.map((tag) => (
              <span key={tag} className="ui-badge ui-badge-muted">
                {tag}
              </span>
            ))}
          </div>
        </td>
        <td className="px-3 py-2.5 text-xs text-foreground-subtle">{entry.generatedFields.join(', ') || '—'}</td>
      </tr>
      {expanded && (
        <tr className="border-t border-border-subtle bg-surface-raised/50">
          <td colSpan={6} className="px-3 py-4">
            <ReviewExpanded entry={entry} availableTags={availableTags} onSaved={() => onEntryUpdated(entry.id)} />
          </td>
        </tr>
      )}
    </>
  );
}

function ReviewCard({
  entry,
  expanded,
  availableTags,
  onToggle,
  onEntryUpdated,
}: {
  entry: GeneratedReviewEntry;
  expanded: boolean;
  availableTags: string[];
  onToggle: () => void;
  onEntryUpdated: (spellId: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface">
      <button type="button" onClick={onToggle} className="w-full p-4 text-left">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium text-foreground">{displaySpellName(entry)}</p>
            <p className="mt-1 text-sm text-foreground-muted">{entry.summary || 'No summary yet'}</p>
            <p className="mt-2 text-xs text-foreground-subtle">
              {entry.circleBase} / {entry.primaryRune}
              {entry.modifierRunes.length > 0 ? ` / ${entry.modifierRunes.join(', ')}` : ''}
            </p>
          </div>
          {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-border-subtle p-4">
          <ReviewExpanded entry={entry} availableTags={availableTags} onSaved={() => onEntryUpdated(entry.id)} />
        </div>
      )}
    </div>
  );
}

function ReviewExpanded({
  entry,
  availableTags,
  onSaved,
}: {
  entry: GeneratedReviewEntry;
  availableTags: string[];
  onSaved: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border-subtle bg-background p-3 text-sm text-foreground-muted whitespace-pre-wrap">
        {entry.description || 'No description yet.'}
      </div>
      <SpellDetailRow spellId={entry.id} availableTags={availableTags} onSaved={onSaved} />
    </div>
  );
}
