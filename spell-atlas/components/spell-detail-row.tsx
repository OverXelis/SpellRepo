'use client';

import { useEffect, useState } from 'react';
import type { SpellRecord, SpellStatus } from '@/lib/core/types';
import { getSpell, updateSpellApi } from '@/lib/api-client';
import { StarIcon } from '@/components/ui/icons';

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

  if (!spell) return <p className="text-xs text-foreground-subtle">Loading details...</p>;

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
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-3">
        <div>
          <label className="ui-label mb-1.5">Custom name (blank = auto-generated)</label>
          <input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onBlur={() => save({ customName })}
            className="ui-input-sm"
          />
        </div>

        <div>
          <label className="ui-label mb-1.5">Summary (short, ~100 chars)</label>
          <input
            value={summary}
            maxLength={100}
            onChange={(e) => setSummary(e.target.value)}
            onBlur={() => save({ summary })}
            className="ui-input-sm"
          />
        </div>

        <div>
          <label className="ui-label mb-1.5">Status</label>
          <div className="flex flex-wrap gap-2">
            {(['normal', 'favorite', 'dud'] as SpellStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => save({ status: s })}
                className={`ui-btn-sm ${
                  spell.status === s
                    ? s === 'favorite'
                      ? 'bg-warning/20 text-warning'
                      : s === 'dud'
                      ? 'bg-danger-muted text-red-300'
                      : 'ui-btn-primary'
                    : 'ui-btn-secondary'
                }`}
              >
                {s === 'favorite' && <StarIcon filled className="text-warning" />}
                {s === 'favorite' ? 'Favorite' : s === 'dud' ? 'Dud' : 'Normal'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="ui-label mb-1.5">Description / notes</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => save({ description })}
            rows={5}
            className="ui-textarea"
            placeholder="How does this spell manifest? When would the MC use it? This is what the AI chat reads when discussing this spell."
          />
        </div>

        <div>
          <label className="ui-label mb-1.5">Tags</label>
          <div className="flex flex-wrap gap-1.5">
            {availableTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`ui-btn-sm ${
                  tags.includes(tag) ? 'ui-btn-primary' : 'ui-btn-secondary'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addNewTag()}
              placeholder="New tag..."
              className="ui-input-sm flex-1"
            />
            <button type="button" onClick={addNewTag} className="ui-btn-sm ui-btn-secondary">
              Add
            </button>
          </div>
          {saving && <p className="text-[11px] text-foreground-subtle">Saving...</p>}
        </div>
      </div>
    </div>
  );
}
