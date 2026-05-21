/**
 * Industry-specific prompt library for GeoTracker audits.
 *
 * Project path: lib/prompts.ts
 *
 * Prompting philosophy: these prompts mimic exactly how real customers
 * ask AI for recommendations — messy, simple, unpredictable. The audit is only
 * valid if it tests the AI the same way a real prospect would.
 */

export type Industry =
  | 'dentist'
  | 'plumber'
  | 'lawyer'
  | 'realtor'
  | 'vet'
  | 'gym'
  | 'accountant'
  | 'optometrist'
  | 'auto'
  | 'roofer'
  | 'restaurant'
  | 'daycare'
  | 'landscaper'
  | 'pest'
  | 'locksmith'
  | 'ecom';

/**
 * Each prompt uses {city} as a placeholder.
 * buildPrompts() will substitute the actual city before sending to the LLM.
 */
export const INDUSTRY_PROMPTS: Record<Industry, string[]> = {
  dentist: [
    'Best rated dentist in {city}',
    'Dentist in {city} that takes my insurance',
    'Emergency dentist in {city} same day',
    'Most affordable dentist in {city}',
    'Best cosmetic dentist in {city} for veneers',
  ],
  plumber: [
    'Best emergency plumber in {city}',
    'Plumber in {city} for water heater install',
    '24-hour plumber in {city}',
    'Affordable plumbing service in {city}',
    'Best HVAC technician in {city}',
  ],
  lawyer: [
    'Best personal injury lawyer in {city}',
    'Family law attorney in {city} for consultation',
    'Top rated divorce attorney in {city}',
    'Affordable lawyer in {city}',
    'Best estate planning attorney in {city}',
  ],
  realtor: [
    'Best real estate agent in {city}',
    'Top rated realtor in {city} for first time buyers',
    'Real estate agent in {city} who knows the neighborhood',
    'Best realtor in {city} for luxury homes',
    'Real estate agency in {city} with strong reviews',
  ],
  vet: [
    'Best veterinarian in {city}',
    'Emergency vet in {city} open now',
    'Affordable vet clinic in {city}',
    'Best veterinarian in {city} for cats',
    'Veterinarian in {city} for exotic pets',
  ],
  gym: [
    'Best gym in {city}',
    'Personal training gym in {city}',
    'Wellness clinic in {city} with strong reviews',
    'Best CrossFit gym in {city}',
    '24-hour gym in {city}',
  ],
  accountant: [
    'Best CPA in {city} for small business',
    'Tax preparation service in {city}',
    'Accountant in {city} for self employed',
    'Best bookkeeper in {city}',
    'CPA in {city} for tax planning',
  ],
  optometrist: [
    'Best optometrist in {city}',
    'Eye doctor in {city} for kids',
    'Optometrist in {city} that takes my insurance',
    'Same-day glasses in {city}',
    'Best place for contact lens fitting in {city}',
  ],
  auto: [
    'Best auto detailing in {city}',
    'Custom car shop in {city}',
    'Best window tinting in {city}',
    'Paint protection film installer in {city}',
    'Best ceramic coating in {city}',
  ],
  roofer: [
    'Best roofing contractor in {city}',
    'Roof repair in {city} after storm',
    'Roofing company in {city} with strong reviews',
    'Affordable roofer in {city}',
    'Metal roofing installer in {city}',
  ],
  restaurant: [
    'Best fine dining restaurant in {city}',
    'Most romantic restaurant in {city}',
    'Best restaurant in {city} for anniversary',
    'Top rated chef-driven restaurant in {city}',
    'Best omakase in {city}',
  ],
  daycare: [
    'Best daycare in {city}',
    'Preschool in {city} with strong reviews',
    'Affordable daycare in {city}',
    'Bilingual daycare in {city}',
    'Best Montessori preschool in {city}',
  ],
  landscaper: [
    'Best landscaping company in {city}',
    'Lawn care service in {city}',
    'Landscape designer in {city}',
    'Best hardscape contractor in {city}',
    'Affordable landscaping in {city}',
  ],
  pest: [
    'Best pest control in {city}',
    'Termite inspection in {city}',
    'Pest control in {city} for rodents',
    'Eco-friendly pest control in {city}',
    'Affordable exterminator in {city}',
  ],
  locksmith: [
    'Best locksmith in {city}',
    '24-hour locksmith in {city}',
    'Emergency locksmith in {city}',
    'Car key replacement in {city}',
    'Affordable locksmith in {city}',
  ],
  ecom: [
    'Best online store for {city}', // city becomes "{your niche}" — caller should pass niche
    'Top rated direct-to-consumer brand for {city}',
    'Best ecommerce store with fast shipping',
    'Most trusted online retailer for {city}',
    'Best subscription service for {city}',
  ],
};

/**
 * Build the prompt set for a specific business.
 * Substitutes {city} into each template.
 */
export function buildPrompts(industry: Industry, city: string): string[] {
  const templates = INDUSTRY_PROMPTS[industry];
  if (!templates) {
    throw new Error(`Unknown industry: ${industry}`);
  }
  return templates.map((t) => t.replaceAll('{city}', city));
}
