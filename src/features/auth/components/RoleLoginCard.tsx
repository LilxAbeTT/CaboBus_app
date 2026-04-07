import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { ConvexError } from 'convex/values'
import { useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import type { AuthenticatedSession } from '../../../types/domain'

function getErrorMessage(error: unknown) {
  if (error instanceof ConvexError) {
    return String(error.data)
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Ocurrio un error inesperado al iniciar sesion.'
}

export function RoleLoginCard({
  role,
  title,
  description,
  badgeLabel,
  onSuccess,
}: {
  role: 'driver' | 'admin'
  title: string
  description: string
  badgeLabel: string
  onSuccess: (session: AuthenticatedSession) => void
}) {
  const login = useMutation(api.auth.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)

    void (async () => {
      setIsSubmitting(true)

      try {
        const session = await login({
          email,
          password,
          role,
        })

        onSuccess(session)
      } catch (error) {
        setErrorMessage(getErrorMessage(error))
      } finally {
        setIsSubmitting(false)
      }
    })()
  }

  return (
    <section className="panel overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form className="space-y-6 px-4 py-5 sm:px-6 sm:py-7" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <p className="eyebrow">{badgeLabel}</p>
            <h2 className="font-display text-2xl text-slate-900 sm:text-3xl">
              {title}
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              {description}
            </p>
          </div>

          <div className="grid gap-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">Correo</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="operacion@vabus.app"
                autoComplete="username"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Contrasena
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="********"
                autoComplete="current-password"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex min-h-11 items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSubmitting ? 'Ingresando...' : 'Entrar'}
            </button>

            <Link
              to="/"
              className="flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
            >
              Volver al inicio
            </Link>
          </div>

          {errorMessage ? (
            <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </p>
          ) : null}
        </form>

        <aside className="bg-[linear-gradient(180deg,rgba(240,249,255,0.92),rgba(244,247,240,0.98))] px-4 py-5 sm:px-6 sm:py-7">
          <p className="eyebrow text-teal-700">Acceso</p>
          <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600">
            <p>
              Este acceso esta reservado para personal operativo autorizado.
            </p>
            <p>
              El flujo publico para pasajeros sigue siendo anonimo y directo al
              mapa.
            </p>
            <p>
              Si tu sesion vence o cambia tu estado operativo, el sistema pedira
              ingresar de nuevo.
            </p>
          </div>
        </aside>
      </div>
    </section>
  )
}
