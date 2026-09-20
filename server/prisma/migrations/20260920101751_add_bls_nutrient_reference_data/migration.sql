-- CreateTable
CREATE TABLE "BlsFood" (
    "blsCode" TEXT NOT NULL,
    "nameDe" TEXT NOT NULL,
    "nameEn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlsFood_pkey" PRIMARY KEY ("blsCode")
);

-- CreateTable
CREATE TABLE "BlsNutrientComponent" (
    "code" TEXT NOT NULL,
    "nameDe" TEXT NOT NULL,
    "nameEn" TEXT,
    "unit" TEXT NOT NULL,
    "group" TEXT,
    "groupEn" TEXT,
    "formula" TEXT,
    "formulaNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlsNutrientComponent_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "BlsFoodNutrient" (
    "foodCode" TEXT NOT NULL,
    "componentCode" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "qualifier" TEXT,
    "source" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlsFoodNutrient_pkey" PRIMARY KEY ("foodCode","componentCode")
);

-- CreateIndex
CREATE INDEX "BlsFood_nameDe_idx" ON "BlsFood"("nameDe");

-- CreateIndex
CREATE INDEX "BlsFoodNutrient_componentCode_idx" ON "BlsFoodNutrient"("componentCode");

-- AddForeignKey
ALTER TABLE "BlsFoodNutrient" ADD CONSTRAINT "BlsFoodNutrient_foodCode_fkey" FOREIGN KEY ("foodCode") REFERENCES "BlsFood"("blsCode") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlsFoodNutrient" ADD CONSTRAINT "BlsFoodNutrient_componentCode_fkey" FOREIGN KEY ("componentCode") REFERENCES "BlsNutrientComponent"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
