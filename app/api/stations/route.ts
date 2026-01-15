import { getStations } from '@/app/lib/stations'

export async function GET() {
  try {
    const stations = await getStations()
    return Response.json(stations)
  } catch (error) {
    console.log(error)
    let message
    if (error instanceof Error) message = error.message
    else message = String(error)
    return Response.json(
      {
        status: 502,
        error: `Failed to fetch data from upstream: ${message}`,
      },
      { status: 502 },
    )
  }
}
