-- CreateEnum
CREATE TYPE "ValidityType" AS ENUM ('FIXA', 'INFORMADA', 'SEM_VENCIMENTO');

-- CreateEnum
CREATE TYPE "RequirementObligation" AS ENUM ('OBRIGATORIO', 'CONDICIONAL', 'INFORMATIVO');

-- CreateEnum
CREATE TYPE "DocumentVersionStatus" AS ENUM ('ENVIADO', 'EM_ANALISE', 'APROVADO', 'REJEITADO');

-- CreateTable
CREATE TABLE "requirement_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "allowedFormats" TEXT[],
    "validityType" "ValidityType" NOT NULL DEFAULT 'SEM_VENCIMENTO',
    "validityDays" INTEGER,
    "needsIssueDate" BOOLEAN NOT NULL DEFAULT false,
    "alertWindowDays" INTEGER[] DEFAULT ARRAY[60, 30, 15, 7]::INTEGER[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requirement_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requirement_rules" (
    "id" TEXT NOT NULL,
    "requirementTypeId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "criticalities" "Criticality"[],
    "obligation" "RequirementObligation" NOT NULL DEFAULT 'OBRIGATORIO',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requirement_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_requirements" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "requirementTypeId" TEXT NOT NULL,
    "obligation" "RequirementObligation" NOT NULL,
    "sourceRuleId" TEXT,
    "applicable" BOOLEAN NOT NULL DEFAULT true,
    "applicabilityReason" TEXT,
    "applicabilityDecidedById" TEXT,
    "applicabilityDecidedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_objects" (
    "id" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" TEXT NOT NULL,
    "supplierRequirementId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "fileObjectId" TEXT NOT NULL,
    "documentNumber" TEXT,
    "issuer" TEXT,
    "issuedAt" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "submitterNote" TEXT,
    "status" "DocumentVersionStatus" NOT NULL DEFAULT 'ENVIADO',
    "submittedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewReason" TEXT,
    "internalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "requirement_types_code_key" ON "requirement_types"("code");

-- CreateIndex
CREATE INDEX "requirement_rules_requirementTypeId_idx" ON "requirement_rules"("requirementTypeId");

-- CreateIndex
CREATE INDEX "requirement_rules_categoryId_idx" ON "requirement_rules"("categoryId");

-- CreateIndex
CREATE INDEX "supplier_requirements_supplierId_idx" ON "supplier_requirements"("supplierId");

-- CreateIndex
CREATE INDEX "supplier_requirements_requirementTypeId_idx" ON "supplier_requirements"("requirementTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_requirements_supplierId_requirementTypeId_key" ON "supplier_requirements"("supplierId", "requirementTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "file_objects_storageKey_key" ON "file_objects"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_fileObjectId_key" ON "document_versions"("fileObjectId");

-- CreateIndex
CREATE INDEX "document_versions_supplierRequirementId_idx" ON "document_versions"("supplierRequirementId");

-- CreateIndex
CREATE INDEX "document_versions_status_idx" ON "document_versions"("status");

-- CreateIndex
CREATE INDEX "document_versions_validUntil_idx" ON "document_versions"("validUntil");

-- AddForeignKey
ALTER TABLE "requirement_rules" ADD CONSTRAINT "requirement_rules_requirementTypeId_fkey" FOREIGN KEY ("requirementTypeId") REFERENCES "requirement_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requirement_rules" ADD CONSTRAINT "requirement_rules_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_requirements" ADD CONSTRAINT "supplier_requirements_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_requirements" ADD CONSTRAINT "supplier_requirements_requirementTypeId_fkey" FOREIGN KEY ("requirementTypeId") REFERENCES "requirement_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_objects" ADD CONSTRAINT "file_objects_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_supplierRequirementId_fkey" FOREIGN KEY ("supplierRequirementId") REFERENCES "supplier_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_fileObjectId_fkey" FOREIGN KEY ("fileObjectId") REFERENCES "file_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
