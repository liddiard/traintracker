import fs from 'fs/promises'
import fetchAmtrak from './amtrak'
import fetchVia from './via'
import fetchBrightline from './brightline'
// import data from './example-response.json'

// Caching
const cacheDurationMs = 60 * 1000 // 1 minute
let lastChecked: Date | null = null
let cached: TrainResponse[] = []

export async function GET() {
  if (lastChecked && Date.now() - lastChecked.getTime() <= cacheDurationMs) {
    // TODO: return cached data
  }

  const [amtrak, via, brightline] = await Promise.all([
    fetchAmtrak(),
    fetchVia(),
    fetchBrightline(),
  ])
  cached = [...amtrak, ...via, ...brightline]
  lastChecked = new Date()

  await fs.writeFile('parsed.json', JSON.stringify(cached, null, 2), 'utf8')

  try {
    const res = await fetch('https://api-v3.amtraker.com/v3/trains', {
      next: { revalidate: 60 }, // cache for 1 minute
    })
    const data = await res.json()
    return Response.json(data)
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
