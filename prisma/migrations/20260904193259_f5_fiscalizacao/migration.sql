-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('PROGRAMADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "InspectionResponse" AS ENUM ('CONFORME', 'CONFORME_COM_RESSALVA', 'NAO_CONFORME', 'NAO_APLICAVEL');

-- CreateTable
CREATE TABLE "checklist_templates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checklist_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_sections" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "checklist_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_items" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "guidance" TEXT,
    "allowedResponses" "InspectionResponse"[] DEFAULT ARRAY['CONFORME', 'CONFORME_COM_RESSALVA', 'NAO_CONFORME', 'NAO_APLICAVEL']::"InspectionResponse"[],
    "evidenceRequiredOn" "InspectionResponse"[] DEFAULT ARRAY['NAO_CONFORME']::"InspectionResponse"[],
    "observationRequiredOn" "InspectionResponse"[] DEFAULT ARRAY['NAO_CONFORME', 'NAO_APLICAVEL']::"InspectionResponse"[],
    "generatesNonConformity" BOOLEAN NOT NULL DEFAULT false,
    "defaultSeverity" "Criticality",

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "templateId" TEXT,
    "checklistSnapshot" JSONB NOT NULL,
    "projectOrLocation" TEXT,
    "type" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "inspectorId" TEXT NOT NULL,
    "status" "InspectionStatus" NOT NULL DEFAULT 'PROGRAMADA',
    "startedAt" TIMESTAMP(3),
    "concludedAt" TIMESTAMP(3),
    "concludedById" TEXT,
    "conformityPercentage" DOUBLE PRECISION,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "cancelReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_answers" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "response" "InspectionResponse",
    "observation" TEXT,
    "answeredAt" TIMESTAMP(3),
    "answeredById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidences" (
    "id" TEXT NOT NULL,
    "inspectionAnswerId" TEXT NOT NULL,
    "fileObjectId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "checklist_sections_templateId_idx" ON "checklist_sections"("templateId");

-- CreateIndex
CREATE INDEX "checklist_items_sectionId_idx" ON "checklist_items"("sectionId");

-- CreateIndex
CREATE INDEX "inspections_supplierId_idx" ON "inspections"("supplierId");

-- CreateIndex
CREATE INDEX "inspections_status_idx" ON "inspections"("status");

-- CreateIndex
CREATE INDEX "inspections_scheduledAt_idx" ON "inspections"("scheduledAt");

-- CreateIndex
CREATE INDEX "inspection_answers_inspectionId_idx" ON "inspection_answers"("inspectionId");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_answers_inspectionId_itemId_key" ON "inspection_answers"("inspectionId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "evidences_fileObjectId_key" ON "evidences"("fileObjectId");

-- CreateIndex
CREATE INDEX "evidences_inspectionAnswerId_idx" ON "evidences"("inspectionAnswerId");

-- AddForeignKey
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_sections" ADD CONSTRAINT "checklist_sections_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "checklist_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "checklist_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "checklist_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_concludedById_fkey" FOREIGN KEY ("concludedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_answers" ADD CONSTRAINT "inspection_answers_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_inspectionAnswerId_fkey" FOREIGN KEY ("inspectionAnswerId") REFERENCES "inspection_answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_fileObjectId_fkey" FOREIGN KEY ("fileObjectId") REFERENCES "file_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
