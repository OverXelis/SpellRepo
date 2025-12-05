'use client';

import { useEffect } from 'react';
import { RuneInputForm } from '@/components/rune-input-form';
import { SpellTable } from '@/components/spell-table';
import { SpellCircleBg } from '@/components/spell-circle-bg';
import { DecorativeBooks } from '@/components/decorative-books';
import { CommandPalette } from '@/components/command-palette';
import { useSpellStore } from '@/lib/store';

export default function Home() {
  const { initialize, isLoading, isInitialized } = useSpellStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading || !isInitialized) {
    return (
      <>
        <SpellCircleBg />
        <main className="relative z-10 mx-auto max-w-7xl px-4 py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center section-animate">
              {/* Magical loading spinner */}
              <div className="relative inline-block">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-arcane-500/30 border-t-arcane-400"></div>
                <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-transparent border-r-mystic-500/50" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}></div>
                <div className="absolute inset-2 h-12 w-12 animate-pulse rounded-full bg-arcane-500/10"></div>
              </div>
              <p className="mt-6 text-slate-400 font-philosopher text-lg">
                Channeling arcane energies...
              </p>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <SpellCircleBg />
      <DecorativeBooks />
      <CommandPalette />
      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pb-16">
        {/* Header Section */}
        <header className="mb-12 text-center section-animate">
          <div className="inline-block">
            <h1 className="text-4xl sm:text-5xl font-cinzel font-bold text-slate-100 tracking-wide title-underline">
              <span className="glow-text">Spell Circle Database</span>
            </h1>
          </div>
          <p className="mt-6 text-slate-400 font-philosopher text-lg max-w-2xl mx-auto">
            Craft and catalog your arcane combinations. Add Primary, Modifier, or Control runes 
            to automatically generate all valid spell configurations.
          </p>
          
          {/* Decorative divider */}
          <div className="rune-divider mt-8 max-w-md mx-auto"></div>
        </header>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-[380px_1fr] items-start">
          {/* Sidebar - Rune Input Form */}
          <aside className="section-animate" style={{ animationDelay: '100ms' }}>
            <div className="sticky top-8">
              <RuneInputForm />
            </div>
          </aside>

          {/* Main Content - Spell Table */}
          <section className="section-animate" style={{ animationDelay: '200ms' }}>
            <SpellTable />
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center relative">
          {/* Decorative rune border */}
          <div className="max-w-2xl mx-auto mb-8">
            <div 
              className="h-px"
              style={{
                background: `linear-gradient(90deg, 
                  transparent 0%, 
                  rgba(139, 115, 85, 0.2) 10%,
                  rgba(139, 115, 85, 0.4) 20%,
                  rgba(0, 149, 255, 0.3) 35%,
                  rgba(139, 92, 246, 0.4) 50%,
                  rgba(0, 149, 255, 0.3) 65%,
                  rgba(139, 115, 85, 0.4) 80%,
                  rgba(139, 115, 85, 0.2) 90%,
                  transparent 100%
                )`,
              }}
            />
            <div className="flex justify-center gap-8 -mt-2 text-slate-600 text-xs">
              <span>◆</span>
              <span>✦</span>
              <span>◇</span>
              <span>✦</span>
              <span>◆</span>
            </div>
          </div>

          {/* Wax seal version badge */}
          <div className="relative inline-block mb-4">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle at 30% 30%, #c44, #811 50%, #600)',
                boxShadow: `
                  inset 0 2px 4px rgba(255, 255, 255, 0.2),
                  inset 0 -2px 4px rgba(0, 0, 0, 0.3),
                  0 4px 8px rgba(0, 0, 0, 0.4)
                `,
              }}
            >
              <span className="text-[10px] font-cinzel font-bold text-amber-100/90 tracking-wider">
                v1.0
              </span>
            </div>
            {/* Seal drip effect */}
            <div 
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-4 rounded-b-full"
              style={{
                background: 'linear-gradient(180deg, #811, #600)',
              }}
            />
          </div>

          <p className="text-slate-500 text-sm font-philosopher mb-2">
            ✦ Spell Circle Database ✦
          </p>
          <p className="text-slate-600 text-xs font-philosopher">
            Crafted with arcane precision
          </p>
          
          {/* Keyboard shortcut hint */}
          <p className="mt-4 text-xs text-slate-700">
            Press <kbd className="px-1.5 py-0.5 bg-dark-800 rounded border border-dark-700 text-slate-500">Ctrl+K</kbd> to search
          </p>
        </footer>
      </main>
    </>
  );
}
