'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  const [isHovering, setIsHovering] = useState(false);
  const [mounted, setMounted] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Handle client-side mounting for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Track mouse position for parallax effect
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      setMousePosition({ x, y });
    }
  }, []);

  useEffect(() => {
    if (isVisible) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [isVisible, handleMouseMove]);

  // Don't render if not visible, missing data, or not mounted (SSR)
  if (!mounted || !isVisible || !spell || !rowBounds) {
    return null;
  }

  const spellName = generateSpellName(spell, runeNameConfig);
  const hasCustomName = spell.customName && spell.customName.trim();

  // Calculate position to keep card in viewport, anchored to the row
  const cardWidth = 340;
  const cardHeight = 380;
  const padding = 20;
  const gap = 16;
  
  // Get viewport dimensions
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  
  // Position to the right of the row by default
  let left = rowBounds.right + gap;
  // Vertically center the card relative to the row
  let top = rowBounds.top + (rowBounds.height / 2) - (cardHeight / 2);

  // If card would overflow right edge, position to the left of the row
  if (left + cardWidth > viewportWidth - padding) {
    left = rowBounds.left - cardWidth - gap;
  }
  // If it would still overflow on the left, center it in viewport
  if (left < padding) {
    left = Math.max(padding, (viewportWidth - cardWidth) / 2);
  }
  // Clamp vertical position to viewport
  if (top < padding) {
    top = padding;
  }
  if (top + cardHeight > viewportHeight - padding) {
    top = viewportHeight - cardHeight - padding;
  }

  // Parallax transform calculations
  const rotateX = (mousePosition.y - 0.5) * -8;
  const rotateY = (mousePosition.x - 0.5) * 8;
  const glareX = mousePosition.x * 100;
  const glareY = mousePosition.y * 100;

  const cardContent = (
    <div
      ref={cardRef}
      className="fixed z-[9999] pointer-events-auto card-float-in"
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
        className="relative rounded-xl overflow-hidden transition-transform duration-200 ease-out"
        style={{
          transform: isHovering 
            ? `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(20px)` 
            : 'rotateX(0) rotateY(0) translateZ(0)',
          transformStyle: 'preserve-3d',
          background: 'linear-gradient(145deg, #1e1a15 0%, #15120f 50%, #1a1612 100%)',
          boxShadow: `
            0 30px 60px rgba(0, 0, 0, 0.7),
            0 0 60px rgba(139, 115, 85, 0.2),
            0 0 120px rgba(0, 149, 255, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.1),
            inset 0 0 50px rgba(0, 0, 0, 0.5)
          `,
          border: '1px solid rgba(139, 115, 85, 0.4)',
        }}
      >
        {/* Glare overlay for parallax effect */}
        <div 
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 rounded-xl"
          style={{
            opacity: isHovering ? 0.2 : 0,
            background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.4) 0%, transparent 50%)`,
          }}
        />

        {/* Animated border glow */}
        <div className="absolute inset-0 rounded-xl pointer-events-none card-shimmer-border" />

        {/* Ornate corner decorations */}
        <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-arcane-500/60 rounded-tl-xl" />
        <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-arcane-500/60 rounded-tr-xl" />
        <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-arcane-500/60 rounded-bl-xl" />
        <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-arcane-500/60 rounded-br-xl" />

        {/* Corner sparkles */}
        <Sparkles className="absolute top-3 right-3 w-4 h-4 text-arcane-400/40" />
        <Sparkles className="absolute bottom-3 left-3 w-4 h-4 text-arcane-400/40" />

        {/* Paper texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Header */}
        <div 
          className="relative px-6 pt-6 pb-4"
          style={{
            background: 'linear-gradient(180deg, rgba(139, 115, 85, 0.15) 0%, transparent 100%)',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Scroll className="w-4 h-4 text-arcane-400 flex-shrink-0" />
                <span className="text-xs text-slate-500 font-philosopher tracking-wide uppercase">Spell Inscription</span>
              </div>
              <h3 
                className="text-xl font-cinzel font-bold text-slate-100 leading-tight truncate"
                style={{
                  textShadow: '0 2px 10px rgba(0, 0, 0, 0.7)',
                }}
              >
                {spellName}
              </h3>
              {hasCustomName && (
                <p className="text-xs text-arcane-400/80 mt-1 font-philosopher italic">
                  Custom name
                </p>
              )}
            </div>
            {spell.status === 'favorite' && (
              <Star className="w-6 h-6 text-yellow-400 fill-current flex-shrink-0 drop-shadow-lg star-twinkle" />
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="mx-6">
          <div 
            className="h-px"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(139, 115, 85, 0.6) 20%, rgba(0, 149, 255, 0.5) 50%, rgba(139, 115, 85, 0.6) 80%, transparent 100%)',
            }}
          />
        </div>

        {/* Rune Configuration */}
        <div className="px-6 py-5 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-20 font-philosopher">Base:</span>
            <Badge variant="base">{spell.circleBase}</Badge>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-20 font-philosopher">Primary:</span>
            <Badge variant="primary">{spell.primaryRune}</Badge>
          </div>

          {spell.modifierRunes.length > 0 && (
            <div className="flex items-start gap-3">
              <span className="text-xs text-slate-500 w-20 pt-0.5 font-philosopher">Modifiers:</span>
              <div className="flex flex-wrap gap-1.5">
                {spell.modifierRunes.map((mod) => (
                  <Badge key={mod} variant="modifier">{mod}</Badge>
                ))}
              </div>
            </div>
          )}

          {spell.controlRune && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-20 font-philosopher">Control:</span>
              <Badge variant="control">{spell.controlRune}</Badge>
            </div>
          )}
        </div>

        {/* Notes/Description Preview */}
        {spell.description && spell.description.trim() && (
          <>
            <div className="mx-6">
              <div 
                className="h-px"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(139, 115, 85, 0.4) 50%, transparent 100%)',
                }}
              />
            </div>
            <div className="px-6 py-4">
              <p className="text-xs text-slate-500 mb-1.5 font-philosopher uppercase tracking-wide">Notes</p>
              <p className="text-sm text-slate-300 font-philosopher italic line-clamp-3 leading-relaxed">
                "{spell.description}"
              </p>
            </div>
          </>
        )}

        {/* Tags */}
        {spell.tags.length > 0 && (
          <div className="px-6 pb-5">
            <p className="text-xs text-slate-500 mb-2 font-philosopher uppercase tracking-wide">Tags</p>
            <div className="flex flex-wrap gap-2">
              {spell.tags.map((tag) => (
                <span 
                  key={tag}
                  className="text-xs px-3 py-1 rounded-full bg-dark-600/70 text-slate-300 border border-dark-500/70 font-philosopher"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer glow */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none rounded-b-xl"
          style={{
            background: 'linear-gradient(0deg, rgba(0, 149, 255, 0.1) 0%, transparent 100%)',
          }}
        />
      </div>
    </div>
  );

  // Use portal to render at document body level to escape any stacking contexts
  return createPortal(cardContent, document.body);
}
