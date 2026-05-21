/**
 * Audit Engine — GeoTracker
 *
 * For this demo build, only Gemini is wired live. Other LLMs are
 * marked "not configured" — the architecture is in place, just add
 * keys to enable them.
 */

import { queryGemini } from './llm/gemini';
import { buildPrompts, type Industry } from './prompts';
import { scoreResponse, type ScoredResult } from './scoring';

export interface AuditInput {
  domain: string;
  businessName: string;
  industry: Industry;
  city: string;
}

export interface AuditResult {
  ghostScore: number;
  totalCells: number;
  greens: number;
  yellows: number;
  reds: number;
  grid: Record<string, Record<string, ScoredResult>>;
  prompts: string[];
  llmsUsed: string[];
  failures: string[];
  durationMs: number;
}

// Only Gemini is wired live in this demo build.
// To enable others, import the connector here:
//   import { queryChatGPT } from './llm/openai';
//   import { queryClaude } from './llm/anthropic';
//   ...
const LLM_QUERIERS: Record<string, (prompt: string) => Promise<string>> = {
  Gemini: queryGemini,
};

const ALL_LLM_NAMES = ['ChatGPT', 'Claude', 'Perplexity', 'Gemini', 'Grok'];

export async function runAudit(input: AuditInput): Promise<AuditResult> {
  const startTime = Date.now();
  const prompts = buildPrompts(input.industry, input.city);
  const enabledLlms = Object.keys(LLM_QUERIERS);
  const failures = new Set<string>();

  // Initialize the grid
  const grid: Record<string, Record<string, ScoredResult>> = {};
  for (const prompt of prompts) {
    grid[prompt] = {};
    for (const llm of ALL_LLM_NAMES) {
      grid[prompt][llm] = {
        score: 'red',
        rank: null,
        hasContactInfo: false,
        reasoning: 'Not configured (add API key to enable)',
      };
    }
  }

  // Fire all enabled LLM queries in parallel
  const tasks: Array<Promise<void>> = [];
  for (const prompt of prompts) {
    for (const llm of enabledLlms) {
      const querier = LLM_QUERIERS[llm];
      tasks.push(
        querier(prompt)
          .then(response => {
            grid[prompt][llm] = scoreResponse(response, input.businessName, input.domain);
          })
          .catch(err => {
            failures.add(llm);
            grid[prompt][llm] = {
              score: 'red',
              rank: null,
              hasContactInfo: false,
              reasoning: `${llm} API error: ${err.message || 'unknown'}`,
            };
          })
      );
    }
  }

  await Promise.allSettled(tasks);

  // Count and score
  let greens = 0, yellows = 0, reds = 0;
  for (const prompt of prompts) {
    for (const llm of ALL_LLM_NAMES) {
      const s = grid[prompt][llm].score;
      if (s === 'green') greens++;
      else if (s === 'yellow') yellows++;
      else reds++;
    }
  }

  const totalCells = prompts.length * ALL_LLM_NAMES.length;
  const ghostScore = totalCells === 0
    ? 0
    : Math.round((greens * 100 + yellows * 38) / totalCells);

  return {
    ghostScore,
    totalCells,
    greens,
    yellows,
    reds,
    grid,
    prompts,
    llmsUsed: ALL_LLM_NAMES,
    failures: Array.from(failures),
    durationMs: Date.now() - startTime,
  };
}
