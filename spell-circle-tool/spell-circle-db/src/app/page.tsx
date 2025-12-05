'use client';

import { useEffect } from 'react';
import { RuneInputForm } from '@/components/rune-input-form';
import { SpellTable } from '@/components/spell-table';
import { useSpellStore } from '@/lib/store';

export default function Home() {
  const { initialize, isLoading, isInitialized } = useSpellStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading || !isInitialized) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-arcane-500 border-r-transparent"></div>
            <p className="mt-4 text-slate-400">Loading spell database...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 glow-text">
          Spell Circle Database
        </h1>
        <p className="mt-2 text-slate-400">
          Add Primary, Modifier, or Control runes to automatically generate all
          valid spell combinations.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[350px_1fr]">
        <aside>
          <RuneInputForm />
        </aside>

        <section>
          <SpellTable />
        </section>
      </div>
    </main>
  );
}
