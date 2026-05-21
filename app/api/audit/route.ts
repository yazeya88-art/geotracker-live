/**
 * Next.js App Router API endpoint for audit requests.
 *
 * Project path: app/api/audit/route.ts
 *
 * POST /api/audit
 * Body: { domain, businessName, industry, city }
 * Returns: AuditResult JSON
 *
 * This is the single endpoint the frontend (GeoTracker.jsx) calls when
 * a user submits the audit form.
 */

import { NextResponse } from 'next/server';
import { runAudit, type AuditInput } from '@/lib/audit';
import type { Industry } from '@/lib/prompts';

const VALID_INDUSTRIES: Industry[] = [
  'dentist', 'plumber', 'lawyer', 'realtor', 'vet', 'gym',
  'accountant', 'optometrist', 'auto', 'roofer', 'restaurant',
  'daycare', 'landscaper', 'pest', 'locksmith', 'ecom',
];

export async function POST(request: Request) {
  let body: Partial<AuditInput>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate
  const errors: string[] = [];
  if (!body.domain || typeof body.domain !== 'string' || !body.domain.includes('.')) {
    errors.push('domain (must include a dot)');
  }
  if (!body.businessName || typeof body.businessName !== 'string' || body.businessName.length < 2) {
    errors.push('businessName (min 2 chars)');
  }
  if (!body.industry || !VALID_INDUSTRIES.includes(body.industry as Industry)) {
    errors.push(`industry (must be one of: ${VALID_INDUSTRIES.join(', ')})`);
  }
  if (!body.city || typeof body.city !== 'string' || body.city.length < 2) {
    errors.push('city (min 2 chars)');
  }
  if (errors.length > 0) {
    return NextResponse.json(
      { error: `Missing or invalid fields: ${errors.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    const result = await runAudit({
      domain: body.domain!.toLowerCase().trim(),
      businessName: body.businessName!.trim(),
      industry: body.industry as Industry,
      city: body.city!.trim(),
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Audit failed';
    console.error('[/api/audit] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
