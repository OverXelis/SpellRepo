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
import { calculatePrimaryCombinationCount } from '@/lib/rune-calculator';

export function RuneInputForm() {
  const [runeType, setRuneType] = useState<RuneType>('primary');
  const [runeName, setRuneName] = useState('');
  const [lastResult, setLastResult] = useState<{
    type: RuneType;
    name: string;
    count: number;
  } | null>(null);

  const { addRune, runeLists, spells } = useSpellStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!runeName.trim()) return;

    // Validate for modifier/control - need at least one primary rune
    if (
      (runeType === 'modifier' || runeType === 'control') &&
      runeLists.primaryRunes.length === 0
    ) {
      alert('You must add at least one Primary Rune before adding Modifier or Control runes.');
      return;
    }

    // Check for duplicates
    if (runeType === 'primary' && runeLists.primaryRunes.includes(runeName.trim())) {
      alert(`Primary Rune "${runeName}" already exists.`);
      return;
    }

    const count = addRune(runeType, runeName.trim());

    setLastResult({
      type: runeType,
      name: runeName.trim(),
      count,
    });

    setRuneName('');
  };

  const expectedCount =
    runeType === 'primary'
      ? calculatePrimaryCombinationCount(runeLists)
      : null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Add New Rune</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="rune-type">Rune Type</Label>
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
          <p className="text-xs text-slate-500">
            {runeType === 'primary' &&
              'Generates all combinations for this primary with every circle base.'}
            {runeType === 'modifier' &&
              'Adds combinations using this modifier across all existing primaries.'}
            {runeType === 'control' &&
              'Adds combinations using this control across all existing primaries.'}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rune-name">Rune Name</Label>
          <Input
            id="rune-name"
            type="text"
            value={runeName}
            onChange={(e) => setRuneName(e.target.value)}
            placeholder={`Enter ${runeType} rune name`}
          />
        </div>

        {runeType === 'primary' && expectedCount !== null && (
          <p className="text-sm text-slate-600">
            This will generate <strong>{expectedCount}</strong> combinations
            (5 bases × {runeLists.modifierRunes.length} modifiers ×{' '}
            {runeLists.controlRunes.length} controls).
          </p>
        )}

        {(runeType === 'modifier' || runeType === 'control') &&
          runeLists.primaryRunes.length === 0 && (
            <p className="text-sm text-amber-600">
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
          Generate Combinations
        </Button>
      </form>

      {lastResult && (
        <div className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
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
          rune. Generated <strong>{lastResult.count}</strong> new combinations.
        </div>
      )}

      <div className="mt-6 space-y-3">
        <h3 className="text-sm font-medium text-slate-700">Current Rune Lists</h3>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500 w-20">Bases:</span>
            {runeLists.circleBases.map((base) => (
              <Badge key={base} variant="base">
                {base}
              </Badge>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500 w-20">Primary:</span>
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
            <span className="text-xs font-medium text-slate-500 w-20">Modifiers:</span>
            {runeLists.modifierRunes.map((rune) => (
              <Badge key={rune} variant="modifier">
                {rune}
              </Badge>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500 w-20">Controls:</span>
            {runeLists.controlRunes.map((rune) => (
              <Badge key={rune} variant="control">
                {rune}
              </Badge>
            ))}
          </div>
        </div>

        <div className="pt-2 text-xs text-slate-500">
          Total combinations in database: <strong>{spells.length}</strong>
        </div>
      </div>
    </div>
  );
}
