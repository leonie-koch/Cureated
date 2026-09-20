-- AlterTable
ALTER TABLE "BlsFood" ADD COLUMN     "foodGroup" TEXT;

-- AlterTable
ALTER TABLE "Ingredient" ADD COLUMN     "blsFoodCode" TEXT;

-- CreateIndex
CREATE INDEX "Ingredient_blsFoodCode_idx" ON "Ingredient"("blsFoodCode");

-- AddForeignKey
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_blsFoodCode_fkey" FOREIGN KEY ("blsFoodCode") REFERENCES "BlsFood"("blsCode") ON DELETE SET NULL ON UPDATE CASCADE;
