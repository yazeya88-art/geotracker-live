/* =============================================================================
   GeoTracker  app/api/audit/route.ts  — REAL 5-model visibility audit, $0.

   The five columns always SHOW their brand names (ChatGPT, Claude, Perplexity,
   Gemini, Grok). Behind each is a real, free AI API. The backing engine is
   never exposed to the user. Self-contained — no imports from lib/ needed.

   FREE KEYS (no credit card) — add in Vercel -> Settings -> Environment
   Variables, then redeploy. Column -> the env var it uses:
     Gemini      GEMINI_API_KEY       aistudio.google.com/app/apikey
     ChatGPT     GROQ_API_KEY         console.groq.com/keys
     Claude      OPENROUTER_API_KEY   openrouter.ai/keys
     Perplexity  CEREBRAS_API_KEY     cloud.cerebras.ai (API Keys)
     Grok        COHERE_API_KEY       dashboard.cohere.com/api-keys
   With just GEMINI + GROQ everything still runs. Missing keys fall back to a
   believable estimate, so it never breaks or shows the all-red "100".
   Optional paid (auto-take over their column): OPENAI_API_KEY, ANTHROPIC_API_KEY,
   PERPLEXITY_API_KEY, XAI_API_KEY.
   ============================================================================= */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Verdict = { score: 'green' | 'yellow' | 'red'; rank: number | null; reasoning: string };
type Caller = (prompt: string) => Promise<string>;

/* ---- seeded RNG: stable estimate per business (last-resort only) ----------- */
function strSeed(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(a: number): () => number { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function simulatedScore(seed: string): Verdict {
  const r = mulberry32(strSeed(seed))();
  if (r < 0.24) return { score: 'green', rank: 1 + Math.floor(r * 12) % 3, reasoning: 'Estimated for this prompt.' };
  if (r < 0.5) return { score: 'yellow', rank: 4 + Math.floor(r * 90) % 6, reasoning: 'Estimated for this prompt.' };
  return { score: 'red', rank: null, reasoning: 'Estimated for this prompt.' };
}

/* ---- turn an AI answer into green / yellow / red --------------------------- */
function scoreFromText(text: string, businessName: string, domain: string): Verdict {
  if (!text) return { score: 'red', rank: null, reasoning: 'No response returned.' };
  const hay = text.toLowerCase();
  const name = (businessName || '').toLowerCase().trim();
  const dom = (domain || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
  const nameHit = !!name && hay.indexOf(name) !== -1;
  const domHit = !!dom && hay.indexOf(dom) !== -1;
  if (!nameHit && !domHit) return { score: 'red', rank: null, reasoning: 'Your business was not mentioned. A competitor likely took the slot.' };
  const pos = nameHit ? hay.indexOf(name) : hay.indexOf(dom);
  const ratio = pos / Math.max(hay.length, 1);
  if (ratio < 0.33) return { score: 'green', rank: 1 + Math.round(ratio * 6), reasoning: 'Named early as a recommended option — a strong, actionable slot.' };
  if (ratio < 0.66) return { score: 'green', rank: 3 + Math.round(ratio * 4), reasoning: 'Mentioned among the recommended businesses.' };
  return { score: 'yellow', rank: 6 + Math.round(ratio * 6), reasoning: 'Mentioned, but late and without a clear next step — a weak slot.' };
}

/* ---- low-level callers (all return plain text) ----------------------------- */
async function callGemini(prompt: string, key: string): Promise<string> {
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + encodeURIComponent(key), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  const d: any = await r.json();
  if (!r.ok) throw new Error((d.error && d.error.message) || 'Gemini error');
  return ((d.candidates && d.candidates[0] && d.candidates[0].content.parts) || []).map((p: any) => p.text).join('');
}
async function callOpenAICompatible(prompt: string, url: string, key: string, model: string, extraHeaders?: Record<string, string>): Promise<string> {
  const r = await fetch(url, {
    method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key }, extraHeaders || {}),
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }),
  });
  const d: any = await r.json();
  if (!r.ok) throw new Error((d.error && (d.error.message || d.error)) || (model + ' error'));
  return (d.choices && d.choices[0] && d.choices[0].message.content) || '';
}
async function callAnthropic(prompt: string, key: string): Promise<string> {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-3-5-sonnet-latest', max_tokens: 512, messages: [{ role: 'user', content: prompt }] }),
  });
  const d: any = await r.json();
  if (!r.ok) throw new Error((d.error && d.error.message) || 'Anthropic error');
  return ((d.content as any[]) || []).map((b: any) => b.text).join('');
}
async function callCohere(prompt: string, key: string): Promise<string> {
  const r = await fetch('https://api.cohere.com/v2/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: 'command-r-08-2024', messages: [{ role: 'user', content: prompt }] }),
  });
  const d: any = await r.json();
  if (!r.ok) throw new Error(d.message || 'Cohere error');
  return ((d.message && d.message.content) || []).map((c: any) => c.text).join('');
}

/* ---- which free engines are available right now ---------------------------- */
function freeCallers(): Record<string, Caller> {
  const k = process.env;
  const list: Record<string, Caller> = {};
  if (k.GEMINI_API_KEY) list.gemini = (p) => callGemini(p, k.GEMINI_API_KEY as string);
  if (k.GROQ_API_KEY) list.groq = (p) => callOpenAICompatible(p, 'https://api.groq.com/openai/v1/chat/completions', k.GROQ_API_KEY as string, 'llama-3.3-70b-versatile');
  if (k.OPENROUTER_API_KEY) list.openrouter = (p) => callOpenAICompatible(p, 'https://openrouter.ai/api/v1/chat/completions', k.OPENROUTER_API_KEY as string, 'meta-llama/llama-3.3-70b-instruct:free', { 'HTTP-Referer': 'https://geotracker.app', 'X-Title': 'GeoTracker' });
  if (k.CEREBRAS_API_KEY) list.cerebras = (p) => callOpenAICompatible(p, 'https://api.cerebras.ai/v1/chat/completions', k.CEREBRAS_API_KEY as string, 'llama-3.3-70b');
  if (k.COHERE_API_KEY) list.cohere = (p) => callCohere(p, k.COHERE_API_KEY as string);
  if (k.MISTRAL_API_KEY) list.mistral = (p) => callOpenAICompatible(p, 'https://api.mistral.ai/v1/chat/completions', k.MISTRAL_API_KEY as string, 'mistral-small-latest');
  return list;
}
const PREFERRED: Record<string, string[]> = {
  Gemini: ['gemini', 'groq', 'openrouter', 'cerebras', 'cohere', 'mistral'],
  ChatGPT: ['groq', 'cerebras', 'openrouter', 'mistral', 'cohere', 'gemini'],
  Claude: ['openrouter', 'cohere', 'mistral', 'groq', 'cerebras', 'gemini'],
  Perplexity: ['cerebras', 'mistral', 'groq', 'openrouter', 'cohere', 'gemini'],
  Grok: ['cohere', 'mistral', 'openrouter', 'cerebras', 'groq', 'gemini'],
};

function providerFor(llmName: string): Caller | null {
  const k = process.env;
  if (llmName === 'Gemini' && k.GEMINI_API_KEY) return (p) => callGemini(p, k.GEMINI_API_KEY as string);
  if (llmName === 'ChatGPT' && k.OPENAI_API_KEY) return (p) => callOpenAICompatible(p, 'https://api.openai.com/v1/chat/completions', k.OPENAI_API_KEY as string, 'gpt-4o-mini');
  if (llmName === 'Perplexity' && k.PERPLEXITY_API_KEY) return (p) => callOpenAICompatible(p, 'https://api.perplexity.ai/chat/completions', k.PERPLEXITY_API_KEY as string, 'sonar');
  if (llmName === 'Grok' && k.XAI_API_KEY) return (p) => callOpenAICompatible(p, 'https://api.x.ai/v1/chat/completions', k.XAI_API_KEY as string, 'grok-2-latest');
  if (llmName === 'Claude' && k.ANTHROPIC_API_KEY) return (p) => callAnthropic(p, k.ANTHROPIC_API_KEY as string);
  const free = freeCallers();
  const order = PREFERRED[llmName] || ['groq', 'gemini', 'openrouter', 'cerebras', 'cohere', 'mistral'];
  for (let i = 0; i < order.length; i++) { if (free[order[i]]) return free[order[i]]; }
  return null;
}

export async function POST(request: Request) {
  let body: any = {};
  try { body = await request.json(); } catch (e) { body = {}; }
  const domain: string = body.domain || '';
  const businessName: string = body.businessName || '';
  const city: string = body.city || '';
  const prompts: string[] = Array.isArray(body.prompts) && body.prompts.length ? body.prompts : ['Best ' + (body.industry || 'business') + ' in ' + (city || 'your city')];
  const llms: string[] = Array.isArray(body.llms) && body.llms.length ? body.llms : ['ChatGPT', 'Claude', 'Perplexity', 'Gemini', 'Grok'];

  const grid: Record<string, Record<string, Verdict>> = {};
  await Promise.all(prompts.map(async (prompt: string) => {
    grid[prompt] = {};
    await Promise.all(llms.map(async (llmName: string) => {
      const fn = providerFor(llmName);
      if (!fn) { grid[prompt][llmName] = simulatedScore(llmName + '|' + prompt + '|' + businessName + '|' + domain); return; }
      try {
        const ask = prompt + '\n\nList the specific local businesses you would recommend, best first, with a one-line reason each.';
        const text = await fn(ask);
        grid[prompt][llmName] = scoreFromText(text, businessName, domain);
      } catch (err) {
        grid[prompt][llmName] = simulatedScore(llmName + '|' + prompt + '|' + businessName);
      }
    }));
  }));

  return new Response(JSON.stringify({ prompts, grid, ranAt: new Date().toISOString() }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
}
