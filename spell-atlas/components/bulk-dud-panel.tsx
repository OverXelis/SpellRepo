'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RuneLists } from '@/lib/core/types';
import { bulkMarkDudsApi, type BulkDudResponse, type DudMarkReason } from '@/lib/api-client';

interface Props {
  runeLists: RuneLists;
  onApplied: (result: BulkDudResponse) => void;
}

export function BulkDudPanel({ runeLists, onApplied }: Props) {
  const [circleBase, setCircleBase] = useState('');
  const [primaryRune, setPrimaryRune] = useState('');
  const [modifier1, setModifier1] = useState('');
  const [modifier2, setModifier2] = useState('');
  const [controlRune, setControlRune] = useState('');
  const [reason, setReason] = useState<DudMarkReason>('fails_to_cast');
  const [preview, setPreview] = useState<BulkDudResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const modifierRunes = useMemo(() => {
    const mods = [modifier1, modifier2].filter(Boolean);
    return mods.length > 0 ? mods : undefined;
  }, [modifier1, modifier2]);

  const requestBody = useMemo(
    () => ({
      circleBase: circleBase || undefined,
      primaryRune: primaryRune || undefined,
      modifierRunes,
      controlRune: controlRune === '' ? undefined : controlRune === 'none' ? 'none' : controlRune,
      reason,
    }),
    [circleBase, primaryRune, modifierRunes, controlRune, reason]
  );

  const hasSelection = Boolean(
    circleBase || primaryRune || (modifierRunes && modifierRunes.length > 0) || controlRune
  );

  useEffect(() => {
    if (!hasSelection) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreview(null);
      setPreviewError(null);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError(null);
    setResultMessage(null);

    const timer = setTimeout(() => {
      bulkMarkDudsApi({ ...requestBody, dryRun: true })
        .then((res) => {
          if (!cancelled) setPreview(res);
        })
        .catch((err) => {
          if (!cancelled) {
            setPreview(null);
            setPreviewError(err instanceof Error ? err.message : 'Could not preview matches');
          }
        })
        .finally(() => {
          if (!cancelled) setPreviewLoading(false);
        });
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hasSelection, requestBody]);

  const availableModifier2 = runeLists.modifierRunes.filter((m) => m !== modifier1);
  const availableModifier1 = runeLists.modifierRunes.filter((m) => m !== modifier2);

  const apply = async () => {
    if (!preview || preview.matchedCount === 0) return;
    const confirmed = window.confirm(
      `Mark ${preview.matchedCount} spell${preview.matchedCount === 1 ? '' : 's'} as dud?\n\n` +
        `Rule: ${preview.ruleLabel}\n` +
        `Name: ${preview.customName}\n` +
        `Summary/Description: ${preview.text}\n` +
        `Tags: none\n\n` +
        `This overwrites name, summary, description, tags, and status for every matching spell.`
    );
    if (!confirmed) return;

    setApplying(true);
    setResultMessage(null);
    try {
      const result = await bulkMarkDudsApi({ ...requestBody, dryRun: false });
      setResultMessage(
        `Marked ${result.updatedCount ?? 0} spell${(result.updatedCount ?? 0) === 1 ? '' : 's'} as dud under "${result.ruleLabel}".`
      );
      onApplied(result);
      // Refresh preview counts after apply.
      const nextPreview = await bulkMarkDudsApi({ ...requestBody, dryRun: true });
      setPreview(nextPreview);
    } catch (err) {
      setResultMessage(err instanceof Error ? err.message : 'Bulk dud mark failed');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="ui-panel space-y-4">
      <div>
        <h2 className="ui-panel-header">Bulk mark duds</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          Select any circle base and/or rune combination. Every matching spell is marked dud with a shared template name
          so Contemplate Meaning will not waste generation on them.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <select value={circleBase} onChange={(e) => setCircleBase(e.target.value)} className="ui-select-sm" disabled={applying}>
          <option value="">Any circle base</option>
          {runeLists.circleBases.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select value={primaryRune} onChange={(e) => setPrimaryRune(e.target.value)} className="ui-select-sm" disabled={applying}>
          <option value="">Any primary rune</option>
          {runeLists.primaryRunes.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select value={controlRune} onChange={(e) => setControlRune(e.target.value)} className="ui-select-sm" disabled={applying}>
          <option value="">Any control rune</option>
          <option value="none">No control rune</option>
          {runeLists.controlRunes.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          value={modifier1}
          onChange={(e) => {
            setModifier1(e.target.value);
            if (e.target.value === modifier2) setModifier2('');
          }}
          className="ui-select-sm"
          disabled={applying}
        >
          <option value="">Any / no first modifier</option>
          {availableModifier1.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={modifier2}
          onChange={(e) => setModifier2(e.target.value)}
          className="ui-select-sm"
          disabled={applying || !modifier1}
        >
          <option value="">Any / no second modifier</option>
          {availableModifier2.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <p className="ui-label">Dud reason</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={applying}
            onClick={() => setReason('fails_to_cast')}
            className={`ui-btn-sm ${reason === 'fails_to_cast' ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
          >
            Fails to cast
          </button>
          <button
            type="button"
            disabled={applying}
            onClick={() => setReason('no_functional_use')}
            className={`ui-btn-sm ${reason === 'no_functional_use' ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
          >
            No functional use
          </button>
        </div>
        <p className="text-xs text-foreground-subtle">
          Fails to cast = combination cannot cohere. No functional use = would technically work, but Alex would never use
          it.
        </p>
      </div>

      <div className="rounded-md border border-border-subtle bg-background p-3 text-sm text-foreground-muted">
        {!hasSelection && <p>Select at least one circle base or rune to preview matches.</p>}
        {hasSelection && previewLoading && <p>Counting matches…</p>}
        {hasSelection && previewError && <p className="text-red-300">{previewError}</p>}
        {hasSelection && preview && !previewLoading && (
          <div className="space-y-1">
            <p>
              <span className="text-foreground">{preview.matchedCount}</span> spell
              {preview.matchedCount === 1 ? '' : 's'} match rule{' '}
              <span className="text-foreground">{preview.ruleLabel}</span>
              {preview.alreadyDudCount > 0
                ? ` (${preview.alreadyDudCount} already dud — will be overwritten with this template).`
                : '.'}
            </p>
            <p>
              Name → <span className="text-foreground">{preview.customName}</span>
            </p>
            <p>
              Summary / Description → <span className="text-foreground">{preview.text}</span>
            </p>
            <p>Status → Dud · Tags → none</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={apply}
          disabled={applying || !preview || preview.matchedCount === 0 || previewLoading}
          className="ui-btn-sm ui-btn-danger disabled:opacity-40"
        >
          {applying ? 'Marking…' : 'Mark matching spells as dud'}
        </button>
        {resultMessage && <p className="text-xs text-foreground-subtle">{resultMessage}</p>}
      </div>
    </div>
  );
}
