// Atomic property definitions used by RecipesService.recomputePropertyScores
// to score every recipe against a fixed set of scientifically-grounded,
// disease-agnostic nutrition claims (see README "Core features" — atomic
// properties are "directly data-based, mapped 1:1 to measurable values").
// Thresholds come from two EU regulations that already define these terms
// precisely, so e.g. "Low sugar" or "Iron-rich" mean the same thing here as
// on an EU food label:
//
// - Regulation (EC) No 1924/2006 (nutrition & health claims), Annex —
//   thresholds for the macronutrient/energy claims below.
// - Regulation (EU) No 1169/2011, Annex XIII — Nutrient Reference Values
//   (NRV) for vitamins/minerals. "Source of X" is >=15% NRV per 100g,
//   "high in X"/"X-rich" is >=30% NRV per 100g; each vitamin/mineral
//   definition below uses those two percentages as `min`/`max`.
//
// `codes` are BLS 4.0 nutrient component codes (summed when there's more
// than one, e.g. total dietary fibre = low + high molecular weight
// fibre — BLS doesn't publish a single "fibre, total" component).
// `direction: 'low'` scores 1.0 at or below `min` and 0 at or above `max`
// (RecipesService.inverseNormalize); `direction: 'high'` scores 0 at or
// below `min` and 1.0 at or above `max` (RecipesService.normalize).
//
// A property only counts as "qualifying" at score === 1 — i.e. the recipe
// fully clears the threshold the label is named after, not merely trends
// toward it. Scores between 0 and 1 are still stored (useful for future
// composite/condition-weighted ranking per the README) but the client only
// displays qualifying ones (see client/lib/property-scores.ts).
//
// `magnesiumreich` and `vitamin_b12_reich` predate this table and were
// already seeded with these exact thresholds before it existed — kept
// as-is rather than silently reset to the NRV-derived numbers other
// vitamins/minerals use here, since that would be a substantive change to
// already-agreed thresholds, not just adding new ones.
export type AtomicPropertyDefinition = {
  key: string;
  label: string;
  description: string;
  codes: string[];
  direction: 'low' | 'high';
  min: number;
  max: number;
};

export const ATOMIC_PROPERTY_DEFINITIONS: AtomicPropertyDefinition[] = [
  // --- Macronutrient / energy claims (EU 1924/2006) ---
  {
    key: 'zuckerarm',
    label: 'Low sugar',
    description:
      'Qualifies when total sugar is 5g or less per 100g of the recipe (EU "low sugar" claim).',
    codes: ['SUGAR'],
    direction: 'low',
    min: 5,
    max: 15,
  },
  {
    key: 'fettarm',
    label: 'Low fat',
    description:
      'Qualifies when total fat is 3g or less per 100g of the recipe (EU "low fat" claim).',
    codes: ['FAT'],
    direction: 'low',
    min: 3,
    max: 10,
  },
  {
    key: 'gesaettigtfettarm',
    label: 'Low saturated fat',
    description:
      'Qualifies when saturated fat is 1.5g or less per 100g of the recipe (EU "low saturated fat" claim).',
    codes: ['FASAT'],
    direction: 'low',
    min: 1.5,
    max: 5,
  },
  {
    key: 'natriumarm',
    label: 'Low sodium',
    description:
      'Qualifies when salt is 0.3g or less per 100g of the recipe (EU "low sodium/salt" claim).',
    codes: ['NACL'],
    direction: 'low',
    min: 0.3,
    max: 1,
  },
  {
    key: 'kalorienarm',
    label: 'Low calorie',
    description:
      'Qualifies when energy is 40kcal or less per 100g of the recipe (EU "low energy" claim).',
    codes: ['ENERCC'],
    direction: 'low',
    min: 40,
    max: 120,
  },
  {
    key: 'ballaststoffreich',
    label: 'High fibre',
    description:
      'Qualifies when dietary fibre is 6g or more per 100g of the recipe (EU "high fibre" claim; "source of fibre" starts at 3g).',
    codes: ['FIBHMW', 'FIBLMW'],
    direction: 'high',
    min: 3,
    max: 6,
  },
  {
    key: 'omega3reich',
    label: 'Source of omega-3',
    description:
      'Qualifies when omega-3 fatty acids are 0.6g or more per 100g of the recipe (EU "high in omega-3" claim; "source of" starts at 0.3g).',
    codes: ['FAPUN3'],
    direction: 'high',
    min: 0.3,
    max: 0.6,
  },

  // --- Vitamins & minerals (>=30% NRV per 100g, EU 1169/2011 Annex XIII) ---
  {
    key: 'magnesiumreich',
    label: 'Magnesium-rich',
    description:
      'Qualifies when magnesium is 80mg or more per 100g of the recipe.',
    codes: ['MG'],
    direction: 'high',
    min: 20,
    max: 80,
  },
  {
    key: 'vitamin_b12_reich',
    label: 'Vitamin B12-rich',
    description:
      'Qualifies when vitamin B12 is 1.0µg or more per 100g of the recipe.',
    codes: ['VITB12'],
    direction: 'high',
    min: 0.2,
    max: 1.0,
  },
  {
    key: 'vitamin_a_reich',
    label: 'Vitamin A-rich',
    description:
      'Qualifies when vitamin A (RAE) is 240µg or more per 100g of the recipe (>=30% NRV).',
    codes: ['VITAA'],
    direction: 'high',
    min: 120,
    max: 240,
  },
  {
    key: 'vitamin_d_reich',
    label: 'Vitamin D-rich',
    description:
      'Qualifies when vitamin D is 1.5µg or more per 100g of the recipe (>=30% NRV).',
    codes: ['VITD'],
    direction: 'high',
    min: 0.75,
    max: 1.5,
  },
  {
    key: 'vitamin_e_reich',
    label: 'Vitamin E-rich',
    description:
      'Qualifies when vitamin E is 3.6mg or more per 100g of the recipe (>=30% NRV).',
    codes: ['VITE'],
    direction: 'high',
    min: 1.8,
    max: 3.6,
  },
  {
    key: 'vitamin_k_reich',
    label: 'Vitamin K-rich',
    description:
      'Qualifies when vitamin K is 22.5µg or more per 100g of the recipe (>=30% NRV).',
    codes: ['VITK'],
    direction: 'high',
    min: 11.25,
    max: 22.5,
  },
  {
    key: 'vitamin_c_reich',
    label: 'Vitamin C-rich',
    description:
      'Qualifies when vitamin C is 24mg or more per 100g of the recipe (>=30% NRV).',
    codes: ['VITC'],
    direction: 'high',
    min: 12,
    max: 24,
  },
  {
    key: 'vitamin_b1_reich',
    label: 'Vitamin B1-rich',
    description:
      'Qualifies when vitamin B1 (thiamin) is 0.33mg or more per 100g of the recipe (>=30% NRV).',
    codes: ['THIA'],
    direction: 'high',
    min: 0.165,
    max: 0.33,
  },
  {
    key: 'vitamin_b2_reich',
    label: 'Vitamin B2-rich',
    description:
      'Qualifies when vitamin B2 (riboflavin) is 0.42mg or more per 100g of the recipe (>=30% NRV).',
    codes: ['RIBF'],
    direction: 'high',
    min: 0.21,
    max: 0.42,
  },
  {
    key: 'niacinreich',
    label: 'Niacin-rich',
    description:
      'Qualifies when niacin is 4.8mg or more per 100g of the recipe (>=30% NRV).',
    codes: ['NIA'],
    direction: 'high',
    min: 2.4,
    max: 4.8,
  },
  {
    key: 'vitamin_b6_reich',
    label: 'Vitamin B6-rich',
    description:
      'Qualifies when vitamin B6 is 420µg or more per 100g of the recipe (>=30% NRV).',
    codes: ['VITB6'],
    direction: 'high',
    min: 210,
    max: 420,
  },
  {
    key: 'folatreich',
    label: 'Folate-rich',
    description:
      'Qualifies when folate is 60µg or more per 100g of the recipe (>=30% NRV).',
    codes: ['FOL'],
    direction: 'high',
    min: 30,
    max: 60,
  },
  {
    key: 'biotinreich',
    label: 'Biotin-rich',
    description:
      'Qualifies when biotin is 15µg or more per 100g of the recipe (>=30% NRV).',
    codes: ['BIOT'],
    direction: 'high',
    min: 7.5,
    max: 15,
  },
  {
    key: 'pantothensaeurereich',
    label: 'Pantothenic acid-rich',
    description:
      'Qualifies when pantothenic acid is 1.8mg or more per 100g of the recipe (>=30% NRV).',
    codes: ['PANTAC'],
    direction: 'high',
    min: 0.9,
    max: 1.8,
  },
  {
    key: 'kaliumreich',
    label: 'Potassium-rich',
    description:
      'Qualifies when potassium is 600mg or more per 100g of the recipe (>=30% NRV).',
    codes: ['K'],
    direction: 'high',
    min: 300,
    max: 600,
  },
  {
    key: 'calciumreich',
    label: 'Calcium-rich',
    description:
      'Qualifies when calcium is 240mg or more per 100g of the recipe (>=30% NRV).',
    codes: ['CA'],
    direction: 'high',
    min: 120,
    max: 240,
  },
  {
    key: 'phosphorreich',
    label: 'Phosphorus-rich',
    description:
      'Qualifies when phosphorus is 210mg or more per 100g of the recipe (>=30% NRV).',
    codes: ['P'],
    direction: 'high',
    min: 105,
    max: 210,
  },
  {
    key: 'eisenreich',
    label: 'Iron-rich',
    description:
      'Qualifies when iron is 4.2mg or more per 100g of the recipe (>=30% NRV).',
    codes: ['FE'],
    direction: 'high',
    min: 2.1,
    max: 4.2,
  },
  {
    key: 'zinkreich',
    label: 'Zinc-rich',
    description:
      'Qualifies when zinc is 3mg or more per 100g of the recipe (>=30% NRV).',
    codes: ['ZN'],
    direction: 'high',
    min: 1.5,
    max: 3,
  },
  {
    key: 'kupferreich',
    label: 'Copper-rich',
    description:
      'Qualifies when copper is 300µg or more per 100g of the recipe (>=30% NRV).',
    codes: ['CU'],
    direction: 'high',
    min: 150,
    max: 300,
  },
  {
    key: 'manganreich',
    label: 'Manganese-rich',
    description:
      'Qualifies when manganese is 600µg or more per 100g of the recipe (>=30% NRV).',
    codes: ['MN'],
    direction: 'high',
    min: 300,
    max: 600,
  },
  {
    key: 'iodreich',
    label: 'Iodine-rich',
    description:
      'Qualifies when iodine is 45µg or more per 100g of the recipe (>=30% NRV).',
    codes: ['ID'],
    direction: 'high',
    min: 22.5,
    max: 45,
  },
];

// Handled separately from the table above: the EU "high protein" claim is
// defined as a share of the recipe's energy (>=20% of kcal from protein,
// protein energy factor 4kcal/g), not a simple per-100g amount, so it
// needs both PROT625 and ENERCC rather than a single normalized nutrient.
export const PROTEIN_RICH_PROPERTY = {
  key: 'eiweissreich',
  label: 'High protein',
  description:
    'Qualifies when at least 20% of the recipe\'s energy comes from protein (EU "high protein" claim; "source of protein" starts at 12%).',
  min: 12,
  max: 20,
};
