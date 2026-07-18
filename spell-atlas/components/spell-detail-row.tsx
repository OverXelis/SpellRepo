'use client';

import { useEffect, useRef, useState } from 'react';
import type { SpellRecord, SpellStatus } from '@/lib/core/types';
import { getSpell, updateSpellApi } from '@/lib/api-client';
import { StarIcon } from '@/components/ui/icons';

interface Props {
  spellId: string;
  availableTags: string[];
  onSaved: () => void;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function SpellDetailRow({ spellId, availableTags, onSaved }: Props) {
  const [spell, setSpell] = useState<SpellRecord | null>(null);
  const [description, setDescription] = useState('');
  const [customName, setCustomName] = useState('');
  const [summary, setSummary] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const descriptionRef = useRef(description);
  const customNameRef = useRef(customName);
  const summaryRef = useRef(summary);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const savedClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    descriptionRef.current = description;
    customNameRef.current = customName;
    summaryRef.current = summary;
  }, [description, customName, summary]);

  useEffect(() => {
    let cancelled = false;
    getSpell(spellId).then((s) => {
      if (cancelled) return;
      setSpell(s);
      setDescription(s.description);
      setCustomName(s.customName);
      setSummary(s.summary);
      setTags(s.tags);
      setSaveState('idle');
      setSaveError(null);
    });
    return () => {
      cancelled = true;
      for (const timer of Object.values(debounceTimers.current)) clearTimeout(timer);
      if (savedClearTimer.current) clearTimeout(savedClearTimer.current);
    };
  }, [spellId]);

  const lastSavedRef = useRef<{ description: string; customName: string; summary: string } | null>(null);
  useEffect(() => {
    if (spell) {
      lastSavedRef.current = {
        description: spell.description,
        customName: spell.customName,
        summary: spell.summary,
      };
    }
  }, [spell]);

  // Flush any pending debounced text saves if the row unmounts or the tab hides.
  useEffect(() => {
    const flush = () => {
      for (const timer of Object.values(debounceTimers.current)) clearTimeout(timer);
      debounceTimers.current = {};
      const lastSaved = lastSavedRef.current;
      if (!lastSaved) return;
      const patch: Partial<{ description: string; customName: string; summary: string }> = {};
      if (descriptionRef.current !== lastSaved.description) patch.description = descriptionRef.current;
      if (customNameRef.current !== lastSaved.customName) patch.customName = customNameRef.current;
      if (summaryRef.current !== lastSaved.summary) patch.summary = summaryRef.current;
      if (Object.keys(patch).length === 0) return;
      // keepalive helps the browser finish the request during page unload.
      void fetch(`/api/spells/${spellId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
        keepalive: true,
        credentials: 'same-origin',
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      flush();
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [spellId]);

  if (!spell) return <p className="text-xs text-foreground-subtle">Loading details...</p>;

  const markSaved = () => {
    setSaveState('saved');
    if (savedClearTimer.current) clearTimeout(savedClearTimer.current);
    savedClearTimer.current = setTimeout(() => setSaveState('idle'), 1500);
  };

  const save = async (
    patch: Partial<{ status: SpellStatus; description: string; customName: string; summary: string; tags: string[] }>
  ) => {
    setSaveState('saving');
    setSaveError(null);
    try {
      const updated = await updateSpellApi(spellId, patch);
      setSpell(updated);
      setDescription(updated.description);
      setCustomName(updated.customName);
      setSummary(updated.summary);
      setTags(updated.tags);
      markSaved();
      onSaved();
      return updated;
    } catch (err) {
      setSaveState('error');
      setSaveError(err instanceof Error ? err.message : 'Save failed');
      return null;
    }
  };

  const scheduleTextSave = (field: 'description' | 'customName' | 'summary', value: string) => {
    if (debounceTimers.current[field]) clearTimeout(debounceTimers.current[field]);
    debounceTimers.current[field] = setTimeout(() => {
      delete debounceTimers.current[field];
      void save({ [field]: value });
    }, 500);
  };

  const toggleTag = (tag: string) => {
    if (spell.status === 'dud') return;
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    setTags(next);
    void save({ tags: next });
  };

  const addNewTag = () => {
    if (spell.status === 'dud') return;
    const trimmed = newTag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    const next = [...tags, trimmed];
    setTags(next);
    void save({ tags: next });
    setNewTag('');
  };

  const setStatus = (status: SpellStatus) => {
    void save({ status });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-3">
        <div>
          <label className="ui-label mb-1.5">Custom name (blank = auto-generated)</label>
          <input
            value={customName}
            onChange={(e) => {
              setCustomName(e.target.value);
              scheduleTextSave('customName', e.target.value);
            }}
            onBlur={() => {
              if (debounceTimers.current.customName) {
                clearTimeout(debounceTimers.current.customName);
                delete debounceTimers.current.customName;
              }
              void save({ customName });
            }}
            className="ui-input-sm"
          />
        </div>

        <div>
          <label className="ui-label mb-1.5">Summary (short, ~100 chars)</label>
          <input
            value={summary}
            maxLength={100}
            onChange={(e) => {
              setSummary(e.target.value);
              scheduleTextSave('summary', e.target.value);
            }}
            onBlur={() => {
              if (debounceTimers.current.summary) {
                clearTimeout(debounceTimers.current.summary);
                delete debounceTimers.current.summary;
              }
              void save({ summary });
            }}
            className="ui-input-sm"
          />
        </div>

        <div>
          <label className="ui-label mb-1.5">Status</label>
          <div className="flex flex-wrap gap-2">
            {(['normal', 'favorite', 'niche', 'dud'] as SpellStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`ui-btn-sm ${
                  spell.status === s
                    ? s === 'favorite'
                      ? 'bg-warning/20 text-warning'
                      : s === 'dud'
                        ? 'bg-danger-muted text-red-300'
                        : s === 'niche'
                          ? 'bg-surface-raised text-foreground-muted'
                          : 'ui-btn-primary'
                    : 'ui-btn-secondary'
                }`}
              >
                {s === 'favorite' && <StarIcon filled className="text-warning" />}
                {s === 'favorite' ? 'Favorite' : s === 'dud' ? 'Dud' : s === 'niche' ? 'Niche' : 'Normal'}
              </button>
            ))}
          </div>
          {spell.status === 'dud' && (
            <p className="mt-1.5 text-[11px] text-foreground-subtle">Dud spells clear their tags automatically.</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="ui-label mb-1.5">Description / notes</label>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              scheduleTextSave('description', e.target.value);
            }}
            onBlur={() => {
              if (debounceTimers.current.description) {
                clearTimeout(debounceTimers.current.description);
                delete debounceTimers.current.description;
              }
              void save({ description });
            }}
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
                disabled={spell.status === 'dud'}
                className={`ui-btn-sm ${
                  tags.includes(tag) ? 'ui-btn-primary' : 'ui-btn-secondary'
                } disabled:opacity-40`}
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
              disabled={spell.status === 'dud'}
              className="ui-input-sm flex-1 disabled:opacity-40"
            />
            <button
              type="button"
              onClick={addNewTag}
              disabled={spell.status === 'dud'}
              className="ui-btn-sm ui-btn-secondary disabled:opacity-40"
            >
              Add
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-foreground-subtle">
            {saveState === 'saving' && 'Saving…'}
            {saveState === 'saved' && 'Saved to database.'}
            {saveState === 'error' && (saveError || 'Save failed.')}
            {saveState === 'idle' && 'Edits autosave to the database.'}
          </p>
        </div>
      </div>
    </div>
  );
}
