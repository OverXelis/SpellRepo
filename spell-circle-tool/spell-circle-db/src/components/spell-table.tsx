'use client';

import { useState, useMemo, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { useSpellStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SpellCombination, SpellStatus } from '@/lib/types';
import { generateSpellName } from '@/lib/spell-name-generator';
import { 
  ArrowUpDown, 
  Trash2, 
  X, 
  Download, 
  Upload, 
  Star, 
  StarOff,
  XCircle,
  FileSpreadsheet,
  Plus,
  Tag,
  FileText,
  Pencil,
  Check
} from 'lucide-react';
import { SpellDescriptionPanel } from '@/components/spell-description-panel';
import { SpellCardPreview } from '@/components/spell-card-preview';
import { EmptyState } from '@/components/empty-state';
import { toast } from '@/lib/toast-store';

export function SpellTable() {
  const { 
    spells, 
    runeLists, 
    availableTags,
    runeNameConfig,
    deleteSpell, 
    clearAllSpells, 
    exportData, 
    importData,
    updateSpellStatus,
    updateSpellTags,
    addTag,
    updateSpellDescription,
    updateSpellCustomName,
    updateSpellSummary,
    removeTag,
    editTag,
  } = useSpellStore();
  
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [newTag, setNewTag] = useState('');
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Description panel state
  const [descriptionPanelSpell, setDescriptionPanelSpell] = useState<SpellCombination | null>(null);
  const [isDescriptionPanelOpen, setIsDescriptionPanelOpen] = useState(false);
  const [isDescriptionEditMode, setIsDescriptionEditMode] = useState(false);
  const [isDescriptionHoverMode, setIsDescriptionHoverMode] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Inline name editing state
  const [editingNameSpellId, setEditingNameSpellId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');

  // Inline summary editing state
  const [editingSummarySpellId, setEditingSummarySpellId] = useState<string | null>(null);
  const [editingSummaryValue, setEditingSummaryValue] = useState('');

  // Tag editing state
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editingTagValue, setEditingTagValue] = useState('');

  // Row selection state
  const [selectedSpellId, setSelectedSpellId] = useState<string | null>(null);

  // Hover preview state
  const [hoveredSpell, setHoveredSpell] = useState<SpellCombination | null>(null);
  const [hoverRowBounds, setHoverRowBounds] = useState<{ top: number; left: number; right: number; bottom: number; width: number; height: number } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const hoverPreviewTimeout = useRef<NodeJS.Timeout | null>(null);

  // Filter spells by status and tags, then apply default status sorting
  const filteredSpells = useMemo(() => {
    const filtered = spells.filter(spell => {
      // Status filter
      if (statusFilter !== 'all' && spell.status !== statusFilter) {
        return false;
      }
      // Tag filter
      if (tagFilter !== 'all') {
        if (tagFilter === 'untagged') {
          return spell.tags.length === 0;
        }
        return spell.tags.includes(tagFilter);
      }
      return true;
    });

    // Apply default status-based sorting (favorites first, duds last)
    // Only when no explicit column sorting is active
    if (sorting.length === 0) {
      return [...filtered].sort((a, b) => {
        const statusOrder = { favorite: 0, normal: 1, dud: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      });
    }

    return filtered;
  }, [spells, statusFilter, tagFilter, sorting]);

  const columns = useMemo<ColumnDef<SpellCombination>[]>(
    () => [
      {
        id: 'status',
        header: '',
        cell: ({ row }) => {
          const spell = row.original;
          return (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateSpellStatus(
                    spell.id, 
                    spell.status === 'favorite' ? 'normal' : 'favorite'
                  );
                }}
                className={`p-1.5 rounded transition-colors ${
                  spell.status === 'favorite' 
                    ? 'text-amber-600 hover:text-amber-500' 
                    : 'text-parchment-500 hover:text-amber-600'
                }`}
                title={spell.status === 'favorite' ? 'Remove from favorites' : 'Add to favorites'}
              >
                {spell.status === 'favorite' ? (
                  <Star className="h-5 w-5 fill-current drop-shadow-sm" />
                ) : (
                  <StarOff className="h-5 w-5" />
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateSpellStatus(
                    spell.id, 
                    spell.status === 'dud' ? 'normal' : 'dud'
                  );
                }}
                className={`p-1.5 rounded transition-colors ${
                  spell.status === 'dud' 
                    ? 'text-red-700 hover:text-red-600' 
                    : 'text-parchment-500 hover:text-red-700'
                }`}
                title={spell.status === 'dud' ? 'Remove dud marking' : 'Mark as dud'}
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
          );
        },
        size: 80,
      },
      {
        id: 'spellName',
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="flex items-center gap-2 -ml-1 px-2 py-1 rounded transition-all duration-200"
            style={{
              color: '#4a3d2e',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(180, 160, 130, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Spell
            <ArrowUpDown className="h-4 w-4" style={{ color: '#7a6a55' }} />
          </button>
        ),
        accessorFn: (row) => generateSpellName(row, runeNameConfig),
        cell: ({ row }) => {
          const spell = row.original;
          const name = generateSpellName(spell, runeNameConfig);
          const isEditingName = editingNameSpellId === spell.id;
          const isEditingSummary = editingSummarySpellId === spell.id;
          const hasCustomName = spell.customName && spell.customName.trim();
          const hasSummary = spell.summary && spell.summary.trim();

          return (
            <div className="flex flex-col gap-1 py-1">
              {/* Spell Name */}
              {isEditingName ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={editingNameValue}
                    onChange={(e) => setEditingNameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updateSpellCustomName(spell.id, editingNameValue.trim());
                        setEditingNameSpellId(null);
                      }
                      if (e.key === 'Escape') {
                        setEditingNameSpellId(null);
                      }
                    }}
                    onBlur={() => {
                      updateSpellCustomName(spell.id, editingNameValue.trim());
                      setEditingNameSpellId(null);
                    }}
                    className="bg-parchment-100 border border-parchment-500/60 rounded px-2 py-1.5 text-sm font-rocksalt text-parchment-900 focus:outline-none focus:ring-2 focus:ring-parchment-600/50 w-full max-w-xs"
                    autoFocus
                    placeholder="Leave empty for auto-name"
                  />
                  <button
                    onClick={() => {
                      updateSpellCustomName(spell.id, editingNameValue.trim());
                      setEditingNameSpellId(null);
                    }}
                    className="p-1 text-green-700 hover:text-green-600"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div 
                  className="group flex items-center gap-1 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingNameSpellId(spell.id);
                    setEditingNameValue(spell.customName || '');
                  }}
                >
                  <span className={`font-rocksalt text-base tracking-wide ${
                    spell.status === 'dud' 
                      ? 'text-parchment-600 line-through opacity-60' 
                      : spell.status === 'favorite'
                      ? 'text-amber-900'
                      : 'text-parchment-900'
                  }`}
                  style={{
                    textShadow: spell.status === 'favorite' 
                      ? '0 0 12px rgba(180, 130, 50, 0.4)' 
                      : '0 1px 0 rgba(255, 255, 255, 0.5)',
                  }}
                  >
                    {name}
                  </span>
                  {hasCustomName && (
                    <span className="text-amber-700 text-xs ml-1" title="Custom name">✎</span>
                  )}
                  <Pencil className="h-3 w-3 text-parchment-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                </div>
              )}

              {/* Summary */}
              {isEditingSummary ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={editingSummaryValue}
                    onChange={(e) => setEditingSummaryValue(e.target.value.slice(0, 100))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updateSpellSummary(spell.id, editingSummaryValue.trim());
                        setEditingSummarySpellId(null);
                      }
                      if (e.key === 'Escape') {
                        setEditingSummarySpellId(null);
                      }
                    }}
                    onBlur={() => {
                      updateSpellSummary(spell.id, editingSummaryValue.trim());
                      setEditingSummarySpellId(null);
                    }}
                    className="bg-parchment-100 border border-parchment-500/50 rounded px-2 py-1 text-base text-parchment-800 focus:outline-none focus:ring-1 focus:ring-parchment-600/50 w-full max-w-md font-caveat"
                    autoFocus
                    placeholder="Add a short summary..."
                    maxLength={100}
                  />
                  <span className="text-xs text-parchment-600 min-w-[3ch]">{editingSummaryValue.length}/100</span>
                  <button
                    onClick={() => {
                      updateSpellSummary(spell.id, editingSummaryValue.trim());
                      setEditingSummarySpellId(null);
                    }}
                    className="p-0.5 text-green-700 hover:text-green-600"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div 
                  className="group/summary flex items-center gap-1 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingSummarySpellId(spell.id);
                    setEditingSummaryValue(spell.summary || '');
                  }}
                >
                  {hasSummary ? (
                    <span className="text-base text-parchment-700 line-clamp-1 max-w-md font-caveat" style={{ color: '#4a3d30' }}>
                      {spell.summary}
                    </span>
                  ) : (
                    <span className="text-sm text-parchment-500 opacity-0 group-hover/summary:opacity-100 transition-opacity font-caveat">
                      + Add summary
                    </span>
                  )}
                  {hasSummary && (
                    <Pencil className="h-2.5 w-2.5 text-parchment-500 opacity-0 group-hover/summary:opacity-100 transition-opacity flex-shrink-0" />
                  )}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const spell = row.original;
          const hasDescription = spell.description && spell.description.trim();
          
          return (
            <div className="flex items-center gap-1">
              <div
                className="relative"
                onMouseEnter={() => {
                  if (hasDescription && !isDescriptionPanelOpen) {
                    // Clear any pending close timeout
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                      hoverTimeoutRef.current = null;
                    }
                    setDescriptionPanelSpell(spell);
                    setIsDescriptionPanelOpen(true);
                    setIsDescriptionEditMode(false);
                    setIsDescriptionHoverMode(true);
                  }
                }}
                onMouseLeave={() => {
                  if (isDescriptionHoverMode) {
                    // Small delay to allow moving to panel
                    hoverTimeoutRef.current = setTimeout(() => {
                      if (isDescriptionHoverMode) {
                        setIsDescriptionPanelOpen(false);
                        setDescriptionPanelSpell(null);
                        setIsDescriptionHoverMode(false);
                      }
                    }, 200);
                  }
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Clear any pending close timeout
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                      hoverTimeoutRef.current = null;
                    }
                    setDescriptionPanelSpell(spell);
                    setIsDescriptionPanelOpen(true);
                    setIsDescriptionEditMode(true);
                    setIsDescriptionHoverMode(false);
                  }}
                  className={`p-1.5 rounded transition-colors ${
                    hasDescription 
                      ? 'text-amber-700 hover:text-amber-600' 
                      : 'text-parchment-500 hover:text-parchment-700'
                  }`}
                  title={hasDescription ? 'View/Edit notes' : 'Add notes'}
                >
                  <FileText className={`h-4 w-4 ${hasDescription ? 'fill-amber-700/20' : ''}`} />
                </button>
              </div>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await deleteSpell(spell.id);
                }}
                className="p-1.5 rounded text-parchment-500 hover:text-red-700 transition-colors"
                title="Delete spell"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [deleteSpell, runeNameConfig, updateSpellStatus, editingNameSpellId, editingNameValue, updateSpellCustomName, editingSummarySpellId, editingSummaryValue, updateSpellSummary, isDescriptionPanelOpen, isDescriptionEditMode, isDescriptionHoverMode]
  );

  const table = useReactTable({
    data: filteredSpells,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  const clearFilters = () => {
    setGlobalFilter('');
    setColumnFilters([]);
    setStatusFilter('all');
    setTagFilter('all');
  };

  const hasActiveFilters = globalFilter || columnFilters.length > 0 || statusFilter !== 'all' || tagFilter !== 'all';

  const handleExport = async () => {
    const data = await exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spell-circle-db-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    // Get the currently filtered/displayed spells
    const rows = table.getFilteredRowModel().rows;
    
    // CSV header
    const headers = ['Spell Name', 'Summary', 'Circle Base', 'Primary Rune', 'Modifiers', 'Control', 'Tags', 'Status'];
    
    // CSV rows
    const csvRows = rows.map(row => {
      const spell = row.original;
      const name = generateSpellName(spell, runeNameConfig);
      return [
        `"${name}"`,
        `"${spell.summary || ''}"`,
        `"${spell.circleBase}"`,
        `"${spell.primaryRune}"`,
        `"${spell.modifierRunes.join(', ')}"`,
        `"${spell.controlRune || ''}"`,
        `"${spell.tags.join(', ')}"`,
        `"${spell.status}"`,
      ].join(',');
    });

    const csv = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spell-circle-db-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const success = await importData(content);
      if (success) {
        toast.success('Database imported successfully!');
      } else {
        toast.error('Failed to import database. Please check the file format.');
      }
    };
    reader.readAsText(file);

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      addTag(newTag.trim());
      setNewTag('');
      setShowNewTagInput(false);
    }
  };

  // Stats
  const favoriteCount = spells.filter(s => s.status === 'favorite').length;
  const dudCount = spells.filter(s => s.status === 'dud').length;

  return (
    <div className="rounded-xl border border-dark-500/50 bg-dark-800/90 shadow-xl glow backdrop-blur-sm spellbook-page card-depth">
      <div className="border-b border-dark-600/50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-cinzel font-semibold text-slate-100 flex items-center gap-2">
              <span className="text-arcane-400">✦</span>
              Spell Database
              <span className="ml-2 text-sm font-philosopher font-normal text-slate-400">
                ({table.getFilteredRowModel().rows.length} of {spells.length})
              </span>
            </h2>
            <div className="flex gap-4 mt-2 text-xs text-slate-500 font-philosopher">
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 text-gold-400 star-twinkle" /> {favoriteCount} favorites
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-red-400" /> {dudCount} duds
              </span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={spells.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              JSON
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={filteredSpells.length === 0}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              CSV
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>

            {spells.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (
                    confirm(
                      'Are you sure you want to clear all spells? This cannot be undone.'
                    )
                  ) {
                    await clearAllSpells();
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap gap-3">
          <Input
            placeholder="Search all columns..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-xs"
          />

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="favorite">⭐ Favorites</SelectItem>
              <SelectItem value="dud">❌ Duds</SelectItem>
            </SelectContent>
          </Select>

          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              <SelectItem value="untagged">Untagged</SelectItem>
              {availableTags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-4 w-4" />
              Clear Filters
            </Button>
          )}
        </div>

        {/* Tag Management */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Tag className="h-3 w-3" /> Available tags:
          </span>
          {availableTags.map((tag) => (
            editingTag === tag ? (
              <div key={tag} className="flex items-center gap-1">
                <Input
                  value={editingTagValue}
                  onChange={(e) => setEditingTagValue(e.target.value)}
                  className="h-6 w-24 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      editTag(tag, editingTagValue);
                      setEditingTag(null);
                    }
                    if (e.key === 'Escape') {
                      setEditingTag(null);
                    }
                  }}
                  autoFocus
                />
                <button 
                  onClick={() => {
                    editTag(tag, editingTagValue);
                    setEditingTag(null);
                  }} 
                  className="text-green-400 hover:text-green-300"
                >
                  <Check className="h-3 w-3" />
                </button>
                <button 
                  onClick={() => setEditingTag(null)} 
                  className="text-slate-400 hover:text-slate-300"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <span 
                key={tag} 
                className="group inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-dark-600 text-slate-400"
              >
                {tag}
                <button
                  onClick={() => {
                    setEditingTag(tag);
                    setEditingTagValue(tag);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-arcane-400 transition-opacity"
                  title="Edit tag"
                >
                  <Pencil className="h-2.5 w-2.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Remove tag "${tag}"? This will remove it from all spells.`)) {
                      removeTag(tag);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity"
                  title="Delete tag"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )
          ))}
          {showNewTagInput ? (
            <div className="flex items-center gap-1">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="New tag"
                className="h-6 w-24 text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTag();
                  if (e.key === 'Escape') setShowNewTagInput(false);
                }}
                autoFocus
              />
              <button onClick={handleAddTag} className="text-green-400 hover:text-green-300">
                <Plus className="h-4 w-4" />
              </button>
              <button onClick={() => setShowNewTagInput(false)} className="text-slate-400 hover:text-slate-300">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowNewTagInput(true)}
              className="text-xs text-arcane-400 hover:text-arcane-300 flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Add tag
            </button>
          )}
        </div>
      </div>

      {/* Parchment Scroll Table */}
      <div className="p-6 pt-4">
        <div className="parchment-table-wrapper">
          <div className="parchment-table">
            {/* Scroll roll - top */}
            <div className="parchment-scroll-top" />
            {/* Scroll roll - bottom */}
            <div className="parchment-scroll-bottom" />
            {/* Edge wear overlay */}
            <div className="parchment-edge-wear" />
            {/* Crease lines */}
            <div className="parchment-creases" />
            
            <div className="overflow-x-auto relative">
              <table className="w-full relative z-[1]">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} style={{ borderBottom: '2px solid rgba(139, 115, 85, 0.25)' }}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-5 py-4 text-left text-sm font-philosopher font-bold tracking-wide"
                          style={{ 
                            color: '#4a3d2e',
                            background: 'linear-gradient(180deg, rgba(215, 200, 175, 0.5) 0%, rgba(225, 212, 190, 0.3) 100%)',
                          }}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row, index) => {
                      const spell = row.original;
                      const isSelected = selectedSpellId === spell.id;
                      return (
                        <tr 
                          key={row.id} 
                          className={`table-row-animate transition-all duration-200 cursor-pointer ${
                            spell.status === 'dud' ? 'opacity-40' : ''
                          }`}
                          style={{ 
                            animationDelay: `${Math.min(index * 30, 300)}ms`,
                            background: isSelected 
                              ? 'linear-gradient(90deg, rgba(180, 150, 100, 0.25) 0%, rgba(200, 175, 130, 0.15) 50%, rgba(180, 150, 100, 0.25) 100%)'
                              : spell.status === 'favorite'
                              ? 'linear-gradient(90deg, rgba(200, 170, 100, 0.15) 0%, rgba(220, 190, 130, 0.08) 50%, rgba(200, 170, 100, 0.15) 100%)'
                              : index % 2 === 0 
                              ? 'transparent' 
                              : 'rgba(180, 160, 130, 0.08)',
                            borderBottom: '1px solid rgba(139, 115, 85, 0.15)',
                          }}
                          onClick={() => setSelectedSpellId(isSelected ? null : spell.id)}
                          onMouseEnter={(e) => {
                            // Hover background effect
                            if (!isSelected) {
                              e.currentTarget.style.background = 'linear-gradient(90deg, rgba(170, 145, 100, 0.18) 0%, rgba(190, 165, 120, 0.12) 50%, rgba(170, 145, 100, 0.18) 100%)';
                            }
                            // Hover card preview
                            if (hoverPreviewTimeout.current) {
                              clearTimeout(hoverPreviewTimeout.current);
                            }
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredSpell(spell);
                            setHoverRowBounds({
                              top: rect.top,
                              left: rect.left,
                              right: rect.right,
                              bottom: rect.bottom,
                              width: rect.width,
                              height: rect.height,
                            });
                            hoverPreviewTimeout.current = setTimeout(() => {
                              setShowPreview(true);
                            }, 300);
                          }}
                          onMouseLeave={(e) => {
                            // Reset hover background
                            if (!isSelected) {
                              e.currentTarget.style.background = spell.status === 'favorite'
                                ? 'linear-gradient(90deg, rgba(200, 170, 100, 0.15) 0%, rgba(220, 190, 130, 0.08) 50%, rgba(200, 170, 100, 0.15) 100%)'
                                : index % 2 === 0 
                                ? 'transparent' 
                                : 'rgba(180, 160, 130, 0.08)';
                            }
                            // Hide hover card preview
                            if (hoverPreviewTimeout.current) {
                              clearTimeout(hoverPreviewTimeout.current);
                            }
                            setShowPreview(false);
                            setHoveredSpell(null);
                            setHoverRowBounds(null);
                          }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td 
                        key={cell.id} 
                        className="px-5 py-4 text-sm ink-text"
                        style={{ color: '#2d251c' }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={columns.length} style={{ background: 'rgba(235, 225, 205, 0.5)' }}>
                  <EmptyState type={spells.length === 0 ? 'no-spells' : 'no-results'} />
                </td>
              </tr>
            )}
                </tbody>
              </table>
            </div>

            {/* Pagination inside parchment */}
            {filteredSpells.length > 0 && (
              <div 
                className="flex items-center justify-between px-5 py-4 relative z-[1]"
                style={{ 
                  borderTop: '2px solid rgba(139, 115, 85, 0.2)',
                  background: 'linear-gradient(0deg, rgba(200, 185, 160, 0.3) 0%, rgba(215, 200, 175, 0.15) 100%)',
                }}
              >
                <div className="text-sm font-philosopher font-medium" style={{ color: '#5c4d3d' }}>
                  Page {table.getState().pagination.pageIndex + 1} of{' '}
                  {table.getPageCount()}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="px-4 py-2 text-sm font-philosopher font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                    style={{ 
                      color: '#4a3d2e',
                      background: 'linear-gradient(180deg, rgba(235, 225, 205, 0.9) 0%, rgba(215, 200, 175, 0.9) 100%)',
                      borderRadius: '4px',
                      border: '1px solid rgba(139, 115, 85, 0.3)',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)',
                    }}
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="px-4 py-2 text-sm font-philosopher font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                    style={{ 
                      color: '#4a3d2e',
                      background: 'linear-gradient(180deg, rgba(235, 225, 205, 0.9) 0%, rgba(215, 200, 175, 0.9) 100%)',
                      borderRadius: '4px',
                      border: '1px solid rgba(139, 115, 85, 0.3)',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)',
                    }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description Panel */}
      <SpellDescriptionPanel
        spell={descriptionPanelSpell}
        spellName={descriptionPanelSpell ? generateSpellName(descriptionPanelSpell, runeNameConfig) : ''}
        isOpen={isDescriptionPanelOpen}
        isEditMode={isDescriptionEditMode}
        isHoverMode={isDescriptionHoverMode}
        onClose={() => {
          setIsDescriptionPanelOpen(false);
          setDescriptionPanelSpell(null);
          setIsDescriptionEditMode(false);
          setIsDescriptionHoverMode(false);
        }}
        onSave={async (description) => {
          if (descriptionPanelSpell) {
            await updateSpellDescription(descriptionPanelSpell.id, description);
            // Update the local reference to show the new description
            setDescriptionPanelSpell({
              ...descriptionPanelSpell,
              description,
            });
          }
        }}
        onEditModeChange={setIsDescriptionEditMode}
        onMouseEnter={() => {
          // Clear any pending close timeout when entering panel
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
          }
        }}
        onMouseLeave={() => {
          // Close panel when leaving in hover mode
          if (isDescriptionHoverMode) {
            setIsDescriptionPanelOpen(false);
            setDescriptionPanelSpell(null);
            setIsDescriptionHoverMode(false);
          }
        }}
      />

      {/* Spell Card Hover Preview */}
      <SpellCardPreview
        spell={hoveredSpell}
        runeNameConfig={runeNameConfig}
        rowBounds={hoverRowBounds}
        isVisible={showPreview && !isDescriptionPanelOpen}
      />
    </div>
  );
}
