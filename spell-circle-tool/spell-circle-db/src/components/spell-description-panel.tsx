'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Save, Tag, Plus, Check } from 'lucide-react';
import type { SpellCombination } from '@/lib/types';

interface SpellDescriptionPanelProps {
  spell: SpellCombination | null;
  spellName: string;
  isOpen: boolean;
  isEditMode: boolean;
  isHoverMode: boolean;
  availableTags: string[];
  onClose: () => void;
  onSave: (description: string) => void;
  onTagsChange: (tags: string[]) => void;
  onEditModeChange: (editMode: boolean) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function SpellDescriptionPanel({
  spell,
  spellName,
  isOpen,
  isEditMode,
  isHoverMode,
  availableTags,
  onClose,
  onSave,
  onTagsChange,
  onEditModeChange,
  onMouseEnter,
  onMouseLeave,
}: SpellDescriptionPanelProps) {
  const [description, setDescription] = useState('');
  const [spellTags, setSpellTags] = useState<string[]>([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  // Sync description and tags with spell when spell changes or panel opens
  useEffect(() => {
    if (spell) {
      setDescription(spell.description || '');
      setSpellTags(spell.tags || []);
    }
  }, [spell?.id, spell?.description, spell?.tags, isOpen]);

  // Close tag dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setShowTagDropdown(false);
      }
    };
    if (showTagDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTagDropdown]);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditMode && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditMode]);

  const handleSave = () => {
    onSave(description);
    onEditModeChange(false);
  };

  const handleCancel = () => {
    setDescription(spell?.description || '');
    onEditModeChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showTagDropdown) {
        setShowTagDropdown(false);
      } else if (isEditMode) {
        handleCancel();
      } else {
        onClose();
      }
    }
    if (e.key === 's' && (e.ctrlKey || e.metaKey) && isEditMode) {
      e.preventDefault();
      handleSave();
    }
  };

  const handleAddTag = (tag: string) => {
    if (!spellTags.includes(tag)) {
      const newTags = [...spellTags, tag];
      setSpellTags(newTags);
      onTagsChange(newTags);
    }
    setShowTagDropdown(false);
  };

  const handleRemoveTag = (tag: string) => {
    const newTags = spellTags.filter(t => t !== tag);
    setSpellTags(newTags);
    onTagsChange(newTags);
  };

  // Get tags that aren't already assigned to this spell
  const availableToAdd = availableTags.filter(tag => !spellTags.includes(tag));

  if (!isOpen || !spell) return null;

  return (
    <>
      {/* Backdrop for click-outside close - only show when not in hover mode */}
      {!isHoverMode && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      
      {/* Parchment Panel - positioned to the right of viewport */}
      <div 
        className={`
          fixed right-0 top-20 h-auto max-h-[calc(100vh-10rem)] w-96 z-50
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        onKeyDown={handleKeyDown}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{
          filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.5))',
        }}
      >
        {/* Parchment paper container */}
        <div 
          className="relative rounded-sm overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #f5e6c8 0%, #e8d4a8 25%, #f2e2c4 50%, #e5d0a0 75%, #f0dfc0 100%)',
            boxShadow: `
              inset 0 0 30px rgba(139, 90, 43, 0.15),
              inset 0 0 60px rgba(139, 90, 43, 0.08),
              0 4px 20px rgba(0,0,0,0.3)
            `,
          }}
        >
          {/* Paper texture overlay */}
          <div 
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
          
          {/* Aged edge effects */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `
                radial-gradient(ellipse at top left, rgba(139, 90, 43, 0.2) 0%, transparent 50%),
                radial-gradient(ellipse at top right, rgba(139, 90, 43, 0.15) 0%, transparent 40%),
                radial-gradient(ellipse at bottom left, rgba(139, 90, 43, 0.18) 0%, transparent 45%),
                radial-gradient(ellipse at bottom right, rgba(139, 90, 43, 0.22) 0%, transparent 50%)
              `,
            }}
          />
          
          {/* Burnt/darkened edges */}
          <div 
            className="absolute inset-0 pointer-events-none rounded-sm"
            style={{
              boxShadow: `
                inset 3px 3px 15px rgba(101, 67, 33, 0.25),
                inset -3px -3px 15px rgba(101, 67, 33, 0.2),
                inset 0 0 40px rgba(139, 90, 43, 0.1)
              `,
            }}
          />

          {/* Header */}
          <div 
            className="relative flex items-center justify-between p-4"
            style={{
              borderBottom: '1px solid rgba(139, 90, 43, 0.3)',
              background: 'linear-gradient(180deg, rgba(139, 90, 43, 0.08) 0%, transparent 100%)',
            }}
          >
            <div className="flex-1 min-w-0 pr-2">
              <h3 
                className="text-sm font-medium"
                style={{ color: '#6b4423' }}
              >
                Spell Notes
              </h3>
              <p 
                className="text-base font-cinzel truncate"
                style={{ color: '#3d2914' }}
                title={spellName}
              >
                {spellName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{ 
                color: '#8b5a2b',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(139, 90, 43, 0.15)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="relative p-4 overflow-y-auto max-h-[400px]">
            {/* Tags Section */}
            {!isHoverMode && (
              <div className="mb-4">
                <div 
                  className="flex items-center gap-2 mb-2"
                  style={{ color: '#6b4423' }}
                >
                  <Tag className="h-4 w-4" />
                  <span className="text-sm font-medium">Tags</span>
                </div>
                
                <div className="flex flex-wrap gap-2 items-center">
                  {/* Current Tags */}
                  {spellTags.map(tag => (
                    <span 
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                      style={{
                        backgroundColor: 'rgba(139, 90, 43, 0.2)',
                        color: '#5c3d1e',
                        border: '1px solid rgba(139, 90, 43, 0.3)',
                      }}
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-0.5 p-0.5 rounded hover:bg-red-200/50 transition-colors"
                        title={`Remove ${tag}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  
                  {/* Add Tag Button */}
                  {availableToAdd.length > 0 && (
                    <div className="relative" ref={tagDropdownRef}>
                      <button
                        onClick={() => setShowTagDropdown(!showTagDropdown)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
                        style={{
                          backgroundColor: 'rgba(139, 90, 43, 0.1)',
                          color: '#8b5a2b',
                          border: '1px dashed rgba(139, 90, 43, 0.4)',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(139, 90, 43, 0.2)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(139, 90, 43, 0.1)'}
                      >
                        <Plus className="h-3 w-3" />
                        Add Tag
                      </button>
                      
                      {/* Dropdown */}
                      {showTagDropdown && (
                        <div 
                          className="absolute top-full left-0 mt-1 z-10 min-w-[120px] rounded shadow-lg overflow-hidden"
                          style={{
                            backgroundColor: '#f5e6c8',
                            border: '1px solid rgba(139, 90, 43, 0.4)',
                          }}
                        >
                          {availableToAdd.map(tag => (
                            <button
                              key={tag}
                              onClick={() => handleAddTag(tag)}
                              className="w-full px-3 py-2 text-left text-xs font-medium transition-colors flex items-center gap-2"
                              style={{ color: '#5c3d1e' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(139, 90, 43, 0.15)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <Check className="h-3 w-3 opacity-0" />
                              {tag}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Empty state */}
                  {spellTags.length === 0 && availableToAdd.length === 0 && (
                    <span 
                      className="text-xs italic"
                      style={{ color: '#8b7355' }}
                    >
                      No tags available
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Hover mode - show tags read-only */}
            {isHoverMode && spellTags.length > 0 && (
              <div className="mb-3">
                <div className="flex flex-wrap gap-1">
                  {spellTags.map(tag => (
                    <span 
                      key={tag}
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: 'rgba(139, 90, 43, 0.15)',
                        color: '#5c3d1e',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes Section Label */}
            {!isHoverMode && (
              <div 
                className="flex items-center gap-2 mb-2"
                style={{ color: '#6b4423' }}
              >
                <span className="text-sm font-medium">Notes</span>
              </div>
            )}

            {/* Notes Content */}
            {isEditMode ? (
              <textarea
                ref={textareaRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes about this spell's functionality, effects, or any observations..."
                className="
                  w-full min-h-[150px] p-3 rounded
                  font-philosopher text-sm leading-relaxed resize-none
                  focus:outline-none focus:ring-2
                "
                style={{
                  backgroundColor: 'rgba(255, 250, 240, 0.7)',
                  border: '1px solid rgba(139, 90, 43, 0.4)',
                  color: '#3d2914',
                  boxShadow: 'inset 0 2px 4px rgba(139, 90, 43, 0.1)',
                }}
              />
            ) : (
              <div 
                className={`
                  w-full min-h-[100px] p-3 rounded
                  ${!isHoverMode ? 'cursor-pointer' : ''}
                  transition-all duration-200
                `}
                style={{
                  backgroundColor: 'rgba(255, 250, 240, 0.5)',
                  border: '1px dashed rgba(139, 90, 43, 0.3)',
                }}
                onClick={() => !isHoverMode && onEditModeChange(true)}
                onMouseEnter={(e) => {
                  if (!isHoverMode) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 250, 240, 0.7)';
                    e.currentTarget.style.borderStyle = 'solid';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isHoverMode) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 250, 240, 0.5)';
                    e.currentTarget.style.borderStyle = 'dashed';
                  }
                }}
              >
                {description ? (
                  <p 
                    className="font-philosopher text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ color: '#3d2914' }}
                  >
                    {description}
                  </p>
                ) : (
                  <p 
                    className="font-philosopher text-sm italic"
                    style={{ color: '#8b7355' }}
                  >
                    {isHoverMode ? 'No notes yet' : 'Click to add notes...'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer - only show in non-hover mode */}
          {!isHoverMode && (
            <div 
              className="relative p-4"
              style={{
                borderTop: '1px solid rgba(139, 90, 43, 0.3)',
                background: 'linear-gradient(0deg, rgba(139, 90, 43, 0.08) 0%, transparent 100%)',
              }}
            >
              {isEditMode ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    className="flex-1 px-3 py-2 text-sm rounded font-medium transition-colors"
                    style={{
                      backgroundColor: 'rgba(139, 90, 43, 0.1)',
                      color: '#6b4423',
                      border: '1px solid rgba(139, 90, 43, 0.3)',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(139, 90, 43, 0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(139, 90, 43, 0.1)'}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 px-3 py-2 text-sm rounded font-medium transition-colors flex items-center justify-center gap-1"
                    style={{
                      backgroundColor: '#8b5a2b',
                      color: '#f5e6c8',
                      border: '1px solid #6b4423',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6b4423'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8b5a2b'}
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onEditModeChange(true)}
                  className="w-full px-3 py-2 text-sm rounded font-medium transition-colors"
                  style={{
                    backgroundColor: 'rgba(139, 90, 43, 0.15)',
                    color: '#6b4423',
                    border: '1px solid rgba(139, 90, 43, 0.3)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(139, 90, 43, 0.25)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(139, 90, 43, 0.15)'}
                >
                  Edit Notes
                </button>
              )}
              <p 
                className="text-xs mt-2 text-center"
                style={{ color: '#8b7355' }}
              >
                {isEditMode ? 'Ctrl+S to save • Esc to cancel' : 'Click to edit'}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
