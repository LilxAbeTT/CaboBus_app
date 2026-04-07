import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

export function useAdminOperationalOverview(
  sessionToken: string,
  nowMs: number,
) {
  return useQuery(api.admin.getDashboardState, {
    sessionToken,
    nowMs,
  })
}
