'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Taxonomy } from '@/lib/db/taxonomy';
import type { GeneratedReviewBatch } from '@/lib/generated-review';
import { clearReviewBatches, loadReviewBatches, saveReviewBatches } from '@/lib/generated-review';
import { fetchTaxonomy, getSpell } from '@/lib/api-client';
import { BatchGeneratePanel } from '@/components/batch-generate-panel';
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

  const handleClearBatch = (batchId: string) => {
    const next = loadReviewBatches().filter((batch) => batch.id !== batchId);
    saveReviewBatches(next);
    setReviewBatches(next);
  };

  const handleEntryUpdated = async (spellId: string) => {
    const spell = await getSpell(spellId);
    const next = loadReviewBatches().map((batch) => ({
      ...batch,
      entries: batch.entries.map((entry) =>
        entry.id === spellId
          ? {
              ...entry,
              name: spell.customName.trim() || entry.name,
              summary: spell.summary,
              description: spell.description,
              tags: spell.tags,
            }
          : entry
      ),
    }));
    saveReviewBatches(next);
    setReviewBatches(next);
    reload();
  };

  return (
    <div className="page-shell space-y-6">
      <div>
        <h1 className="page-title">Contemplate Meaning</h1>
        <p className="page-subtitle">
          Batch-generate spell names and descriptions, then review what the model produced before diving back into the
          Builder. Incompatible pairings may be marked as duds, and technically-working but extremely narrow uses as
          niche, rather than forced into generally useful spells.
        </p>
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
          <BatchGeneratePanel
            runeLists={taxonomy.runeLists}
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
