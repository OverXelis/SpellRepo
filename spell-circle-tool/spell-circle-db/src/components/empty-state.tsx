'use client';

import { Sparkles } from 'lucide-react';

interface EmptyStateProps {
  type: 'no-spells' | 'no-results' | 'no-favorites';
}

export function EmptyState({ type }: EmptyStateProps) {
  const content = {
    'no-spells': {
      title: 'Your Grimoire Awaits',
      description: 'Add a Primary Rune to begin inscribing your first spell combinations.',
      showQuill: true,
    },
    'no-results': {
      title: 'No Spells Found',
      description: 'Try adjusting your search or filters to reveal hidden incantations.',
      showQuill: false,
    },
    'no-favorites': {
      title: 'No Favorites Yet',
      description: 'Mark your most powerful spells with a star to find them quickly.',
      showQuill: false,
    },
  }[type];

  return (
    <div className="py-16 px-8 text-center">
      {/* Open spell book illustration */}
      <div className="relative inline-block mb-8">
        <svg
          width="200"
          height="140"
          viewBox="0 0 200 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mx-auto"
        >
          {/* Book base shadow */}
          <ellipse cx="100" cy="130" rx="80" ry="8" fill="rgba(0,0,0,0.3)" />
          
          {/* Left page */}
          <path
            d="M20 20 Q30 10, 100 15 L100 120 Q30 115, 20 125 Z"
            fill="#f5e6d3"
            stroke="rgba(139, 115, 85, 0.4)"
            strokeWidth="1"
          />
          {/* Left page texture lines */}
          <g opacity="0.2" stroke="#8b7355" strokeWidth="0.5">
            <line x1="35" y1="35" x2="90" y2="32" />
            <line x1="35" y1="50" x2="90" y2="47" />
            <line x1="35" y1="65" x2="90" y2="62" />
            <line x1="35" y1="80" x2="90" y2="77" />
            <line x1="35" y1="95" x2="70" y2="93" />
          </g>
          
          {/* Right page */}
          <path
            d="M180 20 Q170 10, 100 15 L100 120 Q170 115, 180 125 Z"
            fill="#faf5eb"
            stroke="rgba(139, 115, 85, 0.4)"
            strokeWidth="1"
          />
          {/* Right page - blank with subtle decoration */}
          <circle cx="140" cy="70" r="25" stroke="rgba(139, 115, 85, 0.15)" strokeWidth="1" fill="none" strokeDasharray="4 2" />
          <circle cx="140" cy="70" r="15" stroke="rgba(139, 115, 85, 0.1)" strokeWidth="1" fill="none" />
          
          {/* Book spine */}
          <rect x="96" y="12" width="8" height="115" fill="#3d2314" rx="2" />
          <line x1="100" y1="20" x2="100" y2="120" stroke="rgba(139, 115, 85, 0.3)" strokeWidth="1" />
          
          {/* Spine bands */}
          <rect x="96" y="25" width="8" height="4" fill="#c9a227" opacity="0.5" rx="1" />
          <rect x="96" y="60" width="8" height="4" fill="#c9a227" opacity="0.5" rx="1" />
          <rect x="96" y="95" width="8" height="4" fill="#c9a227" opacity="0.5" rx="1" />
          
          {/* Book cover edges */}
          <path
            d="M18 18 Q28 8, 100 13"
            stroke="#5c3d2e"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M182 18 Q172 8, 100 13"
            stroke="#5c3d2e"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          
          {/* Magical glow on right page */}
          <circle cx="140" cy="70" r="30" fill="url(#magicGlow)" opacity="0.5" />
          
          {/* Quill pen (animated) */}
          {content.showQuill && (
            <g className="animate-pulse" style={{ transformOrigin: '160px 40px' }}>
              <path
                d="M155 55 Q165 35, 175 15 Q178 12, 180 15 Q175 20, 165 45 Q160 55, 155 55"
                fill="#4a3728"
                stroke="#3d2314"
                strokeWidth="0.5"
              />
              {/* Feather detail */}
              <path
                d="M175 15 Q185 5, 190 8 Q182 15, 175 25"
                fill="#8b5a2b"
                opacity="0.8"
              />
              {/* Quill tip */}
              <path
                d="M155 55 L152 62 L158 58 Z"
                fill="#c9a227"
              />
              {/* Ink drops */}
              <circle cx="150" cy="65" r="2" fill="rgba(0, 149, 255, 0.6)">
                <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" />
              </circle>
            </g>
          )}
          
          {/* Sparkle effects */}
          <g>
            <circle cx="130" cy="50" r="1.5" fill="#0095ff" opacity="0.8">
              <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="155" cy="85" r="1" fill="#8b5cf6" opacity="0.6">
              <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" begin="0.5s" />
            </circle>
            <circle cx="125" cy="90" r="1.5" fill="#0095ff" opacity="0.7">
              <animate attributeName="opacity" values="0.7;0.2;0.7" dur="1.8s" repeatCount="indefinite" begin="1s" />
            </circle>
          </g>
          
          <defs>
            <radialGradient id="magicGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0095ff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0095ff" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      <h3 className="text-xl font-cinzel font-semibold text-slate-200 mb-3 flex items-center justify-center gap-2">
        <Sparkles className="w-5 h-5 text-arcane-400" />
        {content.title}
        <Sparkles className="w-5 h-5 text-arcane-400" />
      </h3>
      
      <p className="text-slate-400 font-philosopher max-w-md mx-auto">
        {content.description}
      </p>

      {/* Keyboard hint for command palette */}
      <p className="mt-6 text-xs text-slate-600">
        Press{' '}
        <kbd className="px-1.5 py-0.5 bg-dark-700 rounded border border-dark-600 text-slate-400">
          Ctrl
        </kbd>
        {' + '}
        <kbd className="px-1.5 py-0.5 bg-dark-700 rounded border border-dark-600 text-slate-400">
          K
        </kbd>
        {' '}to search
      </p>
    </div>
  );
}

