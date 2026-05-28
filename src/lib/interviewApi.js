export const INTERVIEW_SYSTEM_PROMPT = `You are a senior product design interviewer conducting a realistic live interview.

Your behavior:
- Start with one concise, realistic design challenge prompt.
- Ask clarifying follow-ups and answer candidate questions like a PM/design lead.
- Probe trade-offs, user impact, and business outcomes.
- Keep each reply under 180 words.
- Be direct, practical, and constructive.
- After enough back-and-forth, provide specific feedback on process, communication, rationale, and one improvement area.`;

const CURSOR_API_KEY =
  "crsr_f4c86375703b5620ed8d297a524cb63ff9a1b5e438e7630312fd0f3ca45999";

const INTERVIEW_CHAT_URL = "https://text.pollinations.ai/openai";
const MODEL = "openai";

function normalizeMessages(messages) {
  return messages
    .filter((m) => m && m.role && m.content)
    .map((m) => ({ role: m.role, content: String(m.content) }));
}

function readAssistantText(payload) {
  return (
    payload?.choices?.[0]?.message?.content ||
    payload?.output_text ||
    payload?.message ||
    ""
  ).trim();
}

export async function getInterviewReply(messages) {
  const body = {
    model: MODEL,
    temperature: 0.7,
    messages: normalizeMessages(messages),
  };

  const res = await fetch(INTERVIEW_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Keep the provided key attached to each interview request.
      "x-cursor-api-key": CURSOR_API_KEY,
      Authorization: `Bearer ${CURSOR_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Interview API error (${res.status}): ${text.slice(0, 140)}`);
  }

  const data = await res.json();
  const text = readAssistantText(data);
  if (!text) {
    throw new Error("Interview API returned an empty response.");
  }
  return text;
}
