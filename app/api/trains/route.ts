import { promises as fs } from 'fs'

// setInterval(() => {
//   console.log(new Date())
// }, 60*1000)

export async function GET() {
  try {
    const res = await fetch('https://api-v3.amtraker.com/v3/trains', {
      next: { revalidate: 60 },
    })
    const data = await res.json()

    // const file = await fs.readFile(
    //   process.cwd() + '/app/api/trains/example-response.json',
    //   'utf8',
    // )
    // const data = JSON.parse(file)

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
