-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailChangeNewEmail" TEXT,
ADD COLUMN     "emailChangeOtp" TEXT,
ADD COLUMN     "emailChangeOtpExpires" TIMESTAMP(3),
ADD COLUMN     "verificationTokenHash" TEXT;
