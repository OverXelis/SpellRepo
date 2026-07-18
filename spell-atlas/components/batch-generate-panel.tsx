'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RuneLists } from '@/lib/core/types';
import type { GeneratedReviewBatch, GeneratedReviewEntry } from '@/lib/generated-review';
import { saveReviewBatches } from '@/lib/generated-review';
import { estimateGenerationCost, searchSpellsApi, type CostEstimate } from '@/lib/api-client';

interface Props {
  runeLists: RuneLists;
  onDataChanged: () => void;
  /** Current review checklist from parent React state (source of truth). */
  reviewBatches: GeneratedReviewBatch[];
  onReviewUpdated: (batches: GeneratedReviewBatch[]) => void;
}

interface LogEntry {
  id: string;
  text: string;
  tone: 'success' | 'error' | 'warning' | 'info';
}

const DEFAULT_MAX_SPELLS = 25;
// Smaller batches keep Exempt / Channeling / Draining rules more reliable.
const DEFAULT_BATCH_SIZE = 10;

function createReviewBatch(): GeneratedReviewBatch {
  return {
    id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    startedAt: Date.now(),
    entries: [],
  };
}

export function BatchGeneratePanel({ runeLists, onDataChanged, reviewBatches, onReviewUpdated }: Props) {
  const [circleBase, setCircleBase] = useState('');
  const [primaryRune, setPrimaryRune] = useState('');
  const [maxSpells, setMaxSpells] = useState(DEFAULT_MAX_SPELLS);
  const [batchSize, setBatchSize] = useState(DEFAULT_BATCH_SIZE);

  const [availableCount, setAvailableCount] = useState<number | null>(null);
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [countLoading, setCountLoading] = useState(false);

  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const currentBatchRef = useRef<GeneratedReviewBatch | null>(null);
  // Keep an in-memory copy so stream updates never depend on localStorage
  // succeeding (quota / private mode can break setItem).
  const reviewBatchesRef = useRef<GeneratedReviewBatch[]>(reviewBatches);

  useEffect(() => {
    reviewBatchesRef.current = reviewBatches;
  }, [reviewBatches]);

  const scopeFilters = {
    circleBase: circleBase || undefined,
    primaryRune: primaryRune || undefined,
  };

  const syncReviewBatches = useCallback(
    (updater: (prev: GeneratedReviewBatch[]) => GeneratedReviewBatch[]) => {
      const prev = reviewBatchesRef.current;
      const next = updater(prev);
      reviewBatchesRef.current = next;
      saveReviewBatches(next);
      onReviewUpdated(next);
      return next;
    },
    [onReviewUpdated]
  );

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCountLoading(true);
    searchSpellsApi({ ...scopeFilters, needsEnrichment: true, limit: 1 })
      .then((r) => {
        if (cancelled) return;
        setAvailableCount(r.totalMatches);
        const effectiveCount = Math.min(r.totalMatches, maxSpells);
        return estimateGenerationCost(effectiveCount, batchSize).then((est) => {
          if (!cancelled) setEstimate(est);
        });
      })
      .catch(() => {
        if (!cancelled) {
          setAvailableCount(null);
          setEstimate(null);
        }
      })
      .finally(() => {
        if (!cancelled) setCountLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [circleBase, primaryRune, maxSpells, batchSize]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [log]);

  const appendLog = (text: string, tone: LogEntry['tone']) => {
    setLog((prev) => [...prev, { id: `${prev.length}-${Date.now()}`, text, tone }]);
  };

  const addReviewEntry = (entry: GeneratedReviewEntry) => {
    const batch = currentBatchRef.current;
    if (!batch) return;
    batch.entries.unshift(entry);
    syncReviewBatches((prev) => {
      const existing = prev.find((b) => b.id === batch.id);
      if (existing) {
        return prev.map((b) => (b.id === batch.id ? { ...batch, entries: [...batch.entries] } : b));
      }
      return [{ ...batch, entries: [...batch.entries] }, ...prev];
    });
  };

  const start = async () => {
    setRunning(true);
    setLog([]);
    setSummary(null);
    const controller = new AbortController();
    abortRef.current = controller;

    const batch = createReviewBatch();
    currentBatchRef.current = batch;
    syncReviewBatches((prev) => [batch, ...prev.filter((b) => b.id !== batch.id)]);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters: scopeFilters, maxSpells, batchSize }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        appendLog(`Failed to start: ${data.error || res.statusText}`, 'error');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (!line.trim()) continue;
          handleEvent(JSON.parse(line));
        }
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        appendLog(err instanceof Error ? err.message : 'Stream failed', 'error');
      }
    } finally {
      const batchRef = currentBatchRef.current;
      if (batchRef) {
        batchRef.completedAt = Date.now();
        syncReviewBatches((prev) => prev.map((b) => (b.id === batchRef.id ? { ...batchRef, entries: [...batchRef.entries] } : b)));
      }
      currentBatchRef.current = null;
      setRunning(false);
      abortRef.current = null;
      onDataChanged();
    }
  };

  const handleEvent = (event: Record<string, unknown>) => {
    switch (event.type) {
      case 'start':
        appendLog(`Processing ${event.totalSpells} spells in ${event.batchCount} batch(es) using ${event.model}...`, 'info');
        break;
      case 'spell': {
        const fields = (event.generatedFields as string[]) ?? [];
        const tags = (event.tags as string[]) ?? [];
        const newTags = (event.newTagsCreated as string[]) ?? [];
        if (event.status === 'success') {
          const fieldsStr = fields.length > 0 ? `generated: ${fields.join(', ')}` : 'nothing to generate (already complete)';
          const tagsStr = tags.length > 0 ? ` [${tags.join(', ')}]` : '';
          const newTagNote = newTags.length > 0 ? ` (new tag${newTags.length > 1 ? 's' : ''}: ${newTags.join(', ')})` : '';
          appendLog(`OK ${event.name}${tagsStr} (${fieldsStr})${newTagNote}`, 'success');

          if (typeof event.spellId === 'string') {
            const spellStatus = event.spellStatus;
            addReviewEntry({
              id: event.spellId,
              batchId: currentBatchRef.current?.id ?? 'unknown',
              generatedAt: Date.now(),
              name: String(event.name ?? ''),
              summary: String(event.summary ?? ''),
              description: String(event.description ?? ''),
              tags,
              status:
                spellStatus === 'favorite' || spellStatus === 'dud' || spellStatus === 'niche' || spellStatus === 'normal'
                  ? spellStatus
                  : 'normal',
              generatedFields: fields,
              circleBase: String(event.circleBase ?? ''),
              primaryRune: String(event.primaryRune ?? ''),
              modifierRunes: Array.isArray(event.modifierRunes) ? (event.modifierRunes as string[]) : [],
              controlRune: typeof event.controlRune === 'string' ? event.controlRune : null,
            });
          }
        } else {
          appendLog(`ERR spell ${event.spellId}: ${event.message}`, 'error');
        }
        break;
      }
      case 'batch_warning':
        appendLog(`WARN batch ${(event.batchIndex as number) + 1}: ${event.message}`, 'warning');
        break;
      case 'batch_error':
        appendLog(`ERR batch ${(event.batchIndex as number) + 1} failed: ${event.message}`, 'error');
        break;
      case 'done':
        setSummary(
          `Done${event.aborted ? ' (stopped early)' : ''}: ${event.succeeded} succeeded, ${event.failed} failed, ${event.processed} total.`
        );
        break;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
  };

  return (
    <div className="ui-panel space-y-4">
      <div>
        <h2 className="ui-panel-header">Contemplate meaning</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          Like a mage meditating on the Dao, run batch generation here to fill in names, summaries, descriptions, and
          tags for spells that still need them. Duds intentionally have no tags and are skipped once name/summary/
          description are filled. Smaller batches (default 10) help the model keep firm rules like Exempt and
          Channeling/Draining straight. Review the results below before returning to the Builder.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <select
          value={circleBase}
          onChange={(e) => setCircleBase(e.target.value)}
          disabled={running}
          className="ui-select-sm disabled:opacity-50"
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
          onChange={(e) => setPrimaryRune(e.target.value)}
          disabled={running}
          className="ui-select-sm disabled:opacity-50"
        >
          <option value="">All primary runes</option>
          {runeLists.primaryRunes.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs text-foreground-muted">
          Max this run
          <input
            type="number"
            min={1}
            max={500}
            value={maxSpells}
            onChange={(e) => setMaxSpells(Number(e.target.value) || 1)}
            disabled={running}
            className="ui-input-sm w-20 disabled:opacity-50"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-foreground-muted">
          Spells/call
          <input
            type="number"
            min={1}
            max={50}
            value={batchSize}
            onChange={(e) => setBatchSize(Number(e.target.value) || 1)}
            disabled={running}
            className="ui-input-sm w-20 disabled:opacity-50"
          />
        </label>
      </div>

      <div className="rounded-md border border-border-subtle bg-background p-3 text-xs text-foreground-muted">
        {countLoading ? (
          'Checking...'
        ) : availableCount === null ? (
          'Could not check how many spells need enrichment.'
        ) : (
          <>
            <span className="text-foreground">{availableCount}</span> spell{availableCount === 1 ? '' : 's'} in this
            scope need enrichment. This run will process up to{' '}
            <span className="text-foreground">{Math.min(availableCount, maxSpells)}</span> of them in{' '}
            <span className="text-foreground">{estimate?.batchCount ?? '?'}</span> API call
            {estimate?.batchCount === 1 ? '' : 's'}.
            {estimate && (
              <>
                {' '}
                Estimated cost: <span className="text-foreground">~${estimate.estCostUsd.toFixed(3)}</span> (rough
                estimate, using {estimate.model}).
              </>
            )}
          </>
        )}
      </div>

      <div className="flex gap-2">
        {!running ? (
          <button type="button" onClick={start} disabled={!availableCount} className="ui-btn ui-btn-primary">
            Begin contemplation
          </button>
        ) : (
          <button type="button" onClick={stop} className="ui-btn ui-btn-danger">
            Stop
          </button>
        )}
      </div>

      {(log.length > 0 || running) && (
        <div className="max-h-56 space-y-0.5 overflow-y-auto rounded-md border border-border-subtle bg-background p-3 font-mono text-[11px]">
          {log.map((entry) => (
            <div
              key={entry.id}
              className={
                entry.tone === 'success'
                  ? 'text-success'
                  : entry.tone === 'error'
                  ? 'text-red-400'
                  : entry.tone === 'warning'
                  ? 'text-warning'
                  : 'text-foreground-subtle'
              }
            >
              {entry.text}
            </div>
          ))}
          {running && <div className="text-foreground-subtle">...</div>}
          <div ref={logEndRef} />
        </div>
      )}

      {summary && <p className="text-xs text-foreground-muted">{summary}</p>}
    </div>
  );
}
