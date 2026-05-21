/**
 * Shared TypeScript types for the audit pipeline.
 *
 * Project path: types/audit.ts
 *
 * Re-exports from lib modules so callers can do:
 *   import type { AuditResult, ScoredResult } from '@/types/audit';
 */

export type { Industry } from '@/lib/prompts';
export type { Score, ScoredResult } from '@/lib/scoring';
export type { AuditInput, AuditResult } from '@/lib/audit';
