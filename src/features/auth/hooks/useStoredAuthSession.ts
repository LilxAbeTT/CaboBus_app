import { useEffect, useState } from 'react'
import type { AuthenticatedSession } from '../../../types/domain'

function readStoredSession(storageKey: string) {
  if (typeof window === 'undefined') {
    return null
  }

  const storedValue = window.localStorage.getItem(storageKey)

  if (!storedValue) {
    return null
  }

  try {
    const parsedValue = JSON.parse(storedValue) as AuthenticatedSession

    if (
      parsedValue.token &&
      parsedValue.expiresAt &&
      parsedValue.user?.id &&
      parsedValue.user?.role
    ) {
      return parsedValue
    }
  } catch {
    window.localStorage.removeItem(storageKey)
  }

  return null
}

export function useStoredAuthSession(storageKey: string) {
  const [session, setSession] = useState<AuthenticatedSession | null>(() =>
    readStoredSession(storageKey),
  )

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (!session) {
      window.localStorage.removeItem(storageKey)
      return
    }

    window.localStorage.setItem(storageKey, JSON.stringify(session))
  }, [session, storageKey])

  return {
    session,
    setSession,
    clearSession: () => setSession(null),
  }
}
