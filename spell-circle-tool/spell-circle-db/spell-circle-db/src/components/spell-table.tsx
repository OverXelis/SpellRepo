'use client';

import { useState, useMemo } from 'react';
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
import { ArrowUpDown, Trash2, X } from 'lucide-react';

export function SpellTable() {
  const { spells, runeLists, deleteSpell, clearAllSpells } = useSpellStore();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo<ColumnDef<SpellCombination>[]>(
    () => [
      {
        accessorKey: 'spellName',
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
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue('spellName')}</span>
        ),
      },
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
            return <span className="text-slate-400">-</span>;
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
            return <span className="text-slate-400">-</span>;
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
            className="h-8 w-8 text-slate-400 hover:text-red-500"
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

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Spell Database
            <span className="ml-2 text-sm font-normal text-slate-500">
              ({table.getFilteredRowModel().rows.length} of {spells.length})
            </span>
          </h2>

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
          <thead className="bg-slate-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-sm font-medium text-slate-600"
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
          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-sm">
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
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
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
