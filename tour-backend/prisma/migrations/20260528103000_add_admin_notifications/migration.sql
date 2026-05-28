CREATE TABLE "AdminNotification" (
  "id" SERIAL NOT NULL,
  "type" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "href" TEXT,
  "severity" TEXT NOT NULL DEFAULT 'info',
  "targetRoles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminNotificationRead" (
  "id" SERIAL NOT NULL,
  "notificationId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AdminNotificationRead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminNotification_type_createdAt_idx"
ON "AdminNotification"("type", "createdAt");

CREATE INDEX "AdminNotification_resourceType_resourceId_idx"
ON "AdminNotification"("resourceType", "resourceId");

CREATE INDEX "AdminNotification_createdAt_idx"
ON "AdminNotification"("createdAt");

CREATE UNIQUE INDEX "AdminNotificationRead_notificationId_userId_key"
ON "AdminNotificationRead"("notificationId", "userId");

CREATE INDEX "AdminNotificationRead_userId_readAt_idx"
ON "AdminNotificationRead"("userId", "readAt");

ALTER TABLE "AdminNotificationRead"
ADD CONSTRAINT "AdminNotificationRead_notificationId_fkey"
FOREIGN KEY ("notificationId") REFERENCES "AdminNotification"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdminNotificationRead"
ADD CONSTRAINT "AdminNotificationRead_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
