'use client';

import { useState } from 'react';
import type { RuneKind, RuneLists, RuneMeaningConfig, RuneNameConfig } from '@/lib/core/types';
import {
  addRuneApi,
  getRuneAffectedCountApi,
  removeRuneApi,
  renameRuneApi,
  setModifierPairNameApi,
  setRuneDisplayNameApi,
  setRuneMeaningApi,
  undoLastBatchApi,
} from '@/lib/api-client';
import { getAllModifierPairKeys, parseModifierPairKey } from '@/lib/core/spell-name-generator';
import { ArrowRightIcon, ChevronDownIcon, ChevronRightIcon } from '@/components/ui/icons';

const KIND_LABEL: Record<RuneKind, string> = {
  circleBase: 'Circle Base',
  primary: 'Primary',
  modifier: 'Modifier',
  control: 'Control',
};

interface Props {
  runeLists: RuneLists;
  runeNameConfig: RuneNameConfig;
  runeMeanings: RuneMeaningConfig;
  kinds: RuneKind[];
  showAddForm?: boolean;
  showModifierPairs?: boolean;
  title?: string;
  onChanged: () => void;
}

function RuneRow({
  kind,
  name,
  displayName,
  meaning,
  showDisplayName,
  onChanged,
}: {
  kind: RuneKind;
  name: string;
  displayName: string;
  meaning: string;
  showDisplayName: boolean;
  onChanged: () => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(name);
  const [displayValue, setDisplayValue] = useState(displayName);
  const [meaningValue, setMeaningValue] = useState(meaning);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [affectedCount, setAffectedCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const saveDisplayName = async () => {
    if (displayValue === displayName) return;
    setBusy(true);
    try {
      await setRuneDisplayNameApi(kind, name, displayValue);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const saveMeaning = async () => {
    if (meaningValue === meaning) return;
    setBusy(true);
    try {
      await setRuneMeaningApi(kind, name, meaningValue);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const saveRename = async () => {
    const trimmed = nameValue.trim();
    setEditingName(false);
    if (!trimmed || trimmed === name) return;
    setBusy(true);
    try {
      await renameRuneApi(kind, name, trimmed);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const startDeleteConfirm = async () => {
    setConfirmingDelete(true);
    setCountLoading(true);
    setAffectedCount(null);
    try {
      const { affectedSpellCount } = await getRuneAffectedCountApi(kind, name);
      setAffectedCount(affectedSpellCount);
    } catch {
      setAffectedCount(null);
    } finally {
      setCountLoading(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await removeRuneApi(kind, name);
      onChanged();
    } finally {
      setBusy(false);
      setConfirmingDelete(false);
      setAffectedCount(null);
    }
  };

  return (
    <div className="rounded-md border border-border-subtle bg-surface-raised px-3 py-2.5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        {editingName ? (
          <input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={saveRename}
            onKeyDown={(e) => e.key === 'Enter' && saveRename()}
            className="ui-input-sm w-32"
          />
        ) : (
          <button
            type="button"
            className="min-w-[6rem] text-left font-medium text-foreground hover:text-accent"
            onClick={() => setEditingName(true)}
            title="Click to rename"
          >
            {name}
          </button>
        )}
        {showDisplayName && (
          <>
            <ArrowRightIcon className="text-foreground-subtle" />
            <input
              value={displayValue}
              onChange={(e) => setDisplayValue(e.target.value)}
              onBlur={saveDisplayName}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              placeholder="display name"
              className="ui-input-sm w-36 text-xs"
            />
          </>
        )}
        {confirmingDelete ? (
          <span className="flex flex-wrap items-center gap-1 text-xs">
            <span className="text-red-300">
              {countLoading
                ? 'Checking affected spells...'
                : affectedCount === null
                ? 'Delete? (could not check affected spells)'
                : affectedCount > 0
                ? `Delete "${name}" and ${affectedCount} spell${affectedCount === 1 ? '' : 's'}?`
                : `Delete "${name}"? (0 spells affected)`}
            </span>
            <button type="button" onClick={handleDelete} disabled={busy || countLoading} className="ui-btn-sm ui-btn-danger">
              Yes, delete
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmingDelete(false);
                setAffectedCount(null);
              }}
              className="ui-btn-sm ui-btn-secondary"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button type="button" onClick={startDeleteConfirm} className="ui-btn-sm ui-btn-ghost text-red-400">
            Delete
          </button>
        )}
      </div>
      <input
        value={meaningValue}
        onChange={(e) => setMeaningValue(e.target.value)}
        onBlur={saveMeaning}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        placeholder="AI context: what this conceptually does (used by batch description generation)"
        className="ui-input-sm mt-2 border-transparent bg-background text-xs text-foreground-muted hover:border-border focus:text-foreground"
      />
    </div>
  );
}

function RuneKindSection({
  kind,
  runeLists,
  runeNameConfig,
  runeMeanings,
  onChanged,
}: {
  kind: RuneKind;
  runeLists: RuneLists;
  runeNameConfig: RuneNameConfig;
  runeMeanings: RuneMeaningConfig;
  onChanged: () => void;
}) {
  const names =
    kind === 'circleBase'
      ? runeLists.circleBases
      : kind === 'primary'
      ? runeLists.primaryRunes
      : kind === 'modifier'
      ? runeLists.modifierRunes
      : runeLists.controlRunes;
  const nameMap =
    kind === 'primary'
      ? runeNameConfig.primaryNames
      : kind === 'modifier'
      ? runeNameConfig.modifierNames
      : kind === 'control'
      ? runeNameConfig.controlNames
      : {};
  const meaningMap =
    kind === 'circleBase'
      ? runeMeanings.circleBaseMeanings
      : kind === 'primary'
      ? runeMeanings.primaryMeanings
      : kind === 'modifier'
      ? runeMeanings.modifierMeanings
      : runeMeanings.controlMeanings;

  return (
    <div>
      <h3 className="ui-label mb-2">
        {KIND_LABEL[kind]} ({names.length})
      </h3>
      <div className="flex flex-col gap-2">
        {names.length === 0 && <span className="text-xs italic text-foreground-subtle">none yet</span>}
        {names.map((n) => (
          <RuneRow
            key={n}
            kind={kind}
            name={n}
            displayName={nameMap[n] ?? ''}
            meaning={meaningMap[n] ?? ''}
            showDisplayName={kind !== 'circleBase'}
            onChanged={onChanged}
          />
        ))}
      </div>
    </div>
  );
}

export function RunePanel({
  runeLists,
  runeNameConfig,
  runeMeanings,
  kinds,
  showAddForm = false,
  showModifierPairs = false,
  title,
  onChanged,
}: Props) {
  const [kind, setKind] = useState<RuneKind>(kinds[0] ?? 'primary');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [showNaming, setShowNaming] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setLastResult(null);
    try {
      const result = await addRuneApi(kind, trimmed);
      setLastResult(`Added "${trimmed}" (${KIND_LABEL[kind]}) -- generated ${result.addedCount} new spell combinations.`);
      setName('');
      onChanged();
    } catch (err) {
      setLastResult(err instanceof Error ? err.message : 'Failed to add rune');
    } finally {
      setBusy(false);
    }
  };

  const handleUndo = async () => {
    setBusy(true);
    try {
      const undone = await undoLastBatchApi();
      setLastResult(`Undid batch: removed ${undone.spellIds.length} spells from "${undone.runeName}".`);
      onChanged();
    } catch (err) {
      setLastResult(err instanceof Error ? err.message : 'Nothing to undo');
    } finally {
      setBusy(false);
    }
  };

  const modifierPairs = getAllModifierPairKeys(runeLists.modifierRunes);

  return (
    <div className="ui-panel space-y-4">
      {title && <h2 className="ui-panel-header">{title}</h2>}

      {showAddForm && (
        <>
          <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as RuneKind)}
              className="ui-select-sm w-full sm:w-auto"
            >
              <option value="circleBase">Circle Base</option>
              <option value="primary">Primary</option>
              <option value="modifier">Modifier</option>
              <option value="control">Control</option>
            </select>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rune name"
              className="ui-input-sm flex-1"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={busy || !name.trim()} className="ui-btn-sm ui-btn-primary flex-1 sm:flex-none">
                Generate
              </button>
              <button type="button" onClick={handleUndo} disabled={busy} className="ui-btn-sm ui-btn-secondary">
                Undo last
              </button>
            </div>
          </form>
          {lastResult && <p className="text-xs text-foreground-muted">{lastResult}</p>}
        </>
      )}

      <div className={`space-y-4 ${showAddForm ? 'border-t border-border-subtle pt-4' : ''}`}>
        {kinds.map((k) => (
          <RuneKindSection
            key={k}
            kind={k}
            runeLists={runeLists}
            runeNameConfig={runeNameConfig}
            runeMeanings={runeMeanings}
            onChanged={onChanged}
          />
        ))}
      </div>

      {showModifierPairs && (
        <>
          <button
            type="button"
            onClick={() => setShowNaming((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
          >
            {showNaming ? <ChevronDownIcon /> : <ChevronRightIcon />}
            {showNaming ? 'Hide' : 'Show'} modifier pair names ({modifierPairs.length})
          </button>
          {showNaming && (
            <div className="space-y-2 rounded-md border border-border-subtle bg-surface-raised p-3">
              {modifierPairs.length === 0 && (
                <p className="text-xs italic text-foreground-subtle">Add 2+ modifiers to create pairs</p>
              )}
              {modifierPairs.map((pairKey) => {
                const [m1, m2] = parseModifierPairKey(pairKey);
                return (
                  <PairNameRow
                    key={pairKey}
                    mod1={m1}
                    mod2={m2}
                    initial={runeNameConfig.modifierPairNames[pairKey] ?? ''}
                    onChanged={onChanged}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PairNameRow({ mod1, mod2, initial, onChanged }: { mod1: string; mod2: string; initial: string; onChanged: () => void }) {
  const [value, setValue] = useState(initial);
  const save = async () => {
    if (value === initial) return;
    await setModifierPairNameApi(mod1, mod2, value);
    onChanged();
  };
  return (
    <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center">
      <span className="truncate text-foreground-muted sm:w-40">
        {mod1} + {mod2}
      </span>
      <ArrowRightIcon className="hidden text-foreground-subtle sm:block" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        placeholder={`${mod1} ${mod2}`}
        className="ui-input-sm flex-1"
      />
    </div>
  );
}
