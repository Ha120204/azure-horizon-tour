-- AlterTable
ALTER TABLE "Subscriber" ALTER COLUMN "unsubscribeToken" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Tour" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
