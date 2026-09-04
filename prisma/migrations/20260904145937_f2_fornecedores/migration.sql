/*
  Warnings:

  - You are about to drop the column `organizationId` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `organizations` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SupplyType" AS ENUM ('MATERIAL', 'SERVICO', 'AMBOS');

-- CreateEnum
CREATE TYPE "Criticality" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "SupplierRegistrationStatus" AS ENUM ('CONVITE_ENVIADO', 'EM_PREENCHIMENTO', 'ENVIADO_PARA_ANALISE', 'EM_ANALISE', 'AJUSTES_SOLICITADOS', 'CADASTRO_VALIDADO', 'REJEITADO', 'INATIVO');

-- CreateEnum
CREATE TYPE "SupplierOperationalStatus" AS ENUM ('REGULAR', 'ATENCAO', 'IRREGULAR', 'SUSPENSO', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "SupplierResponsibleType" AS ENUM ('COMPRADOR', 'GESTOR_CONTRATO', 'FISCAL');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('COMERCIAL', 'FINANCEIRO', 'TECNICO', 'QSMS', 'OUTRO');

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_organizationId_fkey";

-- DropIndex
DROP INDEX "users_organizationId_idx";

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "organizationId",
ADD COLUMN     "supplierId" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "organizationId",
ADD COLUMN     "supplierId" TEXT;

-- DropTable
DROP TABLE "organizations";

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT,
    "stateRegistration" TEXT,
    "municipalRegistration" TEXT,
    "website" TEXT,
    "companySize" TEXT,
    "registeredStatusInformed" TEXT,
    "addressZip" TEXT,
    "addressStreet" TEXT,
    "addressNumber" TEXT,
    "addressComplement" TEXT,
    "addressDistrict" TEXT,
    "addressCity" TEXT,
    "addressState" TEXT,
    "addressCountry" TEXT NOT NULL DEFAULT 'BR',
    "supplyType" "SupplyType",
    "criticality" "Criticality",
    "registrationStatus" "SupplierRegistrationStatus" NOT NULL DEFAULT 'CONVITE_ENVIADO',
    "operationalStatus" "SupplierOperationalStatus" NOT NULL DEFAULT 'REGULAR',
    "operationalReason" TEXT,
    "inviteSentAt" TIMESTAMP(3),
    "inviteCancelledAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_contacts" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "contactType" "ContactType" NOT NULL DEFAULT 'OUTRO',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_categories" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_responsibles" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "SupplierResponsibleType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_responsibles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_cnpj_key" ON "suppliers"("cnpj");

-- CreateIndex
CREATE INDEX "suppliers_registrationStatus_idx" ON "suppliers"("registrationStatus");

-- CreateIndex
CREATE INDEX "suppliers_operationalStatus_idx" ON "suppliers"("operationalStatus");

-- CreateIndex
CREATE INDEX "suppliers_criticality_idx" ON "suppliers"("criticality");

-- CreateIndex
CREATE INDEX "supplier_contacts_supplierId_idx" ON "supplier_contacts"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_code_key" ON "categories"("code");

-- CreateIndex
CREATE INDEX "supplier_categories_categoryId_idx" ON "supplier_categories"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_categories_supplierId_categoryId_key" ON "supplier_categories"("supplierId", "categoryId");

-- CreateIndex
CREATE INDEX "supplier_responsibles_supplierId_idx" ON "supplier_responsibles"("supplierId");

-- CreateIndex
CREATE INDEX "supplier_responsibles_userId_idx" ON "supplier_responsibles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_responsibles_supplierId_userId_type_key" ON "supplier_responsibles"("supplierId", "userId", "type");

-- CreateIndex
CREATE INDEX "audit_logs_supplierId_visibility_idx" ON "audit_logs"("supplierId", "visibility");

-- CreateIndex
CREATE INDEX "users_supplierId_idx" ON "users"("supplierId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_contacts" ADD CONSTRAINT "supplier_contacts_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_categories" ADD CONSTRAINT "supplier_categories_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_categories" ADD CONSTRAINT "supplier_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_responsibles" ADD CONSTRAINT "supplier_responsibles_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_responsibles" ADD CONSTRAINT "supplier_responsibles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
