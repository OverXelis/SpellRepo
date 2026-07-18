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
    <div className="rounded border border-neutral-800 bg-neutral-900/50 px-2 py-1.5 text-sm space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        {editingName ? (
          <input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={saveRename}
            onKeyDown={(e) => e.key === 'Enter' && saveRename()}
            className="w-28 rounded bg-neutral-950 px-1.5 py-0.5 text-neutral-100 outline-none border border-neutral-700"
          />
        ) : (
          <button
            className="min-w-[6rem] text-left font-medium text-neutral-100 hover:underline"
            onClick={() => setEditingName(true)}
            title="Click to rename"
          >
            {name}
          </button>
        )}
        {showDisplayName && (
          <>
            <span className="text-neutral-600">→</span>
            <input
              value={displayValue}
              onChange={(e) => setDisplayValue(e.target.value)}
              onBlur={saveDisplayName}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              placeholder="display name"
              className="w-32 rounded bg-neutral-950 px-1.5 py-0.5 text-xs text-neutral-300 outline-none border border-neutral-800 focus:border-neutral-600"
            />
          </>
        )}
        {confirmingDelete ? (
          <span className="flex items-center gap-1 text-xs">
            <span className="text-red-400">
              {countLoading
                ? 'Checking affected spells...'
                : affectedCount === null
                ? 'Delete? (could not check affected spells)'
                : affectedCount > 0
                ? `Delete "${name}" and ${affectedCount} spell${affectedCount === 1 ? '' : 's'}?`
                : `Delete "${name}"? (0 spells affected)`}
            </span>
            <button
              onClick={handleDelete}
              disabled={busy || countLoading}
              className="rounded bg-red-900/60 px-1.5 py-0.5 text-red-200 disabled:opacity-50"
            >
              Yes, delete
            </button>
            <button
              onClick={() => {
                setConfirmingDelete(false);
                setAffectedCount(null);
              }}
              className="rounded bg-neutral-800 px-1.5 py-0.5"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button onClick={startDeleteConfirm} className="text-xs text-neutral-500 hover:text-red-400">
            delete
          </button>
        )}
      </div>
      <input
        value={meaningValue}
        onChange={(e) => setMeaningValue(e.target.value)}
        onBlur={saveMeaning}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        placeholder="AI context: what this conceptually does (used by batch description generation)"
        className="w-full rounded bg-neutral-950 px-1.5 py-0.5 text-xs text-neutral-500 outline-none border border-transparent hover:border-neutral-800 focus:border-neutral-700 focus:text-neutral-300"
      />
    </div>
  );
}

export function RunePanel({ runeLists, runeNameConfig, runeMeanings, onChanged }: Props) {
  const [kind, setKind] = useState<RuneKind>('primary');
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
      setLastResult(`Added "${trimmed}" (${KIND_LABEL[kind]}) — generated ${result.addedCount} new spell combinations.`);
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
    <div className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <h2 className="text-sm font-semibold text-neutral-100">Add rune</h2>
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as RuneKind)}
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-200"
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
          className="flex-1 rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-100 outline-none focus:border-neutral-500"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Generate
        </button>
        <button
          type="button"
          onClick={handleUndo}
          disabled={busy}
          className="rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
        >
          Undo last
        </button>
      </form>
      {lastResult && <p className="text-xs text-neutral-400">{lastResult}</p>}

      <div className="space-y-3 pt-2">
        {(['circleBase', 'primary', 'modifier', 'control'] as RuneKind[]).map((k) => {
          const names =
            k === 'circleBase' ? runeLists.circleBases : k === 'primary' ? runeLists.primaryRunes : k === 'modifier' ? runeLists.modifierRunes : runeLists.controlRunes;
          const nameMap =
            k === 'primary' ? runeNameConfig.primaryNames : k === 'modifier' ? runeNameConfig.modifierNames : k === 'control' ? runeNameConfig.controlNames : {};
          const meaningMap =
            k === 'circleBase'
              ? runeMeanings.circleBaseMeanings
              : k === 'primary'
              ? runeMeanings.primaryMeanings
              : k === 'modifier'
              ? runeMeanings.modifierMeanings
              : runeMeanings.controlMeanings;
          return (
            <div key={k}>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {KIND_LABEL[k]} ({names.length})
              </h3>
              <div className="flex flex-col gap-1.5">
                {names.length === 0 && <span className="text-xs italic text-neutral-600">none yet</span>}
                {names.map((n) => (
                  <RuneRow
                    key={n}
                    kind={k}
                    name={n}
                    displayName={nameMap[n] ?? ''}
                    meaning={meaningMap[n] ?? ''}
                    showDisplayName={k !== 'circleBase'}
                    onChanged={onChanged}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={() => setShowNaming((v) => !v)} className="text-xs text-indigo-400 hover:text-indigo-300">
        {showNaming ? 'Hide' : 'Show'} modifier pair names ({modifierPairs.length})
      </button>
      {showNaming && (
        <div className="space-y-1.5 rounded border border-neutral-800 p-2">
          {modifierPairs.length === 0 && <p className="text-xs italic text-neutral-600">Add 2+ modifiers to create pairs</p>}
          {modifierPairs.map((pairKey) => {
            const [m1, m2] = parseModifierPairKey(pairKey);
            return (
              <PairNameRow key={pairKey} mod1={m1} mod2={m2} initial={runeNameConfig.modifierPairNames[pairKey] ?? ''} onChanged={onChanged} />
            );
          })}
        </div>
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
    <div className="flex items-center gap-2 text-xs">
      <span className="w-40 truncate text-neutral-400">
        {mod1} + {mod2}
      </span>
      <span className="text-neutral-600">→</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        placeholder={`${mod1} ${mod2}`}
        className="flex-1 rounded border border-neutral-800 bg-neutral-950 px-1.5 py-0.5 text-neutral-200 outline-none focus:border-neutral-600"
      />
    </div>
  );
}
