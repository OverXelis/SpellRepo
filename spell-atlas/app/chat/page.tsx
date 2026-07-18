'use client';

import { useRef, useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@/components/ui/icons';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    <div className="mx-auto flex h-[calc(100dvh-var(--nav-height))] w-full max-w-4xl flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-5">
      <div className="shrink-0">
        <h1 className="page-title">Spell Research Chat</h1>
        <p className="page-subtitle">
          Describe the scene or goal. The assistant searches your spell database (read-only) for options that fit.
        </p>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-lg border border-border bg-surface-raised p-3 sm:p-4">
        <div className="space-y-4">
          {turns.length === 0 && (
            <div className="rounded-md border border-dashed border-border bg-surface p-4 text-sm text-foreground-muted">
              <p className="font-medium text-foreground">Example prompt</p>
              <p className="mt-2 italic">
                &quot;My MC is cornered in a narrow alley by two guards and needs to escape without killing them -- what do I have?&quot;
              </p>
            </div>
          )}
          {turns.map((turn, i) => (
            <div key={i} className={turn.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div className={`max-w-[min(100%,42rem)] ${turn.role === 'user' ? 'text-right' : 'text-left'}`}>
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-foreground-subtle">
                  {turn.role === 'user' ? 'You' : 'Assistant'}
                </p>
                <div
                  className={`rounded-lg px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    turn.role === 'user'
                      ? 'bg-primary text-white'
                      : turn.error
                      ? 'border border-red-900 bg-danger-muted text-red-200'
                      : 'border border-border bg-surface text-foreground'
                  }`}
                >
                  {turn.content}
                  {turn.toolTrace && turn.toolTrace.length > 0 && <ToolTrace entries={turn.toolTrace} />}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <p className="text-sm italic text-foreground-subtle">Searching the database...</p>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="mt-3 shrink-0 space-y-2"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={3}
          placeholder="Describe the scene or goal..."
          className="ui-textarea min-h-[5.5rem] text-base sm:text-sm"
        />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-foreground-subtle">Enter to send, Shift+Enter for a new line</p>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="ui-btn ui-btn-accent w-full sm:w-auto sm:min-w-[7rem]"
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ToolTrace({ entries }: { entries: ToolTraceEntry[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 border-t border-border pt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground"
      >
        {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
        {entries.length} database lookup{entries.length === 1 ? '' : 's'}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {entries.map((entry, i) => (
            <div key={i} className="rounded-md border border-border-subtle bg-background p-2.5 text-[11px] text-foreground-subtle">
              <div className="font-mono text-foreground-muted">
                {entry.name}({JSON.stringify(entry.input)})
              </div>
              <div className="mt-1 text-foreground-subtle">{entry.resultSummary}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
