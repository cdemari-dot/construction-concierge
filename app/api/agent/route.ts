import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { buildTools } from "@/lib/ai/tools";

const SYSTEM_PROMPT = `You are the AI agent inside Construction Concierge, an operations and CFO dashboard for the owner of a small Ontario construction/demolition company. Speak like a sharp, plain-talking COO: short, direct, numbers first, no fluff. Use the tools to get real data before answering about cash, jobs, invoices, bills, or change orders — never invent figures. Money is in CAD. Tax and cash-flow figures are estimates; say the accountant should confirm anything that matters legally or financially. Keep answers under 180 words unless the user asks for detail.`;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.profile.role !== "owner" && user.profile.role !== "pm")) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set. Add it in your environment to enable the agent." }, { status: 503 });
  }

  const { messages } = (await request.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  const supabase = await createClient();
  const tools = buildTools(supabase);
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const toolDefs = Object.entries(tools).map(([name, t]) => ({
    name,
    description: t.description,
    input_schema: t.input_schema,
  }));

  const conversation: Anthropic.MessageParam[] = messages.map((m) => ({ role: m.role, content: m.content }));

  for (let turn = 0; turn < 6; turn++) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: toolDefs,
      messages: conversation,
    });

    const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");

    if (toolUses.length === 0) {
      const text = response.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "";
      return NextResponse.json({ reply: text });
    }

    conversation.push({ role: "assistant", content: response.content });

    const toolResults = await Promise.all(
      toolUses.map(async (call) => {
        const tool = tools[call.name as keyof typeof tools];
        const result = tool ? await tool.run() : { error: "Unknown tool" };
        return {
          type: "tool_result" as const,
          tool_use_id: call.id,
          content: JSON.stringify(result),
        };
      }),
    );

    conversation.push({ role: "user", content: toolResults });
  }

  return NextResponse.json({ reply: "I hit a loop limit gathering data — try asking again, more specifically." });
}
