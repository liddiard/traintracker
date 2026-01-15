-- CreateTable
CREATE TABLE "GtfsStop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stopId" TEXT NOT NULL,
    "stopCode" TEXT,
    "stopName" TEXT,
    "stopDesc" TEXT,
    "stopLat" REAL,
    "stopLon" REAL,
    "zoneId" TEXT,
    "stopUrl" TEXT,
    "locationType" INTEGER,
    "parentStation" TEXT,
    "stopTimezone" TEXT,
    "wheelchairBoarding" INTEGER,
    "platformCode" TEXT,
    "agency" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "GtfsTrip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tripId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "tripHeadsign" TEXT,
    "tripShortName" TEXT,
    "directionId" INTEGER,
    "blockId" TEXT,
    "shapeId" TEXT,
    "wheelchairAccessible" INTEGER,
    "bikesAllowed" INTEGER,
    "agency" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "GtfsImportMeta" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'gtfs_import',
    "lastImportedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "GtfsStop_agency_idx" ON "GtfsStop"("agency");

-- CreateIndex
CREATE INDEX "GtfsStop_stopCode_idx" ON "GtfsStop"("stopCode");

-- CreateIndex
CREATE INDEX "GtfsTrip_agency_idx" ON "GtfsTrip"("agency");

-- CreateIndex
CREATE INDEX "GtfsTrip_routeId_idx" ON "GtfsTrip"("routeId");

-- CreateIndex
CREATE INDEX "GtfsTrip_serviceId_idx" ON "GtfsTrip"("serviceId");
