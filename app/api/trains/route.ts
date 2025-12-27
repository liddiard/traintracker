import fetchAmtrak from './amtrak'
import fetchVia from './via'
import fetchBrightline from './brightline'
import { Train } from '@/app/types'
import { startPolling } from '@/app/lib/notifications'
// import data from './example-response.json'

// Caching
const cacheDurationMs = 60 * 1000 // 1 minute
let lastChecked: Date | null = null
let cache: Train[] = []

// Start notification polling when module loads
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_NOTIFICATIONS) {
  console.log('Starting notification polling')
  startPolling()
}

export async function GET() {
  try {
    if (lastChecked && Date.now() - lastChecked.getTime() <= cacheDurationMs) {
      return Response.json(cache)
    }

    const [amtrak, via, brightline] = await Promise.all([
      fetchAmtrak(),
      fetchVia(),
      fetchBrightline(),
    ])
    cache = [...amtrak, ...via, ...brightline]
    lastChecked = new Date()

    return Response.json(cache)
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
