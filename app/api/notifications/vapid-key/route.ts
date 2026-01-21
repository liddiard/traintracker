export async function GET() {
  // Validate VAPID env vars are present at runtime
  if (!process.env.VAPID_PUBLIC_KEY) {
    return Response.json(
      { error: 'VAPID configuration not available' },
      { status: 500 },
    )
  }

  return Response.json({
    publicKey: process.env.VAPID_PUBLIC_KEY,
  })
}
