-- CreateEnum
CREATE TYPE "QualificationResult" AS ENUM ('APROVADO', 'APROVADO_COM_RESSALVAS', 'REPROVADO');

-- CreateTable
CREATE TABLE "qualifications" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "matrixSnapshot" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedById" TEXT NOT NULL,
    "result" "QualificationResult",
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "decisionReason" TEXT,
    "decisionSnapshot" JSONB,
    "conditionText" TEXT,
    "conditionResponsible" TEXT,
    "conditionDeadline" TIMESTAMP(3),
    "conditionEffect" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "qualifications_supplierId_idx" ON "qualifications"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "qualifications_supplierId_round_key" ON "qualifications"("supplierId", "round");

-- AddForeignKey
ALTER TABLE "qualifications" ADD CONSTRAINT "qualifications_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualifications" ADD CONSTRAINT "qualifications_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualifications" ADD CONSTRAINT "qualifications_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
