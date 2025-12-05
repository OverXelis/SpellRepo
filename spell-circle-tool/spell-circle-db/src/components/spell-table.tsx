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
import type { SpellCombination } from '@/lib/types';
import { ArrowUpDown, Trash2, X, Download, Upload } from 'lucide-react';

export function SpellTable() {
  const { spells, runeLists, deleteSpell, clearAllSpells, exportData, importData } = useSpellStore();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const columns = useMemo<ColumnDef<SpellCombination>[]>(
    () => [
      {
        accessorKey: 'circleBase',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-4"
          >
            Circle Base
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
            Primary Rune
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
            return <span className="text-slate-600">-</span>;
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
            return <span className="text-slate-600">-</span>;
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
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteSpell(row.original.id)}
            className="h-8 w-8 text-slate-500 hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [deleteSpell]
  );

  const table = useReactTable({
    data: spells,
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
  };

  const hasActiveFilters = globalFilter || columnFilters.length > 0;

  const handleExport = () => {
    const data = exportData();
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

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importData(content);
      if (success) {
        alert('Database imported successfully!');
      } else {
        alert('Failed to import database. Please check the file format.');
      }
    };
    reader.readAsText(file);

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-lg border border-dark-600 bg-dark-800 shadow-lg glow">
      <div className="border-b border-dark-600 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-100">
            Spell Database
            <span className="ml-2 text-sm font-normal text-slate-500">
              ({table.getFilteredRowModel().rows.length} of {spells.length})
            </span>
          </h2>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={spells.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export
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
                onClick={() => {
                  if (
                    confirm(
                      'Are you sure you want to clear all spells? This cannot be undone.'
                    )
                  ) {
                    clearAllSpells();
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
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Circle Base" />
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
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Primary Rune" />
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
            <SelectTrigger className="w-[150px]">
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
            <SelectTrigger className="w-[150px]">
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
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-dark-700">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-sm font-medium text-slate-400"
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
          <tbody className="divide-y divide-dark-700">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-dark-700/50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-sm text-slate-300">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-slate-500"
                >
                  {spells.length === 0
                    ? 'No spells yet. Add a Primary Rune to generate combinations.'
                    : 'No spells match your filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {spells.length > 0 && (
        <div className="flex items-center justify-between border-t border-dark-600 px-4 py-3">
          <div className="text-sm text-slate-500">
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
    </div>
  );
}
