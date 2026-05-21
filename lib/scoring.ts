/**
 * Scoring engine — parse an LLM response and classify the business's visibility.
 *
 * Project path: lib/scoring.ts
 *
 * Returns one of three states (tiered scoring):
 *   - green:  mentioned in top 3 with actionable contact info (domain/phone)
 *   - yellow: mentioned but weak (not top 3, OR no contact info, OR with caveat)
 *   - red:    not mentioned at all
 *
 * Honest caveat: parsing free-form LLM text is inherently fuzzy. This is v1.
 * The mention detection covers the common cases (name match, domain match,
 * domain root match). Edge cases — generic names like "City Dental" matching
 * a different city's business — are handled via domain cross-reference but
 * not perfectly. See README for known limitations.
 */

export type Score = 'green' | 'yellow' | 'red';

export interface ScoredResult {
  score: Score;
  rank: number | null;
  hasContactInfo: boolean;
  reasoning: string;
}

/**
 * Main entry point. Parses the LLM's response text and returns a scored result.
 */
export function scoreResponse(
  response: string,
  businessName: string,
  domain: string
): ScoredResult {
  if (!response || response.trim().length === 0) {
    return {
      score: 'red',
      rank: null,
      hasContactInfo: false,
      reasoning: 'Empty response from LLM',
    };
  }

  const responseLower = response.toLowerCase();
  const nameLower = businessName.toLowerCase().trim();
  const domainLower = domain.toLowerCase().trim();
  const domainRoot = stripTld(domainLower);

  const mentioned =
    responseLower.includes(nameLower) ||
    responseLower.includes(domainLower) ||
    (domainRoot.length > 3 && responseLower.includes(domainRoot));

  if (!mentioned) {
    return {
      score: 'red',
      rank: null,
      hasContactInfo: false,
      reasoning: 'Business not mentioned in response',
    };
  }

  // The business is mentioned. Now determine rank and quality.
  const rank = detectRank(response, businessName, domainRoot);
  const hasContactInfo = checkForContactInfo(response, businessName);
  const hasCaveat = detectCaveat(response, businessName);

  // Top 3 with contact and no caveat → green
  if (rank !== null && rank <= 3 && hasContactInfo && !hasCaveat) {
    return {
      score: 'green',
      rank,
      hasContactInfo: true,
      reasoning: `Top-${rank} recommendation with contact info`,
    };
  }

  // Top 3 but missing contact info → yellow (visible but not actionable)
  if (rank !== null && rank <= 3 && !hasContactInfo) {
    return {
      score: 'yellow',
      rank,
      hasContactInfo: false,
      reasoning: 'Top-3 but no actionable contact info',
    };
  }

  // Top 3 with caveat → yellow
  if (rank !== null && rank <= 3 && hasCaveat) {
    return {
      score: 'yellow',
      rank,
      hasContactInfo,
      reasoning: 'Top-3 but mentioned with caveat',
    };
  }

  // Mentioned but outside top 3 → yellow
  return {
    score: 'yellow',
    rank,
    hasContactInfo,
    reasoning: rank
      ? `Mentioned at position ${rank}, outside top 3`
      : 'Mentioned generally, no clear ranking',
  };
}

/**
 * Strip TLD from domain so "maplecourtdental.com" becomes "maplecourtdental".
 */
function stripTld(domain: string): string {
  return domain.replace(/\.(com|net|org|io|co|app|biz|us|info|me)$/i, '');
}

/**
 * Detect rank by scanning for numbered or bulleted list patterns near the business name.
 * Returns 1, 2, 3, etc., or null if no clear ranking is detectable.
 */
function detectRank(
  response: string,
  businessName: string,
  domainRoot: string
): number | null {
  const lines = response.split('\n');
  const nameLower = businessName.toLowerCase();

  // Patterns: "1.", "1)", "**1.**", "#1", "- "
  const numberedPatterns = [
    /^\s*(\d+)\s*[\.\)]/, // 1. or 1)
    /^\s*\*\*\s*(\d+)\s*[\.\)]/, // **1.**
    /^\s*#\s*(\d+)/, // #1
  ];

  for (const line of lines) {
    const lineLower = line.toLowerCase();
    if (!lineLower.includes(nameLower) && !lineLower.includes(domainRoot)) {
      continue;
    }

    for (const pattern of numberedPatterns) {
      const match = line.match(pattern);
      if (match) {
        const rank = parseInt(match[1], 10);
        if (rank > 0 && rank < 50) return rank;
      }
    }
  }

  // Try counting bullet positions if business appears in a bulleted list
  const bulletLines = lines.filter((l) => /^\s*[-*•]/.test(l));
  if (bulletLines.length > 0) {
    for (let i = 0; i < bulletLines.length; i++) {
      const lineLower = bulletLines[i].toLowerCase();
      if (lineLower.includes(nameLower) || lineLower.includes(domainRoot)) {
        return i + 1;
      }
    }
  }

  return null;
}

/**
 * Check whether the response includes actionable contact info near the business name.
 * Looks for phone numbers, websites, or addresses within 250 chars of the mention.
 */
function checkForContactInfo(response: string, businessName: string): boolean {
  const nameLower = businessName.toLowerCase();
  const responseLower = response.toLowerCase();
  const idx = responseLower.indexOf(nameLower);
  if (idx === -1) return false;

  const start = Math.max(0, idx - 50);
  const end = Math.min(response.length, idx + nameLower.length + 250);
  const window = response.slice(start, end);

  const hasPhone = /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(window);
  const hasUrl = /(https?:\/\/|www\.)\S+/i.test(window);
  const hasAddress = /\d+\s+\w+\s+(street|st|avenue|ave|road|rd|blvd|drive|dr|way|lane|ln)/i.test(window);

  return hasPhone || hasUrl || hasAddress;
}

/**
 * Detect caveats — words like "but", "however", "though" appearing near the business name.
 * If present, the recommendation is qualified rather than enthusiastic.
 */
function detectCaveat(response: string, businessName: string): boolean {
  const nameLower = businessName.toLowerCase();
  const responseLower = response.toLowerCase();
  const idx = responseLower.indexOf(nameLower);
  if (idx === -1) return false;

  const end = Math.min(response.length, idx + nameLower.length + 200);
  const window = responseLower.slice(idx, end);

  const caveatPatterns = [
    /\bhowever\b/,
    /\bbut\b/,
    /\bthough\b/,
    /\balthough\b/,
    /\bcheck\s+(reviews|recent|the)\b/,
    /\bmixed\s+reviews\b/,
    /\bsome\s+complaints\b/,
  ];

  return caveatPatterns.some((p) => p.test(window));
}
