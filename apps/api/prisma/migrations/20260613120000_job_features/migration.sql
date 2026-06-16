-- AlterEnum
ALTER TYPE "JobStatus" ADD VALUE 'review';
ALTER TYPE "JobStatus" ADD VALUE 'archived';

-- AlterEnum
ALTER TYPE "BudgetType" ADD VALUE 'milestone';

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('pending', 'active', 'completed', 'cancelled');

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'public';
ALTER TABLE "jobs" ADD COLUMN "categoryId" UUID;
ALTER TABLE "jobs" ADD COLUMN "applicationLimit" INTEGER DEFAULT 50;
ALTER TABLE "jobs" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "milestones" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(20,7) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "position" INTEGER NOT NULL DEFAULT 0,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "parentId" UUID,
    "level" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_changes" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "milestones_jobId_idx" ON "milestones"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "job_categories_slug_key" ON "job_categories"("slug");

-- CreateIndex
CREATE INDEX "job_categories_parentId_idx" ON "job_categories"("parentId");

-- CreateIndex
CREATE INDEX "job_categories_slug_idx" ON "job_categories"("slug");

-- CreateIndex
CREATE INDEX "job_categories_level_idx" ON "job_categories"("level");

-- CreateIndex
CREATE INDEX "job_changes_jobId_createdAt_idx" ON "job_changes"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "jobs_categoryId_idx" ON "jobs"("categoryId");

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_categories" ADD CONSTRAINT "job_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "job_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_changes" ADD CONSTRAINT "job_changes_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "job_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
