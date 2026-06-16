-- CreateEnum
CREATE TYPE "BudgetType" AS ENUM ('fixed', 'hourly');

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN "budgetType" "BudgetType" NOT NULL DEFAULT 'fixed';
ALTER TABLE "jobs" ADD COLUMN "budgetHoursMin" DECIMAL(10,2);
ALTER TABLE "jobs" ADD COLUMN "budgetHoursMax" DECIMAL(10,2);
ALTER TABLE "jobs" ALTER COLUMN "budgetAsset" SET DEFAULT 'USDC';
