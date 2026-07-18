'use client';

import { useState } from 'react';
import type { TagInfo } from '@/lib/core/types';
import { addTagApi, removeTagApi, renameTagApi, setTagCategoryApi } from '@/lib/api-client';

interface Props {
  tags: TagInfo[];
  onChanged: () => void;
}

export function TagManager({ tags, onChanged }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    await addTagApi(newTag.trim(), newCategory.trim() || null);
    setNewTag('');
    setNewCategory('');
    setShowAdd(false);
    onChanged();
  };

  return (
    <div className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-100">
          Tags <span className="text-xs font-normal text-neutral-500">({tags.length})</span>
        </h2>
        <button onClick={() => setShowAdd((v) => !v)} className="text-xs text-indigo-400 hover:text-indigo-300">
          {showAdd ? 'Cancel' : '+ Add tag'}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="flex flex-wrap gap-1.5">
          <input
            autoFocus
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Tag name"
            className="min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-100 outline-none focus:border-neutral-500"
          />
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Category (optional)"
            className="min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-100 outline-none focus:border-neutral-500"
          />
          <button type="submit" className="rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-500">
            Add
          </button>
        </form>
      )}

      <div className="flex flex-wrap gap-1">
        {tags.length === 0 && <span className="text-xs italic text-neutral-600">No tags yet</span>}
        {tags.map((tag) => <TagChip key={tag.name} tag={tag} onChanged={onChanged} />)}
      </div>
    </div>
  );
}

function TagChip({ tag, onChanged }: { tag: TagInfo; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(tag.name);
  const [categoryValue, setCategoryValue] = useState(tag.category ?? '');

  const save = async () => {
    setEditing(false);
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== tag.name) {
      await renameTagApi(tag.name, trimmed);
    }
    if (categoryValue !== (tag.category ?? '')) {
      await setTagCategoryApi(trimmed || tag.name, categoryValue.trim() || null);
    }
    onChanged();
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 rounded border border-neutral-700 bg-neutral-950 px-1.5 py-0.5 text-[11px]">
        <input
          autoFocus
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          className="w-16 bg-transparent text-neutral-100 outline-none"
        />
        <input
          value={categoryValue}
          onChange={(e) => setCategoryValue(e.target.value)}
          placeholder="category"
          className="w-16 bg-transparent text-neutral-400 outline-none border-l border-neutral-700 pl-1"
        />
        <button onClick={save} className="text-green-400">
          ✓
        </button>
      </div>
    );
  }

  return (
    <span className="group inline-flex items-center gap-1 rounded bg-neutral-800 px-1.5 py-0.5 text-[11px] text-neutral-300">
      {tag.category && <span className="text-neutral-500">{tag.category}/</span>}
      {tag.name}
      <span className="text-neutral-500">({tag.count})</span>
      <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-neutral-200">
        ✎
      </button>
      <button
        onClick={async () => {
          const countMsg = tag.count > 0 ? ` It's currently on ${tag.count} spell${tag.count === 1 ? '' : 's'}.` : '';
          if (confirm(`Delete tag "${tag.name}"?${countMsg} This only removes the tag itself, not the spells.`)) {
            await removeTagApi(tag.name);
            onChanged();
          }
        }}
        className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400"
      >
        ×
      </button>
    </span>
  );
}
