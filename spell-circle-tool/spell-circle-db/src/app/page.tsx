'use client';

import { RuneInputForm } from '@/components/rune-input-form';
import { SpellTable } from '@/components/spell-table';

export default function Home() {
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
