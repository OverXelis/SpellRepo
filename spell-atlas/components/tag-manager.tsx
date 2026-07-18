'use client';

import { useState } from 'react';
import type { TagInfo } from '@/lib/core/types';
import { addTagApi, removeTagApi, renameTagApi, setTagCategoryApi } from '@/lib/api-client';
import { CheckIcon, CloseIcon, EditIcon } from '@/components/ui/icons';

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
    <div className="ui-panel space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="ui-panel-header">
          Tags <span className="text-xs font-normal text-foreground-subtle">({tags.length})</span>
        </h2>
        <button type="button" onClick={() => setShowAdd((v) => !v)} className="ui-btn-sm ui-btn-secondary">
          {showAdd ? 'Cancel' : 'Add tag'}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <input
            autoFocus
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Tag name"
            className="ui-input-sm flex-1"
          />
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Category (optional)"
            className="ui-input-sm flex-1"
          />
          <button type="submit" className="ui-btn-sm ui-btn-primary">
            Add
          </button>
        </form>
      )}

      <div className="flex flex-wrap gap-1.5">
        {tags.length === 0 && <span className="text-xs italic text-foreground-subtle">No tags yet</span>}
        {tags.map((tag) => (
          <TagChip key={tag.name} tag={tag} onChanged={onChanged} />
        ))}
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
      <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-background px-2 py-1.5 text-[11px]">
        <input
          autoFocus
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          className="w-20 bg-transparent text-foreground outline-none"
        />
        <input
          value={categoryValue}
          onChange={(e) => setCategoryValue(e.target.value)}
          placeholder="category"
          className="w-20 border-l border-border bg-transparent pl-2 text-foreground-muted outline-none"
        />
        <button type="button" onClick={save} className="rounded p-1 text-success hover:bg-surface-hover" aria-label="Save">
          <CheckIcon />
        </button>
      </div>
    );
  }

  return (
    <span className="group inline-flex items-center gap-1 rounded-md border border-border-subtle bg-surface-raised px-2 py-1 text-[11px] text-foreground-muted">
      {tag.category && <span className="text-foreground-subtle">{tag.category}/</span>}
      {tag.name}
      <span className="text-foreground-subtle">({tag.count})</span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded p-0.5 opacity-70 hover:bg-surface-hover hover:opacity-100"
        aria-label={`Edit ${tag.name}`}
      >
        <EditIcon />
      </button>
      <button
        type="button"
        onClick={async () => {
          const countMsg = tag.count > 0 ? ` It's currently on ${tag.count} spell${tag.count === 1 ? '' : 's'}.` : '';
          if (confirm(`Delete tag "${tag.name}"?${countMsg} This only removes the tag itself, not the spells.`)) {
            await removeTagApi(tag.name);
            onChanged();
          }
        }}
        className="rounded p-0.5 opacity-70 hover:bg-danger-muted hover:text-red-300 hover:opacity-100"
        aria-label={`Delete ${tag.name}`}
      >
        <CloseIcon />
      </button>
    </span>
  );
}
