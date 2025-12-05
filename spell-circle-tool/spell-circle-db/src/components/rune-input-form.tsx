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
import { Undo2, Pencil, Trash2, X, Check } from 'lucide-react';
import { NamingConfig } from './naming-config';
import { TagStatistics } from './tag-statistics';
import { toast } from '@/lib/toast-store';
import { AnimatedCounter } from '@/components/ui/animated-counter';

export function RuneInputForm() {
  const [runeType, setRuneType] = useState<RuneType>('primary');
  const [runeName, setRuneName] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [lastResult, setLastResult] = useState<{
    type: RuneType;
    name: string;
    count: number;
  } | null>(null);

  // Edit state
  const [editingRune, setEditingRune] = useState<{
    type: RuneType;
    name: string;
  } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: RuneType;
    name: string;
  } | null>(null);

  const {
    addRune,
    runeLists,
    spells,
    batchHistory,
    undoLastBatch,
    removePrimaryRune,
    removeModifierRune,
    removeControlRune,
    editRune,
  } = useSpellStore();

  const getExpectedCount = () => {
    const trimmedName = runeName.trim();
    if (!trimmedName) return 0;
    switch (runeType) {
      case 'primary':
        return calculatePrimaryCombinationCount(runeLists, trimmedName, spells);
      case 'modifier':
        return calculateModifierCombinationCount(runeLists, trimmedName, spells);
      case 'control':
        return calculateControlCombinationCount(runeLists, trimmedName, spells);
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
      toast.warning(`Primary Rune "${runeName}" already exists.`);
      return;
    }
    if (runeType === 'modifier' && runeLists.modifierRunes.includes(runeName.trim())) {
      toast.warning(`Modifier Rune "${runeName}" already exists.`);
      return;
    }
    if (runeType === 'control' && runeLists.controlRunes.includes(runeName.trim())) {
      toast.warning(`Control Rune "${runeName}" already exists.`);
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

  // Count affected spells for deletion
  const getAffectedSpellCount = (type: RuneType, name: string): number => {
    switch (type) {
      case 'primary':
        return spells.filter(s => s.primaryRune === name).length;
      case 'modifier':
        return spells.filter(s => s.modifierRunes.includes(name)).length;
      case 'control':
        return spells.filter(s => s.controlRune === name).length;
      default:
        return 0;
    }
  };

  const handleDeleteRune = async (type: RuneType, name: string) => {
    switch (type) {
      case 'primary':
        await removePrimaryRune(name);
        break;
      case 'modifier':
        await removeModifierRune(name);
        break;
      case 'control':
        await removeControlRune(name);
        break;
    }
    setDeleteConfirm(null);
  };

  const handleEditStart = (type: RuneType, name: string) => {
    setEditingRune({ type, name });
    setEditValue(name);
  };

  const handleEditSave = async () => {
    if (!editingRune || !editValue.trim()) return;
    await editRune(editingRune.type, editingRune.name, editValue.trim());
    setEditingRune(null);
    setEditValue('');
  };

  const handleEditCancel = () => {
    setEditingRune(null);
    setEditValue('');
  };

  const lastBatch = batchHistory.length > 0 ? batchHistory[batchHistory.length - 1] : null;

  // Render a rune badge with edit/delete options
  const renderRuneBadge = (
    rune: string,
    type: RuneType,
    variant: 'primary' | 'modifier' | 'control' | 'base'
  ) => {
    const isEditing = editingRune?.type === type && editingRune?.name === rune;
    const isDeleting = deleteConfirm?.type === type && deleteConfirm?.name === rune;

    if (isEditing) {
      return (
        <div key={rune} className="flex items-center gap-1">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-6 w-24 text-xs px-2"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleEditSave();
              if (e.key === 'Escape') handleEditCancel();
            }}
          />
          <button
            onClick={handleEditSave}
            className="p-1 text-green-400 hover:text-green-300"
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            onClick={handleEditCancel}
            className="p-1 text-slate-400 hover:text-slate-300"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      );
    }

    if (isDeleting) {
      const count = getAffectedSpellCount(type, rune);
      return (
        <div key={rune} className="flex items-center gap-2 bg-red-900/30 border border-red-700/50 rounded px-2 py-1">
          <span className="text-xs text-red-300">
            Delete "{rune}" and {count} spells?
          </span>
          <button
            onClick={() => handleDeleteRune(type, rune)}
            className="p-1 text-red-400 hover:text-red-300"
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            onClick={() => setDeleteConfirm(null)}
            className="p-1 text-slate-400 hover:text-slate-300"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      );
    }

    return (
      <div key={rune} className="group relative inline-flex">
        <Badge variant={variant} className="pr-12">
          {rune}
        </Badge>
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => handleEditStart(type, rune)}
            className="p-0.5 text-slate-400 hover:text-white rounded"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={() => setDeleteConfirm({ type, name: rune })}
            className="p-0.5 text-slate-400 hover:text-red-400 rounded"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-dark-500/50 bg-dark-800/90 p-6 shadow-xl glow backdrop-blur-sm corner-ornament spellbook-page card-depth">
        <h2 className="mb-6 text-xl font-cinzel font-semibold text-slate-100 flex items-center gap-2">
          <span className="text-arcane-400">✦</span>
          Add New Rune
          <span className="text-arcane-400">✦</span>
        </h2>

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
            <div className="rounded-lg border border-arcane-500/30 bg-gradient-to-r from-arcane-900/30 to-mystic-900/20 px-5 py-4 text-sm arcane-border">
              <div className="flex items-center gap-3">
                <span className="text-arcane-300 text-lg animate-pulse">✦</span>
                <span className="text-slate-200 font-philosopher">
                  Will generate <strong className="text-arcane-300 text-xl font-cinzel">{expectedCount}</strong> combinations
                </span>
              </div>
            </div>
          )}

            {runeName.trim() && expectedCount === 0 && (
              <div className="rounded-md border border-amber-600/50 bg-amber-900/20 px-4 py-3 text-sm">
                <span className="text-amber-300">
                  No new combinations will be created (all would be duplicates)
                </span>
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
                expectedCount === 0 ||
                ((runeType === 'modifier' || runeType === 'control') &&
                  runeLists.primaryRunes.length === 0)
              }
            >
              Preview Combinations
            </Button>
          </form>
        ) : (
        <div className="space-y-5">
          <div className="rounded-lg bg-gradient-to-br from-arcane-900/40 to-mystic-900/30 border border-arcane-600/40 p-5 arcane-border">
            <h3 className="text-sm font-philosopher font-medium text-arcane-200 mb-3 flex items-center gap-2">
              <span className="text-mystic-400">◈</span> Confirm Generation
            </h3>
            <p className="text-sm text-slate-300 font-philosopher">
              Adding <strong className="text-white font-cinzel">{runeName}</strong> as a{' '}
              <Badge
                variant={runeType === 'primary' ? 'primary' : runeType === 'modifier' ? 'modifier' : 'control'}
                className="mx-1"
              >
                {runeType}
              </Badge>{' '}
              rune will create:
            </p>
            <p className="mt-4 text-3xl font-cinzel font-bold text-arcane-300 glow-text">{expectedCount} combinations</p>
            <p className="text-xs text-slate-400 mt-2 font-philosopher">
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

        {/* Decorative divider */}
        <div className="rune-divider mt-8 mb-6"></div>

        <div className="space-y-4">
          <h3 className="text-sm font-philosopher font-medium text-slate-300 flex items-center gap-2">
            <span className="text-mystic-400">◇</span> Current Rune Lists
          </h3>
          <p className="text-xs text-slate-500 italic">Hover over runes to edit or delete them</p>

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
                runeLists.primaryRunes.map((rune) => renderRuneBadge(rune, 'primary', 'primary'))
              ) : (
                <span className="text-xs text-slate-400 italic">None yet</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-400 w-20">Modifiers:</span>
              {runeLists.modifierRunes.map((rune) => renderRuneBadge(rune, 'modifier', 'modifier'))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-400 w-20">Controls:</span>
              {runeLists.controlRunes.map((rune) => renderRuneBadge(rune, 'control', 'control'))}
            </div>
          </div>

          <div className="pt-2 text-xs text-slate-400">
            Total combinations in database: <strong className="text-arcane-400"><AnimatedCounter value={spells.length} /></strong>
          </div>
        </div>
      </div>

      {/* Naming Configuration Panel */}
      <NamingConfig />

      {/* Tag Statistics Panel */}
      <TagStatistics />
    </div>
  );
}
