'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import type { SpellCombination, RuneNameConfig } from '@/lib/types';
import { generateSpellName } from '@/lib/spell-name-generator';
import { Star, Scroll, Sparkles } from 'lucide-react';

interface RowBounds {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

interface SpellCardPreviewProps {
  spell: SpellCombination | null;
  runeNameConfig: RuneNameConfig;
  rowBounds: RowBounds | null;
  isVisible: boolean;
}

export function SpellCardPreview({
  spell,
  runeNameConfig,
  rowBounds,
  isVisible,
}: SpellCardPreviewProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  // Track mouse position for parallax effect
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setMousePosition({ x, y });
    }
  }, []);

  useEffect(() => {
    if (isVisible && cardRef.current) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [isVisible, handleMouseMove]);

  if (!shouldRender || !spell || !rowBounds) return null;

  const spellName = generateSpellName(spell, runeNameConfig);
  const hasCustomName = spell.customName && spell.customName.trim();

  // Calculate position to keep card in viewport, anchored to the row
  const cardWidth = 340;
  const cardHeight = 320;
  const padding = 20;
  const gap = 16;
  
  // Position to the right of the row by default
  let left = rowBounds.right + gap;
  // Vertically center the card relative to the row
  let top = rowBounds.top + (rowBounds.height / 2) - (cardHeight / 2);

  // Adjust if card would go off screen
  if (typeof window !== 'undefined') {
    // If card would overflow right edge, position to the left of the row
    if (left + cardWidth > window.innerWidth - padding) {
      left = rowBounds.left - cardWidth - gap;
    }
    // If it would still overflow on the left, center it
    if (left < padding) {
      left = Math.max(padding, (window.innerWidth - cardWidth) / 2);
    }
    // Clamp vertical position to viewport
    if (top < padding) {
      top = padding;
    }
    if (top + cardHeight > window.innerHeight - padding) {
      top = window.innerHeight - cardHeight - padding;
    }
  }

  // Parallax transform calculations
  const rotateX = (mousePosition.y - 0.5) * -10;
  const rotateY = (mousePosition.x - 0.5) * 10;
  const glareX = mousePosition.x * 100;
  const glareY = mousePosition.y * 100;

  return (
    <div
      ref={cardRef}
      className={`
        fixed z-[60] pointer-events-auto
        transition-all duration-300 ease-out
        ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
      `}
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${cardWidth}px`,
        perspective: '1000px',
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Card Container with 3D transform */}
      <div 
        className="relative rounded-xl overflow-hidden transition-transform duration-150 ease-out"
        style={{
          transform: isHovering 
            ? `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)` 
            : 'rotateX(0) rotateY(0) translateZ(0)',
          transformStyle: 'preserve-3d',
          background: 'linear-gradient(135deg, #1e1a15 0%, #15120f 40%, #1a1612 100%)',
          boxShadow: `
            0 25px 60px rgba(0, 0, 0, 0.6),
            0 0 50px rgba(139, 115, 85, 0.15),
            0 0 100px rgba(0, 149, 255, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            inset 0 0 40px rgba(0, 0, 0, 0.4)
          `,
          border: '1px solid rgba(139, 115, 85, 0.35)',
        }}
      >
        {/* Glare overlay for parallax effect */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-300"
          style={{
            opacity: isHovering ? 0.15 : 0,
            background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.3) 0%, transparent 60%)`,
          }}
        />

        {/* Animated border glow */}
        <div 
          className={`absolute inset-0 rounded-xl pointer-events-none ${isVisible ? 'card-shimmer-border' : ''}`}
        />

        {/* Ornate corner decorations */}
        <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-arcane-500/50 rounded-tl-xl" />
        <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-arcane-500/50 rounded-tr-xl" />
        <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-arcane-500/50 rounded-bl-xl" />
        <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-arcane-500/50 rounded-br-xl" />

        {/* Corner sparkles */}
        <Sparkles className="absolute top-2 right-2 w-3 h-3 text-arcane-400/30" />
        <Sparkles className="absolute bottom-2 left-2 w-3 h-3 text-arcane-400/30" />

        {/* Paper texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Header */}
        <div 
          className="relative px-5 pt-5 pb-3"
          style={{
            background: 'linear-gradient(180deg, rgba(139, 115, 85, 0.12) 0%, transparent 100%)',
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <Scroll className="w-4 h-4 text-arcane-400" />
                <span className="text-xs text-slate-500 font-philosopher tracking-wide">Spell Inscription</span>
              </div>
              <h3 
                className="text-xl font-cinzel font-bold text-slate-100 leading-tight"
                style={{
                  textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
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
              <Star className="w-5 h-5 text-yellow-400 fill-current flex-shrink-0 drop-shadow-lg" />
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5">
          <div 
            className="h-px"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(139, 115, 85, 0.5) 20%, rgba(0, 149, 255, 0.4) 50%, rgba(139, 115, 85, 0.5) 80%, transparent 100%)',
            }}
          />
        </div>

        {/* Rune Configuration */}
        <div className="px-5 py-4 space-y-2.5">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-16 font-philosopher">Base:</span>
            <Badge variant="base">{spell.circleBase}</Badge>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-16 font-philosopher">Primary:</span>
            <Badge variant="primary">{spell.primaryRune}</Badge>
          </div>

          {spell.modifierRunes.length > 0 && (
            <div className="flex items-start gap-3">
              <span className="text-xs text-slate-500 w-16 pt-0.5 font-philosopher">Modifiers:</span>
              <div className="flex flex-wrap gap-1.5">
                {spell.modifierRunes.map((mod) => (
                  <Badge key={mod} variant="modifier">{mod}</Badge>
                ))}
              </div>
            </div>
          )}

          {spell.controlRune && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-16 font-philosopher">Control:</span>
              <Badge variant="control">{spell.controlRune}</Badge>
            </div>
          )}
        </div>

        {/* Notes/Description Preview */}
        {spell.description && spell.description.trim() && (
          <>
            <div className="mx-5">
              <div 
                className="h-px"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(139, 115, 85, 0.35) 50%, transparent 100%)',
                }}
              />
            </div>
            <div className="px-5 py-3">
              <p className="text-xs text-slate-500 mb-1 font-philosopher">Notes:</p>
              <p className="text-sm text-slate-300 font-philosopher italic line-clamp-3 leading-relaxed">
                "{spell.description}"
              </p>
            </div>
          </>
        )}

        {/* Tags */}
        {spell.tags.length > 0 && (
          <div className="px-5 pb-4">
            <div className="flex flex-wrap gap-1.5">
              {spell.tags.map((tag) => (
                <span 
                  key={tag}
                  className="text-xs px-2.5 py-1 rounded-full bg-dark-600/60 text-slate-400 border border-dark-500/60 font-philosopher"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer glow */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
          style={{
            background: 'linear-gradient(0deg, rgba(0, 149, 255, 0.08) 0%, transparent 100%)',
          }}
        />
      </div>

    </div>
  );
}
