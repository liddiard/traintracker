import { prisma } from '@/app/lib/prisma'

/**
 * Looks up the GeoJSON track ID for a given train number and agency.
 * @param trainNum - Train number
 * @param agency - Agency name (e.g., 'amtrak', 'via', etc.)
 * @returns The track ID as a string, or null if not found.
 */
export async function getTrack(
  trainNum: string,
  agency: string,
): Promise<string | null> {
  const trip = await prisma.gtfsTrip.findFirst({
    where: {
      tripShortName: trainNum,
      agency: agency,
    },
    select: {
      shapeId: true,
    },
  })
  // remove agency prefix
  return trip?.shapeId?.split('/')[1] ?? null
}
