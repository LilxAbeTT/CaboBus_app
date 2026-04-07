import { ConvexError, v } from 'convex/values'
import { mutation, query } from './_generated/server'
import {
  createUserSession,
  getAuthenticatedSession,
  hashPassword,
  invalidateSession,
  normalizeEmail,
  toUserSummary,
} from './lib/auth'

export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    role: v.union(v.literal('driver'), v.literal('admin')),
  },
  handler: async ({ db }, { email, password, role }) => {
    const normalizedEmail = normalizeEmail(email)
    const user = await db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', normalizedEmail))
      .first()

    if (
      !user ||
      user.role !== role ||
      user.status !== 'active' ||
      !user.passwordHash
    ) {
      throw new ConvexError('Credenciales invalidas.')
    }

    const passwordHash = await hashPassword(password)

    if (passwordHash !== user.passwordHash) {
      throw new ConvexError('Credenciales invalidas.')
    }

    const session = await createUserSession(db, user)

    return {
      token: session.token,
      expiresAt: session.expiresAt,
      user: toUserSummary(user),
    }
  },
})

export const logout = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async ({ db }, { sessionToken }) => {
    await invalidateSession(db, sessionToken)

    return {
      loggedOut: true,
    }
  },
})

export const getSession = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async ({ db }, { sessionToken }) => {
    const session = await getAuthenticatedSession(db, sessionToken)

    if (!session) {
      return null
    }

    return {
      token: session.session.token,
      expiresAt: session.session.expiresAt,
      user: toUserSummary(session.user),
    }
  },
})
