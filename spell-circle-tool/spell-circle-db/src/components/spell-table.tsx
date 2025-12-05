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
import { Badge } from '@/components/ui/badge';
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

  // Tag editing state
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editingTagValue, setEditingTagValue] = useState('');

  // Row selection state
  const [selectedSpellId, setSelectedSpellId] = useState<string | null>(null);

  // Hover preview state
  const [hoveredSpell, setHoveredSpell] = useState<SpellCombination | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
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
                onClick={() => updateSpellStatus(
                  spell.id, 
                  spell.status === 'favorite' ? 'normal' : 'favorite'
                )}
                className={`p-1 rounded transition-colors ${
                  spell.status === 'favorite' 
                    ? 'text-yellow-400 hover:text-yellow-300' 
                    : 'text-slate-600 hover:text-yellow-400'
                }`}
                title={spell.status === 'favorite' ? 'Remove from favorites' : 'Add to favorites'}
              >
                {spell.status === 'favorite' ? (
                  <Star className="h-4 w-4 fill-current" />
                ) : (
                  <StarOff className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => updateSpellStatus(
                  spell.id, 
                  spell.status === 'dud' ? 'normal' : 'dud'
                )}
                className={`p-1 rounded transition-colors ${
                  spell.status === 'dud' 
                    ? 'text-red-400 hover:text-red-300' 
                    : 'text-slate-600 hover:text-red-400'
                }`}
                title={spell.status === 'dud' ? 'Remove dud marking' : 'Mark as dud'}
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          );
        },
        size: 70,
      },
      {
        id: 'spellName',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Spell Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        accessorFn: (row) => generateSpellName(row, runeNameConfig),
        cell: ({ row }) => {
          const spell = row.original;
          const name = generateSpellName(spell, runeNameConfig);
          const isEditing = editingNameSpellId === spell.id;
          const hasCustomName = spell.customName && spell.customName.trim();

          if (isEditing) {
            return (
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
                  className="bg-dark-700 border border-arcane-500/50 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-arcane-500 w-full"
                  autoFocus
                  placeholder="Leave empty for auto-name"
                />
                <button
                  onClick={() => {
                    updateSpellCustomName(spell.id, editingNameValue.trim());
                    setEditingNameSpellId(null);
                  }}
                  className="p-1 text-green-400 hover:text-green-300"
                >
                  <Check className="h-4 w-4" />
                </button>
              </div>
            );
          }

          return (
            <div 
              className="group flex items-center gap-1 cursor-pointer"
              onClick={() => {
                setEditingNameSpellId(spell.id);
                setEditingNameValue(spell.customName || '');
              }}
            >
              <span className={`font-medium ${
                spell.status === 'dud' 
                  ? 'text-slate-500 line-through' 
                  : spell.status === 'favorite'
                  ? 'text-yellow-300'
                  : 'text-slate-200'
              }`}>
                {name}
              </span>
              {hasCustomName && (
                <span className="text-arcane-400 text-xs ml-1" title="Custom name">✎</span>
              )}
              <Pencil className="h-3 w-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
            </div>
          );
        },
      },
      {
        accessorKey: 'circleBase',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Base
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <Badge variant="base">{row.getValue('circleBase')}</Badge>
        ),
        filterFn: 'equals',
      },
      {
        accessorKey: 'primaryRune',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Primary
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <Badge variant="primary">{row.getValue('primaryRune')}</Badge>
        ),
        filterFn: 'equals',
      },
      {
        accessorKey: 'modifierRunes',
        header: 'Modifiers',
        cell: ({ row }) => {
          const modifiers = row.getValue('modifierRunes') as string[];
          if (modifiers.length === 0) {
            return <span className="text-slate-500">-</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {modifiers.map((mod) => (
                <Badge key={mod} variant="modifier">
                  {mod}
                </Badge>
              ))}
            </div>
          );
        },
        filterFn: (row, columnId, filterValue) => {
          if (!filterValue || filterValue === 'all') return true;
          const modifiers = row.getValue(columnId) as string[];
          if (filterValue === 'none') return modifiers.length === 0;
          return modifiers.includes(filterValue);
        },
      },
      {
        accessorKey: 'controlRune',
        header: 'Control',
        cell: ({ row }) => {
          const control = row.getValue('controlRune') as string | null;
          if (!control) {
            return <span className="text-slate-500">-</span>;
          }
          return <Badge variant="control">{control}</Badge>;
        },
        filterFn: (row, columnId, filterValue) => {
          if (!filterValue || filterValue === 'all') return true;
          const control = row.getValue(columnId) as string | null;
          if (filterValue === 'none') return !control;
          return control === filterValue;
        },
      },
      {
        id: 'tags',
        header: 'Tags',
        cell: ({ row }) => {
          const spell = row.original;
          return (
            <div className="flex flex-wrap items-center gap-1">
              {spell.tags.map((tag) => (
                <span 
                  key={tag} 
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-dark-600 text-slate-300"
                >
                  {tag}
                  <button
                    onClick={() => updateSpellTags(spell.id, spell.tags.filter(t => t !== tag))}
                    className="hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <Select
                value=""
                onValueChange={(value) => {
                  if (value && !spell.tags.includes(value)) {
                    updateSpellTags(spell.id, [...spell.tags, value]);
                  }
                }}
              >
                <SelectTrigger className="h-6 w-6 p-0 border-0 bg-transparent">
                  <Plus className="h-3 w-3 text-slate-500 hover:text-slate-300" />
                </SelectTrigger>
                <SelectContent>
                  {availableTags.filter(t => !spell.tags.includes(t)).map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                      ? 'text-arcane-400 hover:text-arcane-300' 
                      : 'text-slate-600 hover:text-slate-400'
                  }`}
                  title={hasDescription ? 'View/Edit notes' : 'Add notes'}
                >
                  <FileText className={`h-4 w-4 ${hasDescription ? 'fill-arcane-400/20' : ''}`} />
                </button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => await deleteSpell(spell.id)}
                className="h-8 w-8 text-slate-400 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [deleteSpell, runeNameConfig, updateSpellStatus, updateSpellTags, availableTags, editingNameSpellId, editingNameValue, updateSpellCustomName, isDescriptionPanelOpen, isDescriptionEditMode, isDescriptionHoverMode]
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
    const headers = ['Spell Name', 'Circle Base', 'Primary Rune', 'Modifiers', 'Control', 'Tags', 'Status'];
    
    // CSV rows
    const csvRows = rows.map(row => {
      const spell = row.original;
      const name = generateSpellName(spell, runeNameConfig);
      return [
        `"${name}"`,
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

          <Select
            value={
              (table.getColumn('circleBase')?.getFilterValue() as string) ?? 'all'
            }
            onValueChange={(value) =>
              table
                .getColumn('circleBase')
                ?.setFilterValue(value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Base" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bases</SelectItem>
              {runeLists.circleBases.map((base) => (
                <SelectItem key={base} value={base}>
                  {base}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={
              (table.getColumn('primaryRune')?.getFilterValue() as string) ?? 'all'
            }
            onValueChange={(value) =>
              table
                .getColumn('primaryRune')
                ?.setFilterValue(value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Primary" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Primary</SelectItem>
              {runeLists.primaryRunes.map((rune) => (
                <SelectItem key={rune} value={rune}>
                  {rune}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={
              (table.getColumn('modifierRunes')?.getFilterValue() as string) ??
              'all'
            }
            onValueChange={(value) =>
              table
                .getColumn('modifierRunes')
                ?.setFilterValue(value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Modifier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modifiers</SelectItem>
              <SelectItem value="none">No Modifier</SelectItem>
              {runeLists.modifierRunes.map((rune) => (
                <SelectItem key={rune} value={rune}>
                  {rune}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={
              (table.getColumn('controlRune')?.getFilterValue() as string) ?? 'all'
            }
            onValueChange={(value) =>
              table
                .getColumn('controlRune')
                ?.setFilterValue(value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Control" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Controls</SelectItem>
              <SelectItem value="none">No Control</SelectItem>
              {runeLists.controlRunes.map((rune) => (
                <SelectItem key={rune} value={rune}>
                  {rune}
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

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="sticky-header bg-dark-700/95 backdrop-blur-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-4 text-left text-sm font-philosopher font-medium text-slate-400 border-b border-dark-600/50"
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
          <tbody className="divide-y divide-dark-700/50">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row, index) => {
                const spell = row.original;
                const isSelected = selectedSpellId === spell.id;
                return (
                  <tr 
                    key={row.id} 
                    className={`table-row-animate table-row-alt transition-colors duration-150 cursor-pointer ${
                      spell.status === 'dud' ? 'opacity-50' : ''
                    } ${spell.status === 'favorite' ? 'bg-gold-900/5' : ''} ${
                      isSelected ? 'row-selected' : ''
                    }`}
                    style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
                    onClick={() => setSelectedSpellId(isSelected ? null : spell.id)}
                    onMouseEnter={(e) => {
                      if (hoverPreviewTimeout.current) {
                        clearTimeout(hoverPreviewTimeout.current);
                      }
                      setHoveredSpell(spell);
                      setHoverPosition({ x: e.clientX, y: e.clientY });
                      hoverPreviewTimeout.current = setTimeout(() => {
                        setShowPreview(true);
                      }, 500);
                    }}
                    onMouseMove={(e) => {
                      if (hoveredSpell?.id === spell.id) {
                        setHoverPosition({ x: e.clientX, y: e.clientY });
                      }
                    }}
                    onMouseLeave={() => {
                      if (hoverPreviewTimeout.current) {
                        clearTimeout(hoverPreviewTimeout.current);
                      }
                      setShowPreview(false);
                      setHoveredSpell(null);
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-sm text-slate-300">
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
                <td colSpan={columns.length}>
                  <EmptyState type={spells.length === 0 ? 'no-spells' : 'no-results'} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredSpells.length > 0 && (
        <div className="flex items-center justify-between border-t border-dark-600 px-4 py-3">
          <div className="text-sm text-slate-400">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}

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
        position={hoverPosition}
        isVisible={showPreview && !isDescriptionPanelOpen}
      />
    </div>
  );
}
