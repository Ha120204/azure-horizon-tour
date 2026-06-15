-- AlterTable
ALTER TABLE "User" ADD COLUMN     "superAdminViewGrants" TEXT[] DEFAULT ARRAY[]::TEXT[];
