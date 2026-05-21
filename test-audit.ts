import { config } from 'dotenv';
config({ path: '.env.local' });
/**
 * Quick test — run this to verify the audit engine works.
 *
 * Usage:
 *   npx tsx test-audit.ts
 */

import { runAudit } from './lib/audit';

async function main() {
  console.log('🔍 Running test audit for Maple Court Dental in Houston, TX...\n');

  const result = await runAudit({
    domain: 'pearldentistry.com',
    businessName: 'Pearl Dentistry Reimagined',
    industry: 'dentist',
    city: 'Houston, TX',
});

  console.log('=== AUDIT COMPLETE ===');
  console.log(`Ghost Score: ${result.ghostScore} / 100`);
  console.log(`Greens: ${result.greens} · Yellows: ${result.yellows} · Reds: ${result.reds}`);
  console.log(`Duration: ${result.durationMs}ms`);
  console.log(`Failures: ${result.failures.length ? result.failures.join(', ') : 'none'}`);
  console.log('\nMatrix:');

  for (const prompt of result.prompts) {
    console.log(`\n  "${prompt}"`);
    for (const llm of result.llmsUsed) {
      const cell = result.grid[prompt][llm];
      const icon = cell.score === 'green' ? '✓' : cell.score === 'yellow' ? '~' : '✗';
      console.log(`    ${icon} ${llm.padEnd(12)} → ${cell.reasoning}`);
    }
  }
}

main().catch(err => {
  console.error('❌ Audit failed:', err);
  process.exit(1);
});
