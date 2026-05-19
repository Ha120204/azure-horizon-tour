-- Repair voucher usage that may have been consumed when a booking was created
-- before payment was completed. A voucher is counted as used only when at least
-- one non-deleted booking with that voucher code has paymentStatus = 'PAID'.

UPDATE "Voucher" AS v
SET "usedCount" = paid_usage."usedCount"
FROM (
    SELECT
        voucher_scope."id",
        COUNT(b."id")::INTEGER AS "usedCount"
    FROM "Voucher" AS voucher_scope
    LEFT JOIN "Booking" AS b
        ON UPPER(TRIM(b."voucherCode")) = voucher_scope."code"
        AND b."paymentStatus" = 'PAID'
        AND b."deletedAt" IS NULL
    GROUP BY voucher_scope."id"
) AS paid_usage
WHERE v."id" = paid_usage."id";

UPDATE "UserVoucher" AS uv
SET "isUsed" = EXISTS (
    SELECT 1
    FROM "Voucher" AS v
    INNER JOIN "Booking" AS b
        ON UPPER(TRIM(b."voucherCode")) = v."code"
    WHERE v."id" = uv."voucherId"
        AND b."userId" = uv."userId"
        AND b."paymentStatus" = 'PAID'
        AND b."deletedAt" IS NULL
);
