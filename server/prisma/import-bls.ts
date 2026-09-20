import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
const dataDir = path.join(repoRoot, 'BLS_4_0_2025_DE');
const componentsFile = path.join(dataDir, 'BLS_4_0_Components_DE_EN.xlsx');
const dataFile = path.join(dataDir, 'BLS_4_0_Daten_2025_DE.xlsx');

// Cells that mean "no data given" throughout the BLS files.
const NO_DATA_MARKERS = new Set(['-', '']);

// The BLS documentation only gives one example of the code-prefix scheme
// (C = Getreide) and doesn't publish the full table. This mapping is taken
// from the category browser at
// https://blsdb.de/search?catId=top&type=category instead, since that's
// the only place the complete, official grouping is shown.
const FOOD_GROUP_BY_LETTER: Record<string, string> = {
  B: 'Brot und Kleingebäck',
  C: 'Cerealien, Getreide, Getreideprodukte, Reis- und Haferdrinks',
  D: 'Dauerbackwaren, Kuchen, Feinbackwaren',
  E: 'Eier und Eierprodukte, Teigwaren',
  F: 'Früchte, Obst und Obsterzeugnisse',
  G: 'Gemüse und Gemüseerzeugnisse',
  H: 'Hülsenfrüchte, Schalenobst, Öl- und andere Samen, pflanzliche Alternativen',
  K: 'Kartoffeln und Kartoffelerzeugnisse, stärkereiche Pflanzenteile, Pilze',
  M: 'Milch, Milcherzeugnisse, Käse',
  N: 'Alkoholfreie Getränke',
  P: 'Alkoholische Getränke',
  Q: 'Speisefette und Öle',
  R: 'Würzmittel, Saucen, Back- und Kochzutaten',
  S: 'Süßwaren, Zucker, Schokolade, Eis und süße Aufstriche',
  T: 'Fische, Krusten-, Schalen- und Weichtiere',
  U: 'Rind-, Kalb-, Schweine-, Schaf- und Lammfleisch',
  V: 'Wild, Geflügel, Federwild, Innereien',
  W: 'Fleisch- und Wurstwaren',
  X: 'Menükomponenten überwiegend pflanzlich',
  Y: 'Menükomponenten überwiegend tierisch',
};

interface ComponentRow {
  code: string;
  nameDe: string;
  nameEn: string | null;
  unit: string;
  group: string | null;
  groupEn: string | null;
  formula: string | null;
  formulaNote: string | null;
}

interface FoodRow {
  blsCode: string;
  nameDe: string;
  nameEn: string | null;
  foodGroup: string | null;
}

interface FoodNutrientRow {
  foodCode: string;
  componentCode: string;
  value: number | null;
  qualifier: string | null;
  source: string | null;
  reference: string | null;
}

function cellText(value: ExcelJS.CellValue): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return NO_DATA_MARKERS.has(text) ? null : text;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function readComponents(): Promise<ComponentRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(componentsFile);
  const sheet = workbook.worksheets[0];

  const components: ComponentRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const code = cellText(row.getCell(2).value);
    if (!code) return;

    components.push({
      code,
      nameDe: cellText(row.getCell(3).value) ?? code,
      nameEn: cellText(row.getCell(4).value),
      unit: cellText(row.getCell(5).value) ?? '',
      group: cellText(row.getCell(6).value),
      groupEn: cellText(row.getCell(7).value),
      formula: cellText(row.getCell(8).value),
      formulaNote: cellText(row.getCell(9).value),
    });
  });
  return components;
}

interface ParsedDataFile {
  foods: FoodRow[];
  foodNutrients: FoodNutrientRow[];
  skippedNoData: number;
}

async function readFoodData(
  knownComponentCodes: Set<string>,
): Promise<ParsedDataFile> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(dataFile);
  const sheet = workbook.worksheets[0];

  const headerRow = sheet.getRow(1);
  // Every nutrient occupies 3 columns (value, Datenherkunft, Referenz),
  // starting at column 4. The header cell's leading token up to the first
  // space is the BLS nutrient code, e.g. "ENERCJ Energie ... [kJ/100g]".
  // Column 4 is the first nutrient value column; after the last nutrient's
  // triplet comes one trailing "Hinweis" column, which isn't part of a
  // triplet and isn't a known component code.
  const lastValueCol = 4 + 3 * (knownComponentCodes.size - 1);

  const nutrientColumns: { code: string; valueCol: number }[] = [];
  for (let col = 4; col <= lastValueCol; col += 3) {
    const header = cellText(headerRow.getCell(col).value);
    if (!header) break;
    const code = header.split(' ')[0];
    if (!knownComponentCodes.has(code)) {
      throw new Error(
        `Column ${col} ("${header}") has code "${code}", which is not in the components catalog. ` +
          'The data file layout may not match what this script expects.',
      );
    }
    nutrientColumns.push({ code, valueCol: col });
  }

  const foods: FoodRow[] = [];
  const foodNutrients: FoodNutrientRow[] = [];
  let skippedNoData = 0;
  const unknownGroupLetters = new Set<string>();

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const blsCode = cellText(row.getCell(1).value);
    if (!blsCode) return;

    const letter = blsCode[0];
    const foodGroup = FOOD_GROUP_BY_LETTER[letter] ?? null;
    if (!foodGroup) unknownGroupLetters.add(letter);

    foods.push({
      blsCode,
      nameDe: cellText(row.getCell(2).value) ?? blsCode,
      nameEn: cellText(row.getCell(3).value),
      foodGroup,
    });

    for (const { code, valueCol } of nutrientColumns) {
      const rawValue = row.getCell(valueCol).value;
      const valueText = cellText(rawValue);
      if (valueText === null) {
        skippedNoData++;
        continue;
      }

      const numeric = typeof rawValue === 'number' ? rawValue : Number(valueText);
      const isNumeric = typeof rawValue === 'number' || !Number.isNaN(numeric);

      foodNutrients.push({
        foodCode: blsCode,
        componentCode: code,
        value: isNumeric ? numeric : null,
        qualifier: isNumeric ? null : valueText,
        source: cellText(row.getCell(valueCol + 1).value),
        reference: cellText(row.getCell(valueCol + 2).value),
      });
    }
  });

  if (unknownGroupLetters.size > 0) {
    console.warn(
      `  Warning: no food group known for BLS code letter(s): ${[...unknownGroupLetters].join(', ')}. ` +
        'Those foods will have foodGroup = null.',
    );
  }

  return { foods, foodNutrients, skippedNoData };
}

async function main() {
  console.log('Reading BLS nutrient component catalog...');
  const components = await readComponents();
  console.log(`  ${components.length} components.`);

  console.log('Reading BLS food + nutrient data (this file is large)...');
  const { foods, foodNutrients, skippedNoData } = await readFoodData(
    new Set(components.map((c) => c.code)),
  );
  console.log(
    `  ${foods.length} foods, ${foodNutrients.length} nutrient values ` +
      `(${skippedNoData} skipped: no data in source).`,
  );
  const withQualifier = foodNutrients.filter((n) => n.qualifier).length;
  console.log(
    `  ${foodNutrients.length - withQualifier} numeric values, ` +
      `${withQualifier} with a qualifier instead of a number.`,
  );

  console.log('Writing BLS data to the database...');
  await prisma.$transaction(
    async (tx) => {
      // BlsFood/BlsNutrientComponent are upserted, never deleted: an
      // Ingredient can reference a BlsFood by its code, so dropping and
      // recreating these rows on every re-import would either violate that
      // foreign key or silently wipe out existing ingredient-to-BLS-food
      // matches. Nothing references BlsFoodNutrient rows directly, so those
      // are safe to fully replace.
      console.log(`  Upserting ${components.length} nutrient components...`);
      for (const component of components) {
        await tx.blsNutrientComponent.upsert({
          where: { code: component.code },
          create: component,
          update: component,
        });
      }

      console.log(`  Upserting ${foods.length} foods...`);
      let upserted = 0;
      for (const food of foods) {
        await tx.blsFood.upsert({
          where: { blsCode: food.blsCode },
          create: food,
          update: food,
        });
        upserted++;
        if (upserted % 1000 === 0) {
          console.log(`  ${upserted}/${foods.length} foods...`);
        }
      }

      await tx.blsFoodNutrient.deleteMany();
      let inserted = 0;
      for (const batch of chunk(foodNutrients, 5000)) {
        await tx.blsFoodNutrient.createMany({ data: batch });
        inserted += batch.length;
        console.log(`  ${inserted}/${foodNutrients.length} nutrient values...`);
      }
    },
    { timeout: 15 * 60 * 1000, maxWait: 30 * 1000 },
  );

  console.log('Done.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
