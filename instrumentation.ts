// https://nextjs.org/docs/app/guides/instrumentation
export async function register() {
  // only run on server (Node.js runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { importGtfsData } = await import('./app/lib/gtfs-import')
    await importGtfsData()
  }
}
