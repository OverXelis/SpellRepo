'use client';

import { useEffect, useRef, useState } from 'react';
import type { RuneLists } from '@/lib/core/types';
import { estimateGenerationCost, searchSpellsApi, type CostEstimate } from '@/lib/api-client';

interface Props {
  runeLists: RuneLists;
  onDataChanged: () => void;
}

interface LogEntry {
  id: string;
  text: string;
  tone: 'success' | 'error' | 'warning' | 'info';
}

const DEFAULT_MAX_SPELLS = 25;
const DEFAULT_BATCH_SIZE = 20;

export function BatchGeneratePanel({ runeLists, onDataChanged }: Props) {
  const [open, setOpen] = useState(false);
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

  const scopeFilters = {
    circleBase: circleBase || undefined,
    primaryRune: primaryRune || undefined,
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // Standard fetch-on-filter-change pattern -- see the equivalent, more
    // detailed comment in components/spell-table.tsx.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, circleBase, primaryRune, maxSpells, batchSize]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [log]);

  const appendLog = (text: string, tone: LogEntry['tone']) => {
    setLog((prev) => [...prev, { id: `${prev.length}-${Date.now()}`, text, tone }]);
  };

  const start = async () => {
    setRunning(true);
    setLog([]);
    setSummary(null);
    const controller = new AbortController();
    abortRef.current = controller;

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
          appendLog(`✅ ${event.name}${tagsStr} (${fieldsStr})${newTagNote}`, 'success');
        } else {
          appendLog(`❌ Spell ${event.spellId}: ${event.message}`, 'error');
        }
        break;
      }
      case 'batch_warning':
        appendLog(`⚠️ Batch ${(event.batchIndex as number) + 1}: ${event.message}`, 'warning');
        break;
      case 'batch_error':
        appendLog(`❌ Batch ${(event.batchIndex as number) + 1} failed: ${event.message}`, 'error');
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

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-left text-sm font-semibold text-neutral-100 hover:bg-neutral-800/60"
      >
        ✨ Generate descriptions with AI
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-100">✨ Generate descriptions with AI</h2>
        <button onClick={() => setOpen(false)} className="text-xs text-neutral-500 hover:text-neutral-300">
          Collapse
        </button>
      </div>
      <p className="text-xs text-neutral-500">
        Fills in name/description/summary/tags for spells missing any of them, in batches of multiple spells per API
        call. Never overwrites fields you&apos;ve already set.
      </p>

      <div className="flex flex-wrap gap-2">
        <select
          value={circleBase}
          onChange={(e) => setCircleBase(e.target.value)}
          disabled={running}
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-200 disabled:opacity-50"
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
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-200 disabled:opacity-50"
        >
          <option value="">All primary runes</option>
          {runeLists.primaryRunes.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs text-neutral-400">
          Max this run
          <input
            type="number"
            min={1}
            max={500}
            value={maxSpells}
            onChange={(e) => setMaxSpells(Number(e.target.value) || 1)}
            disabled={running}
            className="w-16 rounded border border-neutral-700 bg-neutral-950 px-1.5 py-1 text-xs text-neutral-200 disabled:opacity-50"
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-neutral-400">
          Spells/call
          <input
            type="number"
            min={1}
            max={50}
            value={batchSize}
            onChange={(e) => setBatchSize(Number(e.target.value) || 1)}
            disabled={running}
            className="w-14 rounded border border-neutral-700 bg-neutral-950 px-1.5 py-1 text-xs text-neutral-200 disabled:opacity-50"
          />
        </label>
      </div>

      <div className="rounded border border-neutral-800 bg-neutral-950/60 p-2 text-xs text-neutral-400">
        {countLoading ? (
          'Checking...'
        ) : availableCount === null ? (
          'Could not check how many spells need enrichment.'
        ) : (
          <>
            <span className="text-neutral-200">{availableCount}</span> spell{availableCount === 1 ? '' : 's'} in this
            scope need enrichment. This run will process up to{' '}
            <span className="text-neutral-200">{Math.min(availableCount, maxSpells)}</span> of them in{' '}
            <span className="text-neutral-200">{estimate?.batchCount ?? '?'}</span> API call
            {estimate?.batchCount === 1 ? '' : 's'}.
            {estimate && (
              <>
                {' '}
                Estimated cost: <span className="text-neutral-200">~${estimate.estCostUsd.toFixed(3)}</span> (rough
                estimate, using {estimate.model}).
              </>
            )}
          </>
        )}
      </div>

      <div className="flex gap-2">
        {!running ? (
          <button
            onClick={start}
            disabled={!availableCount}
            className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            Start
          </button>
        ) : (
          <button onClick={stop} className="rounded bg-red-900/60 px-3 py-1.5 text-sm font-medium text-red-200 hover:bg-red-900">
            Stop
          </button>
        )}
      </div>

      {(log.length > 0 || running) && (
        <div className="max-h-56 space-y-0.5 overflow-y-auto rounded border border-neutral-800 bg-neutral-950 p-2 font-mono text-[11px]">
          {log.map((entry) => (
            <div
              key={entry.id}
              className={
                entry.tone === 'success'
                  ? 'text-emerald-400'
                  : entry.tone === 'error'
                  ? 'text-red-400'
                  : entry.tone === 'warning'
                  ? 'text-amber-400'
                  : 'text-neutral-500'
              }
            >
              {entry.text}
            </div>
          ))}
          {running && <div className="text-neutral-600">...</div>}
          <div ref={logEndRef} />
        </div>
      )}

      {summary && <p className="text-xs text-neutral-300">{summary}</p>}
    </div>
  );
}
