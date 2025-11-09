/**
 * Builds a JSON response with standardized headers.
 * @param body - The JSON-serializable payload.
 * @param init - Optional response init overrides.
 * @returns A Cloudflare Worker Response instance.
 */
export function jsonResponse(body: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers)
  headers.set('content-type', 'application/json; charset=utf-8')
  headers.set('cache-control', 'no-store')

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  })
}
