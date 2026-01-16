-- CreateTable
CREATE TABLE "GtfsShape" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shapeId" TEXT NOT NULL,
    "ptLat" REAL NOT NULL,
    "ptLon" REAL NOT NULL,
    "ptSequence" INTEGER NOT NULL,
    "distTraveled" REAL,
    "agency" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "GtfsShape_agency_idx" ON "GtfsShape"("agency");
