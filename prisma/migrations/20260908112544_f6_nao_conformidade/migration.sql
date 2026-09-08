-- CreateEnum
CREATE TYPE "NonConformityOrigin" AS ENUM ('FISCALIZACAO', 'MANUAL');

-- CreateEnum
CREATE TYPE "NonConformityStatus" AS ENUM ('ABERTA', 'AGUARDANDO_PLANO', 'PLANO_EM_ANALISE', 'EM_CORRECAO', 'AGUARDANDO_VERIFICACAO', 'ENCERRADA');

-- CreateEnum
CREATE TYPE "ActionPlanDecision" AS ENUM ('ACEITO', 'REJEITADO', 'AJUSTES_SOLICITADOS');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('REMOTA', 'PRESENCIAL');

-- CreateEnum
CREATE TYPE "VerificationDecision" AS ENUM ('APROVADA', 'REJEITADA');

-- AlterEnum
ALTER TYPE "SensitivePermission" ADD VALUE 'NC_DECIDE';

-- AlterTable
ALTER TABLE "evidences" ADD COLUMN     "correctiveActionId" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "nonConformityId" TEXT,
ALTER COLUMN "inspectionAnswerId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "non_conformities" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "supplierId" TEXT NOT NULL,
    "origin" "NonConformityOrigin" NOT NULL,
    "inspectionId" TEXT,
    "inspectionAnswerId" TEXT,
    "categoryId" TEXT,
    "severity" "Criticality" NOT NULL,
    "description" TEXT NOT NULL,
    "responsibleInternalId" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "status" "NonConformityStatus" NOT NULL DEFAULT 'ABERTA',
    "createdById" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3),
    "openedById" TEXT,
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "reopenedAt" TIMESTAMP(3),
    "reopenedById" TEXT,
    "reopenReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "non_conformities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corrective_actions" (
    "id" TEXT NOT NULL,
    "nonConformityId" TEXT NOT NULL,
    "cause" TEXT,
    "correctiveAction" TEXT,
    "responsibleName" TEXT,
    "proposedDeadline" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "submittedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewDecision" "ActionPlanDecision",
    "reviewReason" TEXT,
    "readyForVerificationAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "verificationMethod" "VerificationMethod",
    "verificationDecision" "VerificationDecision",
    "verificationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corrective_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "non_conformities_code_key" ON "non_conformities"("code");

-- CreateIndex
CREATE INDEX "non_conformities_supplierId_idx" ON "non_conformities"("supplierId");

-- CreateIndex
CREATE INDEX "non_conformities_status_idx" ON "non_conformities"("status");

-- CreateIndex
CREATE INDEX "non_conformities_deadline_idx" ON "non_conformities"("deadline");

-- CreateIndex
CREATE UNIQUE INDEX "corrective_actions_nonConformityId_key" ON "corrective_actions"("nonConformityId");

-- CreateIndex
CREATE INDEX "evidences_nonConformityId_idx" ON "evidences"("nonConformityId");

-- CreateIndex
CREATE INDEX "evidences_correctiveActionId_idx" ON "evidences"("correctiveActionId");

-- AddForeignKey
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_nonConformityId_fkey" FOREIGN KEY ("nonConformityId") REFERENCES "non_conformities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_correctiveActionId_fkey" FOREIGN KEY ("correctiveActionId") REFERENCES "corrective_actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "non_conformities" ADD CONSTRAINT "non_conformities_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "non_conformities" ADD CONSTRAINT "non_conformities_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "non_conformities" ADD CONSTRAINT "non_conformities_inspectionAnswerId_fkey" FOREIGN KEY ("inspectionAnswerId") REFERENCES "inspection_answers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "non_conformities" ADD CONSTRAINT "non_conformities_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "non_conformities" ADD CONSTRAINT "non_conformities_responsibleInternalId_fkey" FOREIGN KEY ("responsibleInternalId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "non_conformities" ADD CONSTRAINT "non_conformities_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "non_conformities" ADD CONSTRAINT "non_conformities_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "non_conformities" ADD CONSTRAINT "non_conformities_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "non_conformities" ADD CONSTRAINT "non_conformities_reopenedById_fkey" FOREIGN KEY ("reopenedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_nonConformityId_fkey" FOREIGN KEY ("nonConformityId") REFERENCES "non_conformities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
