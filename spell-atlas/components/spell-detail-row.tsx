'use client';

import { useEffect, useState } from 'react';
import type { SpellRecord, SpellStatus } from '@/lib/core/types';
import { getSpell, updateSpellApi } from '@/lib/api-client';

interface Props {
  spellId: string;
  availableTags: string[];
  onSaved: () => void;
}

export function SpellDetailRow({ spellId, availableTags, onSaved }: Props) {
  const [spell, setSpell] = useState<SpellRecord | null>(null);
  const [description, setDescription] = useState('');
  const [customName, setCustomName] = useState('');
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSpell(spellId).then((s) => {
      setSpell(s);
      setDescription(s.description);
      setCustomName(s.customName);
      setSummary(s.summary);
      setTags(s.tags);
    });
  }, [spellId]);

  if (!spell) return <p className="text-xs text-neutral-500">Loading details...</p>;

  const save = async (patch: Partial<{ status: SpellStatus; description: string; customName: string; summary: string; tags: string[] }>) => {
    setSaving(true);
    try {
      await updateSpellApi(spellId, patch);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const toggleTag = (tag: string) => {
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    setTags(next);
    save({ tags: next });
  };

  const addNewTag = () => {
    const trimmed = newTag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    const next = [...tags, trimmed];
    setTags(next);
    save({ tags: next });
    setNewTag('');
  };

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="space-y-2">
        <label className="block text-xs font-medium text-neutral-500">Custom name (blank = auto-generated)</label>
        <input
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          onBlur={() => save({ customName })}
          className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-100 outline-none focus:border-neutral-500"
        />

        <label className="block text-xs font-medium text-neutral-500">Summary (short, ~100 chars)</label>
        <input
          value={summary}
          maxLength={100}
          onChange={(e) => setSummary(e.target.value)}
          onBlur={() => save({ summary })}
          className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-100 outline-none focus:border-neutral-500"
        />

        <label className="block text-xs font-medium text-neutral-500">Status</label>
        <div className="flex gap-2">
          {(['normal', 'favorite', 'dud'] as SpellStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => save({ status: s })}
              className={`rounded px-2 py-1 text-xs ${
                spell.status === s ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
              }`}
            >
              {s === 'favorite' ? '★ Favorite' : s === 'dud' ? '✕ Dud' : 'Normal'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-neutral-500">Description / notes</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => save({ description })}
          rows={4}
          className="w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-100 outline-none focus:border-neutral-500"
          placeholder="How does this spell manifest? When would the MC use it? This is what the AI chat reads when discussing this spell."
        />

        <label className="block text-xs font-medium text-neutral-500">Tags</label>
        <div className="flex flex-wrap gap-1.5">
          {availableTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`rounded px-2 py-0.5 text-xs ${
                tags.includes(tag) ? 'bg-indigo-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNewTag()}
            placeholder="New tag..."
            className="flex-1 rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs text-neutral-200 outline-none focus:border-neutral-600"
          />
          <button onClick={addNewTag} className="rounded bg-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700">
            Add
          </button>
        </div>
        {saving && <p className="text-[10px] text-neutral-600">Saving...</p>}
      </div>
    </div>
  );
}
