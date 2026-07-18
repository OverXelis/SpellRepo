import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '@/lib/db/client';
import { ensureDefaultRunesSeeded } from '@/lib/db/naming';
import { getTaxonomy } from '@/lib/db/taxonomy';
import { buildSystemPrompt } from '@/lib/ai/system-prompt';
import { CHAT_TOOLS, executeTool } from '@/lib/ai/tools';
import { withErrorHandling } from '@/lib/api-utils';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
const MAX_TOOL_TURNS = 6;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ToolTraceEntry {
  name: string;
  input: unknown;
  resultSummary: string;
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured on the server. Set it as an environment variable.' },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const messages = (body.messages ?? []) as ChatMessage[];
  if (messages.length === 0) {
    return NextResponse.json({ error: 'messages is required' }, { status: 400 });
  }

  const db = getDb();
  ensureDefaultRunesSeeded(db);
  const taxonomy = getTaxonomy(db);
  const systemPrompt = buildSystemPrompt(taxonomy);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let conversation: Anthropic.MessageParam[] = messages.map((m) => ({ role: m.role, content: m.content }));
  const toolTrace: ToolTraceEntry[] = [];

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        tools: CHAT_TOOLS,
        messages: conversation,
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Claude API request failed' },
        { status: 502 }
      );
    }

    if (response.stop_reason !== 'tool_use') {
      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n');
      return NextResponse.json({ reply: text, toolTrace });
    }

    conversation = [...conversation, { role: 'assistant', content: response.content }];

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      const result = await executeTool(block.name, block.input);
      const resultJson = JSON.stringify(result);
      toolTrace.push({ name: block.name, input: block.input, resultSummary: resultJson.slice(0, 500) });
      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: resultJson,
      });
    }

    conversation = [...conversation, { role: 'user', content: toolResults }];
  }

  return NextResponse.json({
    reply:
      "I wasn't able to finish narrowing this down in the allotted number of lookups -- try asking a more specific question (e.g. mention a rune, tag, or circle base you have in mind).",
    toolTrace,
  });
});
