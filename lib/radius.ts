/**
 * Industry → catchment radius (miles) lookup.
 *
 * Project path: lib/radius.ts
 *
 * Default catchment radii per industry, from the project brainstorm.
 * Used by the geospatial service to expand prompts into surrounding suburbs.
 * Example: a dentist in Houston gets audited for Houston + Katy + Spring + Sugar Land.
 */

import type { Industry } from './prompts';

/**
 * Default radius (miles). Single value chosen as the midpoint of the spec ranges.
 * Users can override during onboarding.
 */
export const INDUSTRY_RADIUS_MILES: Record<Industry, number> = {
  dentist: 38,       // 25-50 mi range
  plumber: 22,       // 15-30 mi
  lawyer: 45,        // 30-60 mi
  realtor: 15,       // 10-20 mi
  vet: 22,           // 15-30 mi
  gym: 15,           // 10-20 mi
  accountant: 30,    // 20-40 mi
  optometrist: 20,   // 15-25 mi
  auto: 40,          // 30-50 mi
  roofer: 45,        // 30-60 mi
  restaurant: 20,    // 10-30 mi
  daycare: 7,        // 5-10 mi
  landscaper: 22,    // 15-30 mi
  pest: 30,          // 20-40 mi
  locksmith: 10,     // 5-15 mi
  ecom: 0,           // national/global — radius doesn't apply
};

/**
 * Human-readable label for a given industry. Used in UI displays.
 */
export const INDUSTRY_LABEL: Record<Industry, string> = {
  dentist: 'Dental Practice',
  plumber: 'Plumbing & HVAC',
  lawyer: 'Law Firm',
  realtor: 'Real Estate',
  vet: 'Veterinary Clinic',
  gym: 'Gym & Wellness',
  accountant: 'Accountant / CPA',
  optometrist: 'Optometrist',
  auto: 'Auto Custom Shop',
  roofer: 'Roofing Contractor',
  restaurant: 'High-End Restaurant',
  daycare: 'Daycare / Preschool',
  landscaper: 'Landscaping',
  pest: 'Pest Control',
  locksmith: 'Locksmith',
  ecom: 'E-Commerce / SaaS',
};
