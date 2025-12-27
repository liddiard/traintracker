/*
  Warnings:

  - You are about to drop the column `expiresAt` on the `PushSubscription` table. All the data in the column will be lost.
  - Added the required column `timeFormat` to the `PushSubscription` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PushSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "trainId" TEXT NOT NULL,
    "stopCode" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL,
    "timeFormat" TEXT NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_PushSubscription" ("auth", "createdAt", "endpoint", "id", "notificationType", "p256dh", "sent", "stopCode", "trainId") SELECT "auth", "createdAt", "endpoint", "id", "notificationType", "p256dh", "sent", "stopCode", "trainId" FROM "PushSubscription";
DROP TABLE "PushSubscription";
ALTER TABLE "new_PushSubscription" RENAME TO "PushSubscription";
CREATE INDEX "PushSubscription_trainId_sent_idx" ON "PushSubscription"("trainId", "sent");
CREATE INDEX "PushSubscription_endpoint_idx" ON "PushSubscription"("endpoint");
CREATE UNIQUE INDEX "PushSubscription_endpoint_trainId_stopCode_notificationType_key" ON "PushSubscription"("endpoint", "trainId", "stopCode", "notificationType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
