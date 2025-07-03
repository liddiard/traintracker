import fetchAmtrak from './amtrak'
// import data from './example-response.json'

// setInterval(() => {
//   console.log(new Date())
// }, 60*1000)

export async function GET() {
  const data = await fetchAmtrak()
  console.log(JSON.stringify(data.features, null, 2))
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
