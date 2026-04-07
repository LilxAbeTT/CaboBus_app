import { useState } from 'react'
import { ConvexError } from 'convex/values'
import { useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import type {
  AuthenticatedSession,
  AdminDashboardState,
  AdminManagedDriver,
  AdminManagedVehicle,
  AdminOperationalService,
} from '../../../types/domain'
import { useCurrentTime } from '../../../hooks/useCurrentTime'
import {
  formatElapsedSignalTime,
  getOperationalStatusLabel,
} from '../../../lib/trackingSignal'
import { useAdminOperationalOverview } from '../hooks/useAdminOperationalOverview'

function formatDateTime(value?: string) {
  if (!value) {
    return 'Sin registro'
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getErrorMessage(error: unknown) {
  if (error instanceof ConvexError) {
    return String(error.data)
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Ocurrio un error inesperado.'
}

function getServiceStatusBadgeClass(status: AdminOperationalService['status']) {
  switch (status) {
    case 'active':
      return 'bg-emerald-100 text-emerald-700'
    case 'paused':
      return 'bg-amber-100 text-amber-700'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

function getOperationalBadgeClass(
  status: AdminOperationalService['operationalStatus'],
) {
  switch (status) {
    case 'active_recent':
      return 'bg-emerald-100 text-emerald-700'
    case 'active_stale':
      return 'bg-amber-100 text-amber-700'
    case 'probably_stopped':
      return 'bg-rose-100 text-rose-700'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

function getManagedStatusBadgeClass(status: 'active' | 'inactive' | 'available' | 'in_service' | 'maintenance') {
  switch (status) {
    case 'active':
    case 'available':
      return 'bg-emerald-100 text-emerald-700'
    case 'in_service':
      return 'bg-sky-100 text-sky-700'
    case 'maintenance':
      return 'bg-amber-100 text-amber-700'
    case 'inactive':
      return 'bg-slate-200 text-slate-700'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

function AdminEmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <section className="panel px-4 py-5 sm:px-6 sm:py-6">
      <p className="eyebrow">Admin</p>
      <h2 className="mt-3 font-display text-xl text-slate-900 sm:text-2xl">
        {title}
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
        {description}
      </p>
    </section>
  )
}

function AdminDashboardContent({
  dashboard,
  currentTimeMs,
  onLogout,
  sessionToken,
}: {
  dashboard: AdminDashboardState
  currentTimeMs: number
  onLogout: () => void
  sessionToken: string
}) {
  const logout = useMutation(api.auth.logout)
  const createDriver = useMutation(api.admin.createDriver)
  const updateDriver = useMutation(api.admin.updateDriver)
  const createVehicle = useMutation(api.admin.createVehicle)
  const updateVehicle = useMutation(api.admin.updateVehicle)
  const pauseService = useMutation(api.admin.pauseService)
  const resumeService = useMutation(api.admin.resumeService)
  const finishService = useMutation(api.admin.finishService)

  const [driverForm, setDriverForm] = useState<{
    name: string
    email: string
    status: 'active' | 'inactive'
    password: string
    defaultRouteId: string
    defaultVehicleId: string
  }>({
    name: '',
    email: '',
    status: 'active',
    password: '',
    defaultRouteId: '',
    defaultVehicleId: '',
  })
  const [vehicleForm, setVehicleForm] = useState<{
    unitNumber: string
    label: string
    status: 'available' | 'maintenance'
    defaultRouteId: string
  }>({
    unitNumber: '',
    label: '',
    status: 'available',
    defaultRouteId: '',
  })
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null)
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const summaryCards = [
    {
      label: 'Servicios abiertos',
      value: String(dashboard.overview.totals.openServices),
      hint: 'Incluye activos y pausados',
    },
    {
      label: 'Servicios activos',
      value: String(dashboard.overview.totals.activeServices),
      hint: 'Visibles para operacion normal',
    },
    {
      label: 'En pausa',
      value: String(dashboard.overview.totals.pausedServices),
      hint: 'Pendientes de reanudacion',
    },
    {
      label: 'Senal reciente',
      value: String(dashboard.overview.totals.activeRecent),
      hint: 'Servicios con senal vigente',
    },
    {
      label: 'Probablemente detenidos',
      value: String(dashboard.overview.totals.probablyStopped),
      hint: 'Necesitan verificacion',
    },
  ]

  const resetDriverForm = () => {
    setDriverForm({
      name: '',
      email: '',
      status: 'active',
      password: '',
      defaultRouteId: '',
      defaultVehicleId: '',
    })
    setEditingDriverId(null)
  }

  const resetVehicleForm = () => {
    setVehicleForm({
      unitNumber: '',
      label: '',
      status: 'available',
      defaultRouteId: '',
    })
    setEditingVehicleId(null)
  }

  const runMutation = (runner: () => Promise<void>) => {
    setErrorMessage(null)
    setFeedbackMessage(null)

    void (async () => {
      setIsSubmitting(true)

      try {
        await runner()
      } catch (error) {
        setErrorMessage(getErrorMessage(error))
      } finally {
        setIsSubmitting(false)
      }
    })()
  }

  const handleEditDriver = (driver: AdminManagedDriver) => {
    setDriverForm({
      name: driver.name,
      email: driver.email,
      status: driver.status,
      password: '',
      defaultRouteId: driver.defaultRouteId ?? '',
      defaultVehicleId: driver.defaultVehicleId ?? '',
    })
    setEditingDriverId(driver.id)
    setFeedbackMessage(null)
    setErrorMessage(null)
  }

  const handleDriverSubmit = () => {
    runMutation(async () => {
      if (editingDriverId) {
        await updateDriver({
          sessionToken,
          driverId: editingDriverId as Id<'users'>,
          name: driverForm.name,
          email: driverForm.email,
          status: driverForm.status,
          password: driverForm.password.trim() || undefined,
          defaultRouteId: driverForm.defaultRouteId
            ? (driverForm.defaultRouteId as Id<'routes'>)
            : undefined,
          defaultVehicleId: driverForm.defaultVehicleId
            ? (driverForm.defaultVehicleId as Id<'vehicles'>)
            : undefined,
        })
        setFeedbackMessage('Conductor actualizado.')
      } else {
        await createDriver({
          sessionToken,
          name: driverForm.name,
          email: driverForm.email,
          password: driverForm.password,
          status: driverForm.status,
          defaultRouteId: driverForm.defaultRouteId
            ? (driverForm.defaultRouteId as Id<'routes'>)
            : undefined,
          defaultVehicleId: driverForm.defaultVehicleId
            ? (driverForm.defaultVehicleId as Id<'vehicles'>)
            : undefined,
        })
        setFeedbackMessage('Conductor creado.')
      }

      resetDriverForm()
    })
  }

  const handleEditVehicle = (vehicle: AdminManagedVehicle) => {
    setVehicleForm({
      unitNumber: vehicle.unitNumber,
      label: vehicle.label,
      status:
        vehicle.status === 'maintenance' ? 'maintenance' : 'available',
      defaultRouteId: vehicle.defaultRouteId ?? '',
    })
    setEditingVehicleId(vehicle.id)
    setFeedbackMessage(null)
    setErrorMessage(null)
  }

  const handleVehicleSubmit = () => {
    runMutation(async () => {
      if (editingVehicleId) {
        await updateVehicle({
          sessionToken,
          vehicleId: editingVehicleId as Id<'vehicles'>,
          unitNumber: vehicleForm.unitNumber,
          label: vehicleForm.label,
          status: vehicleForm.status,
          defaultRouteId: vehicleForm.defaultRouteId
            ? (vehicleForm.defaultRouteId as Id<'routes'>)
            : undefined,
        })
        setFeedbackMessage('Unidad actualizada.')
      } else {
        await createVehicle({
          sessionToken,
          unitNumber: vehicleForm.unitNumber,
          label: vehicleForm.label,
          status: vehicleForm.status,
          defaultRouteId: vehicleForm.defaultRouteId
            ? (vehicleForm.defaultRouteId as Id<'routes'>)
            : undefined,
        })
        setFeedbackMessage('Unidad creada.')
      }

      resetVehicleForm()
    })
  }

  const handleServiceAction = (
    action: 'pause' | 'resume' | 'finish',
    serviceId: string,
  ) => {
    runMutation(async () => {
      if (action === 'pause') {
        await pauseService({
          sessionToken,
          serviceId: serviceId as Id<'activeServices'>,
        })
        setFeedbackMessage('Servicio pausado desde administracion.')
        return
      }

      if (action === 'resume') {
        await resumeService({
          sessionToken,
          serviceId: serviceId as Id<'activeServices'>,
        })
        setFeedbackMessage('Servicio reanudado desde administracion.')
        return
      }

      await finishService({
        sessionToken,
        serviceId: serviceId as Id<'activeServices'>,
      })
      setFeedbackMessage('Servicio finalizado desde administracion.')
    })
  }

  const handleLogout = () => {
    setIsLoggingOut(true)

    void (async () => {
      try {
        await logout({ sessionToken })
      } finally {
        onLogout()
        setIsLoggingOut(false)
      }
    })()
  }

  return (
    <section className="space-y-6">
      <section className="panel overflow-hidden">
        <div className="grid gap-5 px-4 py-5 sm:px-6 sm:py-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-3">
            <p className="eyebrow">Admin</p>
            <h2 className="font-display text-2xl text-slate-900 sm:text-3xl">
              Centro operativo VaBus
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Gestiona conductores, unidades y servicios abiertos sin tocar las
              rutas oficiales importadas desde KML.
            </p>
          </div>

          <aside className="rounded-[1.75rem] bg-[linear-gradient(180deg,rgba(237,249,245,0.98),rgba(248,244,234,0.95))] p-5 sm:rounded-[2rem]">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
              Sesion admin
            </p>
            <p className="mt-4 font-display text-2xl text-slate-900">
              {dashboard.admin.name}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Acceso directo protegido para operacion y gestion del MVP.
            </p>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="mt-5 flex min-h-11 w-full items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              {isLoggingOut ? 'Cerrando sesion...' : 'Cerrar sesion'}
            </button>
          </aside>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <article key={card.label} className="panel px-4 py-4 sm:px-5 sm:py-5">
            <p className="text-sm font-semibold text-slate-500">{card.label}</p>
            <p className="mt-3 font-display text-3xl text-slate-900 sm:text-4xl">
              {card.value}
            </p>
            <p className="mt-2 text-sm text-slate-600">{card.hint}</p>
          </article>
        ))}
      </div>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <article className="panel px-4 py-5 sm:px-6 sm:py-6">
          <div className="space-y-2">
            <p className="eyebrow">Servicios</p>
            <h3 className="font-display text-xl text-slate-900 sm:text-2xl">
              Operacion abierta
            </h3>
          </div>

          {dashboard.overview.services.length > 0 ? (
            <div className="mt-5 space-y-4">
              {dashboard.overview.services.map((service) => (
                <article
                  key={service.id}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <p className="font-display text-xl text-slate-900">
                        {service.unitNumber}
                      </p>
                      <p className="text-sm text-slate-600">
                        {service.routeName} · {service.routeDirection}
                      </p>
                      <p className="text-sm text-slate-600">
                        Operador: {service.driverName}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getServiceStatusBadgeClass(
                          service.status,
                        )}`}
                      >
                        {service.status === 'active' ? 'Activo' : 'Pausado'}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getOperationalBadgeClass(
                          service.operationalStatus,
                        )}`}
                      >
                        {getOperationalStatusLabel(service.operationalStatus)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
                    <p>Inicio: {formatDateTime(service.startedAt)}</p>
                    <p>Ultima senal: {formatDateTime(service.lastSignalAt)}</p>
                    <p>
                      Tiempo desde la senal:{' '}
                      {formatElapsedSignalTime(service.lastSignalAt, currentTimeMs)}
                    </p>
                    <p>
                      Origen:{' '}
                      {service.lastSignalSource === 'device'
                        ? 'Dispositivo'
                        : service.lastSignalSource === 'seed'
                        ? 'Inicial'
                        : 'Sin registro'}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => handleServiceAction('pause', service.id)}
                      disabled={service.status !== 'active' || isSubmitting}
                      className="flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:text-amber-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      Pausar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleServiceAction('resume', service.id)}
                      disabled={service.status !== 'paused' || isSubmitting}
                      className="flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      Reanudar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleServiceAction('finish', service.id)}
                      disabled={isSubmitting}
                      className="flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      Finalizar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-slate-600">
              No hay servicios abiertos por ahora.
            </p>
          )}
        </article>

        <aside className="space-y-4">
          <article className="panel px-4 py-5 sm:px-5 sm:py-6">
            <p className="eyebrow">Rutas oficiales</p>
            <h3 className="mt-3 font-display text-lg text-slate-900 sm:text-xl">
              Catalogo importado
            </h3>
            <div className="mt-5 space-y-3">
              {dashboard.routes.map((route) => (
                <article
                  key={route.id}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-10 rounded-full"
                      style={{ backgroundColor: route.color }}
                    />
                    <p className="font-display text-lg text-slate-900">{route.name}</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{route.direction}</p>
                </article>
              ))}
            </div>
          </article>
        </aside>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="panel px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Conductores</p>
              <h3 className="mt-2 font-display text-xl text-slate-900 sm:text-2xl">
                Gestion de conductores
              </h3>
            </div>
            {editingDriverId ? (
              <button
                type="button"
                onClick={resetDriverForm}
                className="text-sm font-semibold text-slate-500 transition hover:text-slate-800"
              >
                Cancelar edicion
              </button>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4">
            <input
              type="text"
              value={driverForm.name}
              onChange={(event) =>
                setDriverForm((currentValue) => ({
                  ...currentValue,
                  name: event.target.value,
                }))
              }
              placeholder="Nombre del conductor"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            />
            <input
              type="email"
              value={driverForm.email}
              onChange={(event) =>
                setDriverForm((currentValue) => ({
                  ...currentValue,
                  email: event.target.value,
                }))
              }
              placeholder="conductor@vabus.app"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            />
            <select
              value={driverForm.status}
              onChange={(event) =>
                setDriverForm((currentValue) => ({
                  ...currentValue,
                  status: event.target.value as 'active' | 'inactive',
                }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
            <input
              type="password"
              value={driverForm.password}
              onChange={(event) =>
                setDriverForm((currentValue) => ({
                  ...currentValue,
                  password: event.target.value,
                }))
              }
              placeholder={
                editingDriverId
                  ? 'Nueva contrasena opcional'
                  : 'Contrasena inicial'
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            />
            <select
              value={driverForm.defaultRouteId}
              onChange={(event) =>
                setDriverForm((currentValue) => ({
                  ...currentValue,
                  defaultRouteId: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            >
              <option value="">Sin ruta asignada</option>
              {dashboard.routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name} - {route.direction}
                </option>
              ))}
            </select>
            <select
              value={driverForm.defaultVehicleId}
              onChange={(event) =>
                setDriverForm((currentValue) => ({
                  ...currentValue,
                  defaultVehicleId: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            >
              <option value="">Sin unidad asignada</option>
              {dashboard.vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.unitNumber} - {vehicle.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleDriverSubmit}
              disabled={isSubmitting}
              className="flex min-h-11 items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {editingDriverId ? 'Guardar cambios' : 'Crear conductor'}
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {dashboard.drivers.map((driver) => (
              <article
                key={driver.id}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-display text-lg text-slate-900">
                      {driver.name}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">{driver.email}</p>
                    <p className="mt-2 text-sm text-slate-500">
                      Ruta base: {driver.defaultRouteName ?? 'Sin asignar'}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      Unidad base: {driver.defaultVehicleLabel ?? 'Sin asignar'}
                    </p>
                    {driver.currentRouteName ? (
                      <p className="mt-2 text-sm text-slate-500">
                        Servicio: {driver.currentRouteName}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getManagedStatusBadgeClass(
                        driver.status,
                      )}`}
                    >
                      {driver.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleEditDriver(driver)}
                      className="inline-flex rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="panel px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Unidades</p>
              <h3 className="mt-2 font-display text-xl text-slate-900 sm:text-2xl">
                Gestion de unidades
              </h3>
            </div>
            {editingVehicleId ? (
              <button
                type="button"
                onClick={resetVehicleForm}
                className="text-sm font-semibold text-slate-500 transition hover:text-slate-800"
              >
                Cancelar edicion
              </button>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4">
            <input
              type="text"
              value={vehicleForm.unitNumber}
              onChange={(event) =>
                setVehicleForm((currentValue) => ({
                  ...currentValue,
                  unitNumber: event.target.value,
                }))
              }
              placeholder="Unidad 31"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            />
            <input
              type="text"
              value={vehicleForm.label}
              onChange={(event) =>
                setVehicleForm((currentValue) => ({
                  ...currentValue,
                  label: event.target.value,
                }))
              }
              placeholder="Mercedes Sprinter"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            />
            <select
              value={vehicleForm.status}
              onChange={(event) =>
                setVehicleForm((currentValue) => ({
                  ...currentValue,
                  status: event.target.value as 'available' | 'maintenance',
                }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            >
              <option value="available">Disponible</option>
              <option value="maintenance">Mantenimiento</option>
            </select>
            <select
              value={vehicleForm.defaultRouteId}
              onChange={(event) =>
                setVehicleForm((currentValue) => ({
                  ...currentValue,
                  defaultRouteId: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            >
              <option value="">Sin ruta por defecto</option>
              {dashboard.routes.map((route) => (
                <option key={route.id} value={route.id}>
                  {route.name} - {route.direction}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleVehicleSubmit}
              disabled={isSubmitting}
              className="flex min-h-11 items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {editingVehicleId ? 'Guardar cambios' : 'Crear unidad'}
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {dashboard.vehicles.map((vehicle) => (
              <article
                key={vehicle.id}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-display text-lg text-slate-900">
                      {vehicle.unitNumber}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">{vehicle.label}</p>
                    <p className="mt-2 text-sm text-slate-500">
                      Ruta por defecto:{' '}
                      {vehicle.defaultRouteName ?? 'Sin configuracion'}
                    </p>
                    {vehicle.currentRouteName ? (
                      <p className="mt-2 text-sm text-slate-500">
                        Servicio: {vehicle.currentRouteName}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getManagedStatusBadgeClass(
                        vehicle.status,
                      )}`}
                    >
                      {vehicle.status === 'available'
                        ? 'Disponible'
                        : vehicle.status === 'maintenance'
                        ? 'Mantenimiento'
                        : 'En servicio'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleEditVehicle(vehicle)}
                      className="inline-flex rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>

      {feedbackMessage ? (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {feedbackMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </p>
      ) : null}
    </section>
  )
}

export function AdminOverview({
  session,
  onLogout,
}: {
  session: AuthenticatedSession
  onLogout: () => void
}) {
  const currentTimeMs = useCurrentTime(15_000)
  const dashboard = useAdminOperationalOverview(session.token, currentTimeMs)

  if (dashboard === undefined) {
    return (
      <AdminEmptyState
        title="Cargando dashboard administrativo"
        description="Obteniendo servicios abiertos, unidades y conductores desde Convex."
      />
    )
  }

  return (
    <AdminDashboardContent
      dashboard={dashboard}
      currentTimeMs={currentTimeMs}
      onLogout={onLogout}
      sessionToken={session.token}
    />
  )
}
