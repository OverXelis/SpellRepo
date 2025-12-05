'use client';

import { useState } from 'react';
import { useSpellStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { RuneType } from '@/lib/types';
import {
  calculatePrimaryCombinationCount,
  calculateModifierCombinationCount,
  calculateControlCombinationCount,
} from '@/lib/rune-calculator';
import { Undo2 } from 'lucide-react';

export function RuneInputForm() {
  const [runeType, setRuneType] = useState<RuneType>('primary');
  const [runeName, setRuneName] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [lastResult, setLastResult] = useState<{
    type: RuneType;
    name: string;
    count: number;
  } | null>(null);

  const { addRune, runeLists, spells, batchHistory, undoLastBatch } = useSpellStore();

  const getExpectedCount = () => {
    if (!runeName.trim()) return 0;
    switch (runeType) {
      case 'primary':
        return calculatePrimaryCombinationCount(runeLists);
      case 'modifier':
        return calculateModifierCombinationCount(runeLists);
      case 'control':
        return calculateControlCombinationCount(runeLists);
      default:
        return 0;
    }
  };

  const expectedCount = getExpectedCount();

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();

    if (!runeName.trim()) return;

    // Validate for modifier/control - need at least one primary rune
    if (
      (runeType === 'modifier' || runeType === 'control') &&
      runeLists.primaryRunes.length === 0
    ) {
      return;
    }

    // Check for duplicates
    if (runeType === 'primary' && runeLists.primaryRunes.includes(runeName.trim())) {
      alert(`Primary Rune "${runeName}" already exists.`);
      return;
    }
    if (runeType === 'modifier' && runeLists.modifierRunes.includes(runeName.trim())) {
      alert(`Modifier Rune "${runeName}" already exists.`);
      return;
    }
    if (runeType === 'control' && runeLists.controlRunes.includes(runeName.trim())) {
      alert(`Control Rune "${runeName}" already exists.`);
      return;
    }

    setShowPreview(true);
  };

  const handleConfirm = async () => {
    const count = await addRune(runeType, runeName.trim());

    setLastResult({
      type: runeType,
      name: runeName.trim(),
      count,
    });

    setRuneName('');
    setShowPreview(false);
  };

  const handleCancel = () => {
    setShowPreview(false);
  };

  const handleUndo = async () => {
    const undone = await undoLastBatch();
    if (undone) {
      setLastResult(null);
    }
  };

  const lastBatch = batchHistory.length > 0 ? batchHistory[batchHistory.length - 1] : null;

  return (
    <div className="rounded-lg border border-dark-600 bg-dark-800 p-6 shadow-lg glow">
      <h2 className="mb-4 text-lg font-semibold text-slate-100">Add New Rune</h2>

      {!showPreview ? (
        <form onSubmit={handlePreview} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rune-type" className="text-slate-300">Rune Type</Label>
            <Select
              value={runeType}
              onValueChange={(value) => setRuneType(value as RuneType)}
            >
              <SelectTrigger id="rune-type">
                <SelectValue placeholder="Select rune type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">Primary Rune</SelectItem>
                <SelectItem value="modifier">Modifier Rune</SelectItem>
                <SelectItem value="control">Control Rune</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400">
              {runeType === 'primary' &&
                'Generates all combinations for this primary with every circle base.'}
              {runeType === 'modifier' &&
                'Adds combinations using this modifier across all existing primaries.'}
              {runeType === 'control' &&
                'Adds combinations using this control across all existing primaries.'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rune-name" className="text-slate-300">Rune Name</Label>
            <Input
              id="rune-name"
              type="text"
              value={runeName}
              onChange={(e) => setRuneName(e.target.value)}
              placeholder={`Enter ${runeType} rune name`}
            />
          </div>

          {runeName.trim() && expectedCount > 0 && (
            <div className="rounded-md border border-arcane-600/50 bg-arcane-900/20 px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-arcane-300">✦</span>
                <span className="text-slate-200">
                  Will generate <strong className="text-arcane-400 text-lg">{expectedCount}</strong> combinations
                </span>
              </div>
            </div>
          )}

          {(runeType === 'modifier' || runeType === 'control') &&
            runeLists.primaryRunes.length === 0 && (
              <p className="text-sm text-amber-400">
                Add a Primary Rune first before adding{' '}
                {runeType === 'modifier' ? 'Modifier' : 'Control'} runes.
              </p>
            )}

          <Button
            type="submit"
            className="w-full"
            disabled={
              !runeName.trim() ||
              ((runeType === 'modifier' || runeType === 'control') &&
                runeLists.primaryRunes.length === 0)
            }
          >
            Preview Combinations
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md bg-arcane-900/30 border border-arcane-700/50 p-4">
            <h3 className="text-sm font-medium text-arcane-200 mb-2">Confirm Generation</h3>
            <p className="text-sm text-slate-300">
              Adding <strong className="text-white">{runeName}</strong> as a{' '}
              <Badge
                variant={runeType === 'primary' ? 'primary' : runeType === 'modifier' ? 'modifier' : 'control'}
                className="mx-1"
              >
                {runeType}
              </Badge>{' '}
              rune will create:
            </p>
            <p className="mt-2 text-2xl font-bold text-arcane-400">{expectedCount} combinations</p>
            <p className="text-xs text-slate-400 mt-1">
              {runeType === 'primary' && `Across ${runeLists.circleBases.length} circle bases`}
              {runeType === 'modifier' && `Across ${runeLists.primaryRunes.length} primary runes and ${runeLists.circleBases.length} bases`}
              {runeType === 'control' && `Across ${runeLists.primaryRunes.length} primary runes and ${runeLists.circleBases.length} bases`}
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleConfirm} className="flex-1">
              Generate
            </Button>
          </div>
        </div>
      )}

      {lastResult && (
        <div className="mt-4 rounded-md bg-arcane-900/30 border border-arcane-700/50 p-3 text-sm text-arcane-200">
          Added <strong>{lastResult.name}</strong> as a{' '}
          <Badge
            variant={
              lastResult.type === 'primary'
                ? 'primary'
                : lastResult.type === 'modifier'
                ? 'modifier'
                : 'control'
            }
            className="mx-1"
          >
            {lastResult.type}
          </Badge>{' '}
          rune. Generated <strong className="text-arcane-300">{lastResult.count}</strong> new combinations.
        </div>
      )}

      {lastBatch && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleUndo}
          className="mt-3 w-full border-amber-600/50 bg-amber-900/20 text-amber-300 hover:bg-amber-900/40 hover:text-amber-200 hover:border-amber-500"
        >
          <Undo2 className="mr-2 h-4 w-4" />
          Undo Combinations from {lastBatch.runeName}?
        </Button>
      )}

      <div className="mt-6 space-y-3">
        <h3 className="text-sm font-medium text-slate-300">Current Rune Lists</h3>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400 w-20">Bases:</span>
            {runeLists.circleBases.map((base) => (
              <Badge key={base} variant="base">
                {base}
              </Badge>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400 w-20">Primary:</span>
            {runeLists.primaryRunes.length > 0 ? (
              runeLists.primaryRunes.map((rune) => (
                <Badge key={rune} variant="primary">
                  {rune}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">None yet</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400 w-20">Modifiers:</span>
            {runeLists.modifierRunes.map((rune) => (
              <Badge key={rune} variant="modifier">
                {rune}
              </Badge>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400 w-20">Controls:</span>
            {runeLists.controlRunes.map((rune) => (
              <Badge key={rune} variant="control">
                {rune}
              </Badge>
            ))}
          </div>
        </div>

        <div className="pt-2 text-xs text-slate-400">
          Total combinations in database: <strong className="text-arcane-400">{spells.length}</strong>
        </div>
      </div>
    </div>
  );
}
