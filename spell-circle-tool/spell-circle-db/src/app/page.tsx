'use client';

import { useEffect } from 'react';
import { RuneInputForm } from '@/components/rune-input-form';
import { SpellTable } from '@/components/spell-table';
import { SpellCircleBg } from '@/components/spell-circle-bg';
import { DecorativeBooks } from '@/components/decorative-books';
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
        <footer className="mt-16 text-center">
          <div className="rune-divider max-w-xs mx-auto mb-6"></div>
          <p className="text-slate-600 text-sm font-philosopher">
            ✦ Crafted with arcane precision ✦
          </p>
        </footer>
      </main>
    </>
  );
}
