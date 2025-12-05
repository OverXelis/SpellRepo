'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Save } from 'lucide-react';
import type { SpellCombination } from '@/lib/types';

interface SpellDescriptionPanelProps {
  spell: SpellCombination | null;
  spellName: string;
  isOpen: boolean;
  isEditMode: boolean;
  isHoverMode: boolean;
  onClose: () => void;
  onSave: (description: string) => void;
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
  onClose,
  onSave,
  onEditModeChange,
  onMouseEnter,
  onMouseLeave,
}: SpellDescriptionPanelProps) {
  const [description, setDescription] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync description with spell when spell changes or panel opens
  useEffect(() => {
    if (spell) {
      setDescription(spell.description || '');
    }
  }, [spell?.id, spell?.description, isOpen]);

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
      if (isEditMode) {
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
          fixed right-[-24rem] top-20 h-auto max-h-[calc(100vh-10rem)] w-96 z-50
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
          <div className="relative p-4 overflow-y-auto max-h-[300px]">
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
