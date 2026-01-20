/*
  Warnings:

  - You are about to drop the column `distTraveled` on the `GtfsShape` table. All the data in the column will be lost.
  - You are about to drop the column `locationType` on the `GtfsStop` table. All the data in the column will be lost.
  - You are about to drop the column `parentStation` on the `GtfsStop` table. All the data in the column will be lost.
  - You are about to drop the column `platformCode` on the `GtfsStop` table. All the data in the column will be lost.
  - You are about to drop the column `stopDesc` on the `GtfsStop` table. All the data in the column will be lost.
  - You are about to drop the column `stopId` on the `GtfsStop` table. All the data in the column will be lost.
  - You are about to drop the column `stopUrl` on the `GtfsStop` table. All the data in the column will be lost.
  - You are about to drop the column `zoneId` on the `GtfsStop` table. All the data in the column will be lost.
  - You are about to drop the column `bikesAllowed` on the `GtfsTrip` table. All the data in the column will be lost.
  - You are about to drop the column `blockId` on the `GtfsTrip` table. All the data in the column will be lost.
  - You are about to drop the column `directionId` on the `GtfsTrip` table. All the data in the column will be lost.
  - You are about to drop the column `routeId` on the `GtfsTrip` table. All the data in the column will be lost.
  - You are about to drop the column `serviceId` on the `GtfsTrip` table. All the data in the column will be lost.
  - You are about to drop the column `tripHeadsign` on the `GtfsTrip` table. All the data in the column will be lost.
  - You are about to drop the column `tripId` on the `GtfsTrip` table. All the data in the column will be lost.
  - You are about to drop the column `wheelchairAccessible` on the `GtfsTrip` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GtfsShape" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shapeId" TEXT NOT NULL,
    "ptLat" REAL NOT NULL,
    "ptLon" REAL NOT NULL,
    "ptSequence" INTEGER NOT NULL,
    "agency" TEXT NOT NULL
);
INSERT INTO "new_GtfsShape" ("agency", "id", "ptLat", "ptLon", "ptSequence", "shapeId") SELECT "agency", "id", "ptLat", "ptLon", "ptSequence", "shapeId" FROM "GtfsShape";
DROP TABLE "GtfsShape";
ALTER TABLE "new_GtfsShape" RENAME TO "GtfsShape";
CREATE INDEX "GtfsShape_agency_idx" ON "GtfsShape"("agency");
CREATE TABLE "new_GtfsStop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agency" TEXT NOT NULL,
    "stopCode" TEXT,
    "stopName" TEXT,
    "stopLat" REAL,
    "stopLon" REAL,
    "stopTimezone" TEXT,
    "wheelchairBoarding" INTEGER
);
INSERT INTO "new_GtfsStop" ("agency", "id", "stopCode", "stopLat", "stopLon", "stopName", "stopTimezone", "wheelchairBoarding") SELECT "agency", "id", "stopCode", "stopLat", "stopLon", "stopName", "stopTimezone", "wheelchairBoarding" FROM "GtfsStop";
DROP TABLE "GtfsStop";
ALTER TABLE "new_GtfsStop" RENAME TO "GtfsStop";
CREATE INDEX "GtfsStop_agency_idx" ON "GtfsStop"("agency");
CREATE INDEX "GtfsStop_stopCode_idx" ON "GtfsStop"("stopCode");
CREATE TABLE "new_GtfsTrip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agency" TEXT NOT NULL,
    "tripShortName" TEXT,
    "shapeId" TEXT
);
INSERT INTO "new_GtfsTrip" ("agency", "id", "shapeId", "tripShortName") SELECT "agency", "id", "shapeId", "tripShortName" FROM "GtfsTrip";
DROP TABLE "GtfsTrip";
ALTER TABLE "new_GtfsTrip" RENAME TO "GtfsTrip";
CREATE INDEX "GtfsTrip_agency_idx" ON "GtfsTrip"("agency");
CREATE INDEX "GtfsTrip_tripShortName_idx" ON "GtfsTrip"("tripShortName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
