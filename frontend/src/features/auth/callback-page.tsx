import { useEffect, useMemo, useState } from 'react'

type CallbackPageProps = {
  searchParams?: URLSearchParams
  completeAuthCallback?: (searchParams: URLSearchParams) => Promise<{ redirectTo: string }>
  navigate?: (to: string) => void
}

async function defaultCompleteAuthCallback() {
  return { redirectTo: '/' }
}

function defaultNavigate(to: string) {
  window.location.assign(to)
}

export function CallbackPage({
  searchParams,
  completeAuthCallback = defaultCompleteAuthCallback,
  navigate = defaultNavigate,
}: CallbackPageProps) {
  const [error, setError] = useState<string | null>(null)
  const resolvedSearchParams = useMemo(
    () => searchParams ?? new URLSearchParams(window.location.search),
    [searchParams],
  )

  useEffect(() => {
    let isCancelled = false

    completeAuthCallback(resolvedSearchParams)
      .then(({ redirectTo }) => {
        if (!isCancelled) {
          navigate(redirectTo)
        }
      })
      .catch((nextError: unknown) => {
        if (isCancelled) {
          return
        }

        setError(nextError instanceof Error ? nextError.message : 'Failed to sign in.')
      })

    return () => {
      isCancelled = true
    }
  }, [completeAuthCallback, navigate, resolvedSearchParams])

  if (error) {
    return <p>{error}</p>
  }

  return <p>Signing you in...</p>
}
