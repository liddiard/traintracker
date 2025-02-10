export async function GET() {
  try {
    const res = await fetch('https://api-v3.amtraker.com/v3/stations', {
      next: { revalidate: 60 * 60 }, // cache for 1 hour
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
