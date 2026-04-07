import type { PropsWithChildren } from 'react'
import { useMemo } from 'react'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { convexUrl } from './env'

export function AppProviders({ children }: PropsWithChildren) {
  const client = useMemo(() => {
    if (!convexUrl) {
      return null
    }

    return new ConvexReactClient(convexUrl)
  }, [])

  if (!client) {
    return <>{children}</>
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>
}
