export async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'API request failed' }))
    throw new Error(error.error || 'API request failed')
  }

  return response.json()
}

// POST/PUT/DELETE用
export async function mutationFetcher<T>(
  url: string,
  { arg }: { arg: { method: string; body?: any } }
): Promise<T> {
  const response = await fetch(url, {
    method: arg.method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: arg.body ? JSON.stringify(arg.body) : undefined,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'API request failed' }))
    throw new Error(error.error || 'API request failed')
  }

  return response.json()
}
