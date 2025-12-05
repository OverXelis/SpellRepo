'use client';

import { useEffect, useState, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import type { SpellCombination, RuneNameConfig } from '@/lib/types';
import { generateSpellName } from '@/lib/spell-name-generator';
import { Star, Scroll } from 'lucide-react';

interface SpellCardPreviewProps {
  spell: SpellCombination | null;
  runeNameConfig: RuneNameConfig;
  position: { x: number; y: number } | null;
  isVisible: boolean;
}

export function SpellCardPreview({
  spell,
  runeNameConfig,
  position,
  isVisible,
}: SpellCardPreviewProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!shouldRender || !spell || !position) return null;

  const spellName = generateSpellName(spell, runeNameConfig);
  const hasCustomName = spell.customName && spell.customName.trim();

  // Calculate position to keep card in viewport
  const cardWidth = 320;
  const cardHeight = 280;
  const padding = 20;
  
  let left = position.x + 20;
  let top = position.y - cardHeight / 2;

  // Adjust if card would go off screen
  if (typeof window !== 'undefined') {
    if (left + cardWidth > window.innerWidth - padding) {
      left = position.x - cardWidth - 20;
    }
    if (top < padding) {
      top = padding;
    }
    if (top + cardHeight > window.innerHeight - padding) {
      top = window.innerHeight - cardHeight - padding;
    }
  }

  return (
    <div
      ref={cardRef}
      className={`
        fixed z-[60] pointer-events-none
        transition-all duration-300 ease-out
        ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
      `}
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${cardWidth}px`,
      }}
    >
      {/* Card Container */}
      <div 
        className="relative rounded-lg overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1a1814 0%, #15120f 50%, #1a1814 100%)',
          boxShadow: `
            0 25px 50px rgba(0, 0, 0, 0.5),
            0 0 40px rgba(0, 149, 255, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            inset 0 0 30px rgba(0, 0, 0, 0.3)
          `,
          border: '1px solid rgba(139, 115, 85, 0.3)',
        }}
      >
        {/* Ornate corner decorations */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-arcane-500/40 rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-arcane-500/40 rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-arcane-500/40 rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-arcane-500/40 rounded-br-lg" />

        {/* Paper texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Header */}
        <div 
          className="relative px-5 pt-5 pb-3"
          style={{
            background: 'linear-gradient(180deg, rgba(139, 115, 85, 0.1) 0%, transparent 100%)',
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Scroll className="w-4 h-4 text-arcane-400" />
                <span className="text-xs text-slate-500 font-philosopher">Spell Inscription</span>
              </div>
              <h3 
                className="text-xl font-cinzel font-bold text-slate-100 leading-tight"
                style={{
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                }}
              >
                {spellName}
              </h3>
              {hasCustomName && (
                <p className="text-xs text-arcane-400/70 mt-1 font-philosopher italic">
                  Custom name
                </p>
              )}
            </div>
            {spell.status === 'favorite' && (
              <Star className="w-5 h-5 text-yellow-400 fill-current flex-shrink-0" />
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5">
          <div 
            className="h-px"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(139, 115, 85, 0.4) 20%, rgba(0, 149, 255, 0.3) 50%, rgba(139, 115, 85, 0.4) 80%, transparent 100%)',
            }}
          />
        </div>

        {/* Rune Configuration */}
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-16">Base:</span>
            <Badge variant="base">{spell.circleBase}</Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-16">Primary:</span>
            <Badge variant="primary">{spell.primaryRune}</Badge>
          </div>

          {spell.modifierRunes.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-xs text-slate-500 w-16 pt-0.5">Modifiers:</span>
              <div className="flex flex-wrap gap-1">
                {spell.modifierRunes.map((mod) => (
                  <Badge key={mod} variant="modifier">{mod}</Badge>
                ))}
              </div>
            </div>
          )}

          {spell.controlRune && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-16">Control:</span>
              <Badge variant="control">{spell.controlRune}</Badge>
            </div>
          )}
        </div>

        {/* Description Preview */}
        {spell.description && spell.description.trim() && (
          <>
            <div className="mx-5">
              <div 
                className="h-px"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(139, 115, 85, 0.3) 50%, transparent 100%)',
                }}
              />
            </div>
            <div className="px-5 py-3">
              <p className="text-xs text-slate-400 font-philosopher italic line-clamp-2">
                "{spell.description}"
              </p>
            </div>
          </>
        )}

        {/* Tags */}
        {spell.tags.length > 0 && (
          <div className="px-5 pb-4">
            <div className="flex flex-wrap gap-1">
              {spell.tags.map((tag) => (
                <span 
                  key={tag}
                  className="text-xs px-2 py-0.5 rounded bg-dark-600/50 text-slate-400 border border-dark-500/50"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer glow */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
          style={{
            background: 'linear-gradient(0deg, rgba(0, 149, 255, 0.05) 0%, transparent 100%)',
          }}
        />
      </div>
    </div>
  );
}

