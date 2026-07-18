'use client';

import { useState } from 'react';
import type { TagInfo } from '@/lib/core/types';
import { addTagApi, removeTagApi, renameTagApi, setTagCategoryApi } from '@/lib/api-client';

interface Props {
  tags: TagInfo[];
  onChanged: () => void;
}

export function TagManager({ tags, onChanged }: Props) {
  const [newTag, setNewTag] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    await addTagApi(newTag.trim(), newCategory.trim() || null);
    setNewTag('');
    onChanged();
  };

  return (
    <div className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <h2 className="text-sm font-semibold text-neutral-100">Tags</h2>
      <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
        <input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          placeholder="New tag"
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100 outline-none focus:border-neutral-500"
        />
        <input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="Category (optional)"
          className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-100 outline-none focus:border-neutral-500"
        />
        <button type="submit" className="rounded bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-500">
          Add
        </button>
      </form>
      <p className="text-xs text-neutral-500">
        Grouping tags into categories (e.g. &quot;Element&quot;, &quot;Role&quot;, &quot;Situational&quot;) helps both you and the chat
        assistant browse coarsely before narrowing down.
      </p>
      <div className="flex flex-wrap gap-1.5">
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
      <div className="flex items-center gap-1 rounded border border-neutral-700 bg-neutral-950 px-1.5 py-1 text-xs">
        <input
          autoFocus
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          className="w-20 bg-transparent text-neutral-100 outline-none"
        />
        <input
          value={categoryValue}
          onChange={(e) => setCategoryValue(e.target.value)}
          placeholder="category"
          className="w-20 bg-transparent text-neutral-400 outline-none border-l border-neutral-700 pl-1"
        />
        <button onClick={save} className="text-green-400">
          ✓
        </button>
      </div>
    );
  }

  return (
    <span className="group inline-flex items-center gap-1 rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-300">
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
