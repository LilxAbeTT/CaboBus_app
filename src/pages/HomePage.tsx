import { Link } from 'react-router'

const accessCards = [
  {
    title: 'Pasajero',
    href: '/passenger-map',
    description: 'Consulta rutas y unidades activas en pocos pasos.',
    actionLabel: 'Entrar al mapa',
    tone: 'from-teal-100 via-cyan-50 to-white',
  },
  {
    title: 'Conductor',
    href: '/driver/login',
    description: 'Ingresa con tu cuenta para iniciar servicio y compartir ubicacion.',
    actionLabel: 'Ingresar',
    tone: 'from-amber-100 via-orange-50 to-white',
  },
]

export function HomePage() {
  return (
    <section className="mx-auto flex max-w-4xl flex-col items-center justify-center py-4 sm:py-8">
      <div className="panel w-full overflow-hidden">
        <div className="px-4 py-8 text-center sm:px-8 sm:py-10">
          <img
            src="/logo.png"
            alt="VaBus"
            className="mx-auto h-20 w-20 object-contain sm:h-24 sm:w-24"
          />
          <p className="eyebrow mt-5">Bienvenido</p>
          <h2 className="mt-3 font-display text-3xl text-slate-900 sm:text-5xl">
            VaBus
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Elige como quieres entrar al sistema.
          </p>

          <div className="mt-8 grid gap-4 sm:mt-10 md:grid-cols-2">
            {accessCards.map((card) => (
              <article
                key={card.href}
                className={`rounded-[1.7rem] border border-white/70 bg-gradient-to-br ${card.tone} p-5 text-left shadow-[0_20px_45px_-30px_rgba(15,35,54,0.35)] sm:p-6`}
              >
                <h3 className="font-display text-2xl text-slate-900">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {card.description}
                </p>
                <Link
                  to={card.href}
                  className="mt-6 flex min-h-12 w-full items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
                >
                  {card.actionLabel}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
