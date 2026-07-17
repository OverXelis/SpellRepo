'use client';

import { useRef, useState } from 'react';

interface ToolTraceEntry {
  name: string;
  input: unknown;
  resultSummary: string;
}

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  toolTrace?: ToolTraceEntry[];
  error?: boolean;
}

export default function ChatPage() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const nextTurns: ChatTurn[] = [...turns, { role: 'user', content: text }];
    setTurns(nextTurns);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextTurns.map((t) => ({ role: t.role, content: t.content })) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTurns([...nextTurns, { role: 'assistant', content: data.error || 'Something went wrong.', error: true }]);
      } else {
        setTurns([...nextTurns, { role: 'assistant', content: data.reply, toolTrace: data.toolTrace }]);
      }
    } catch {
      setTurns([...nextTurns, { role: 'assistant', content: 'Network error contacting the assistant.', error: true }]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-49px)] max-w-3xl flex-col px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-100">Spell Research Chat</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Describe the scene or goal -- the assistant will search your spell database (read-only) for options that fit.
        </p>
      </div>

      <div className="mt-4 flex-1 space-y-4 overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
        {turns.length === 0 && (
          <p className="text-sm italic text-neutral-600">
            Try: &quot;My MC is cornered in a narrow alley by two guards and needs to escape without killing them -- what do I have?&quot;
          </p>
        )}
        {turns.map((turn, i) => (
          <div key={i} className={turn.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                turn.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : turn.error
                  ? 'bg-red-950 text-red-300 border border-red-900'
                  : 'bg-neutral-800 text-neutral-100'
              }`}
            >
              {turn.content}
              {turn.toolTrace && turn.toolTrace.length > 0 && <ToolTrace entries={turn.toolTrace} />}
            </div>
          </div>
        ))}
        {loading && <p className="text-xs italic text-neutral-500">Searching the database...</p>}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mt-3 flex gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={2}
          placeholder="Describe the scene or goal..."
          className="flex-1 resize-none rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function ToolTrace({ entries }: { entries: ToolTraceEntry[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2 border-t border-neutral-700 pt-2">
      <button onClick={() => setOpen(!open)} className="text-xs text-neutral-400 hover:text-neutral-200">
        {open ? '▾' : '▸'} {entries.length} database lookup{entries.length === 1 ? '' : 's'}
      </button>
      {open && (
        <div className="mt-1 space-y-1.5">
          {entries.map((entry, i) => (
            <div key={i} className="rounded bg-neutral-950/60 p-2 text-[11px] text-neutral-500">
              <div className="font-mono text-neutral-400">
                {entry.name}({JSON.stringify(entry.input)})
              </div>
              <div className="mt-0.5 truncate text-neutral-600">{entry.resultSummary}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
