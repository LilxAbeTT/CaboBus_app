import { useEffect, useState } from 'react'

export function useCurrentTime(intervalMs = 1000) {
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now())

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTimeMs(Date.now())
    }, intervalMs)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [intervalMs])

  return currentTimeMs
}
