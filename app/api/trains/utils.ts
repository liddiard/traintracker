import { prisma } from '@/app/lib/prisma'
import { dateToIsoString } from '@/app/utils'

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

/**
 * Generates a stable train ID based on the agency, train number, and departure time.
 * This is necessary because the train IDs provided upstram APIs are not always stable
 * throughout the train's journey.
 * @param agency - The agency operating the train (e.g., 'amtrak', 'via')
 * @param trainNum - The train number as a string
 * @param departureTime - The departure time of the train as a Date object
 * @param departureTz - The timezone of the departure time (e.g., 'America/New_York')
 * @returns A stable train ID in the format "agency/trainNum_YYYY-MM-DD"
 */
export const getTrainId = (
  agency: string,
  trainNum: string,
  departureTime: Date,
  departureTz?: string,
) => `${agency}/${trainNum}_${dateToIsoString(departureTime, departureTz)}`
