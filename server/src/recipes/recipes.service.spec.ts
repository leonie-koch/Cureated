import { RecipesService } from './recipes.service';

type PrivateMethods = {
  toGrams(amount: number, unit: string): number;
  normalize(value: number, min: number, max: number): number;
  inverseNormalize(value: number, min: number, max: number): number;
};

describe('RecipesService nutrient math', () => {
  const service = new RecipesService(
    undefined as never,
    undefined as never,
  ) as unknown as PrivateMethods;

  describe('toGrams', () => {
    it('passes grams through unchanged', () => {
      expect(service.toGrams(100, 'g')).toBe(100);
      expect(service.toGrams(100, 'grams')).toBe(100);
    });

    it('converts kg, mg, oz and lb to grams', () => {
      expect(service.toGrams(1, 'kg')).toBe(1000);
      expect(service.toGrams(1000, 'mg')).toBe(1);
      expect(service.toGrams(1, 'oz')).toBeCloseTo(28.3495);
      expect(service.toGrams(1, 'lb')).toBeCloseTo(453.592);
    });

    it('treats ml/l as 1:1 with grams and converts spoons/cups', () => {
      expect(service.toGrams(1, 'l')).toBe(1000);
      expect(service.toGrams(1, 'tsp')).toBe(5);
      expect(service.toGrams(1, 'tbsp')).toBe(15);
      expect(service.toGrams(1, 'cup')).toBe(240);
    });

    it('is case-insensitive and trims whitespace', () => {
      expect(service.toGrams(1, ' KG ')).toBe(1000);
    });

    it('returns NaN for an unknown unit', () => {
      expect(service.toGrams(1, 'bunch')).toBeNaN();
    });
  });

  describe('normalize', () => {
    it('clamps to 0 at or below the minimum', () => {
      expect(service.normalize(5, 20, 80)).toBe(0);
      expect(service.normalize(20, 20, 80)).toBe(0);
    });

    it('clamps to 1 at or above the maximum', () => {
      expect(service.normalize(80, 20, 80)).toBe(1);
      expect(service.normalize(100, 20, 80)).toBe(1);
    });

    it('interpolates linearly between min and max', () => {
      expect(service.normalize(50, 20, 80)).toBeCloseTo(0.5);
    });
  });

  describe('inverseNormalize', () => {
    it('returns 1 at or below the minimum', () => {
      expect(service.inverseNormalize(2, 5, 15)).toBe(1);
      expect(service.inverseNormalize(5, 5, 15)).toBe(1);
    });

    it('returns 0 at or above the maximum', () => {
      expect(service.inverseNormalize(15, 5, 15)).toBe(0);
      expect(service.inverseNormalize(20, 5, 15)).toBe(0);
    });

    it('interpolates linearly, decreasing as value grows', () => {
      expect(service.inverseNormalize(10, 5, 15)).toBeCloseTo(0.5);
    });
  });
});
