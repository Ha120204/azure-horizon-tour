CREATE TABLE "SuperRiskReview" (
    "id" SERIAL NOT NULL,
    "riskKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "note" TEXT,
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuperRiskReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SuperRiskReview_riskKey_key" ON "SuperRiskReview"("riskKey");
CREATE INDEX "SuperRiskReview_status_updatedAt_idx" ON "SuperRiskReview"("status", "updatedAt");
CREATE INDEX "SuperRiskReview_reviewedById_updatedAt_idx" ON "SuperRiskReview"("reviewedById", "updatedAt");

ALTER TABLE "SuperRiskReview"
ADD CONSTRAINT "SuperRiskReview_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
