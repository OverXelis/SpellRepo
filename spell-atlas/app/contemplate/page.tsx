'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Taxonomy } from '@/lib/db/taxonomy';
import type { GeneratedReviewBatch } from '@/lib/generated-review';
import { clearReviewBatches, loadReviewBatches, saveReviewBatches } from '@/lib/generated-review';
import { fetchTaxonomy, getSpell, type BulkDudResponse } from '@/lib/api-client';
import { BatchGeneratePanel } from '@/components/batch-generate-panel';
import { BulkDudPanel } from '@/components/bulk-dud-panel';
import { GeneratedReviewTable } from '@/components/generated-review-table';

export default function ContemplatePage() {
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewBatches, setReviewBatches] = useState<GeneratedReviewBatch[]>([]);

  const reload = useCallback(() => {
    setError(null);
    fetchTaxonomy()
      .then(setTaxonomy)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load the database'));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    setReviewBatches(loadReviewBatches());
  }, [reload]);

  const handleClearAll = () => {
    clearReviewBatches();
    setReviewBatches([]);
  };

  const commitReviewBatches = useCallback((next: GeneratedReviewBatch[]) => {
    saveReviewBatches(next);
    setReviewBatches(next);
  }, []);

  const handleClearBatch = (batchId: string) => {
    commitReviewBatches(reviewBatches.filter((batch) => batch.id !== batchId));
  };

  const handleEntryUpdated = async (spellId: string) => {
    const spell = await getSpell(spellId);
    commitReviewBatches(
      reviewBatches.map((batch) => ({
        ...batch,
        entries: batch.entries.map((entry) =>
          entry.id === spellId
            ? {
                ...entry,
                name: spell.customName.trim() || entry.name,
                summary: spell.summary,
                description: spell.description,
                tags: spell.tags,
                status: spell.status,
              }
            : entry
        ),
      }))
    );
    reload();
  };

  const handleBulkDudsApplied = (result: BulkDudResponse) => {
    const updated = new Set(result.updatedIds ?? []);
    if (updated.size > 0) {
      commitReviewBatches(
        reviewBatches.map((batch) => ({
          ...batch,
          entries: batch.entries.map((entry) =>
            updated.has(entry.id)
              ? {
                  ...entry,
                  name: result.customName,
                  summary: result.text,
                  description: result.text,
                  tags: [],
                  status: 'dud' as const,
                }
              : entry
          ),
        }))
      );
    }
    reload();
  };

  return (
    <div className="page-shell space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">Contemplate Meaning</h1>
          <p className="page-subtitle">
            Batch-generate spell names and descriptions, then review what the model produced before diving back into the
            Builder. Incompatible pairings may be marked as duds, and technically-working but extremely narrow uses as
            niche, rather than forced into generally useful spells.
          </p>
        </div>
        {taxonomy && (
          <div className="flex flex-wrap gap-2">
            <span className="ui-badge ui-badge-accent">{taxonomy.totalSpellCount} spells</span>
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
          <button onClick={reload} className="ui-btn-sm ui-btn-danger mt-3">
            Retry
          </button>
        </div>
      )}

      {taxonomy && (
        <>
          <BulkDudPanel runeLists={taxonomy.runeLists} onApplied={handleBulkDudsApplied} />
          <BatchGeneratePanel
            runeLists={taxonomy.runeLists}
            reviewBatches={reviewBatches}
            onDataChanged={reload}
            onReviewUpdated={setReviewBatches}
          />
          <GeneratedReviewTable
            batches={reviewBatches}
            availableTags={taxonomy.tags.map((tag) => tag.name)}
            onClearAll={handleClearAll}
            onClearBatch={handleClearBatch}
            onEntryUpdated={handleEntryUpdated}
          />
        </>
      )}
    </div>
  );
}
