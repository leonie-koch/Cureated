export type PropertyScore = {
  id: string;
  score: number;
  property: {
    id: string;
    label: string;
    description: string | null;
  };
};

// A property only counts as "qualifying" once its score reaches the
// scientific threshold that defines it (see server/src/recipes/
// atomic-properties.ts — e.g. magnesium-rich only applies at >=80mg/100g,
// a score of exactly 1). Scores below that are still computed and stored
// (useful for future composite/condition-weighted ranking) but aren't
// shown as a claim here, so a recipe never displays e.g. "Magnesium-rich"
// for a score that just means "has some magnesium".
export function qualifyingPropertyScores(
  scores: PropertyScore[],
): PropertyScore[] {
  return scores.filter((propertyScore) => propertyScore.score >= 1);
}
