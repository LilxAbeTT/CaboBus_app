# AGENTS.md — VaBus_app

## 1) Contexto del proyecto

VaBus es una plataforma de movilidad urbana en tiempo real para San José del Cabo, BCS, México.

Su objetivo es permitir que:
- los conductores activen una ruta desde su dispositivo móvil y compartan su ubicación en tiempo real;
- los pasajeros visualicen en un mapa las unidades activas, su ruta y su proximidad;
- un administrador gestione rutas, unidades y operación básica.

La idea central del producto es NO modificar el sistema actual de transporte ni rediseñar rutas, sino agregar una capa digital de visibilidad en tiempo real sobre rutas ya existentes.

## 2) Objetivo del MVP

Construir una primera versión funcional que permita:

### Pasajero
- ver un mapa con rutas cargadas;
- ver unidades activas en tiempo real;
- identificar qué ruta está activa;
- consultar información básica de una unidad;
- ver la última actualización recibida.

### Conductor
- iniciar sesión;
- seleccionar una ruta;
- activar servicio;
- compartir ubicación en tiempo real;
- pausar o finalizar servicio.

### Administrador
- iniciar sesión;
- gestionar rutas;
- gestionar unidades;
- gestionar conductores;
- visualizar unidades activas;
- consultar eventos básicos del sistema.

## 3) Restricciones importantes

- El proyecto debe priorizar herramientas gratuitas o con plan gratuito suficiente.
- Evitar infraestructura compleja, costosa o difícil de mantener.
- Evitar sobreingeniería.
- El sistema debe ser sencillo de desarrollar, probar y desplegar.
- La solución debe estar pensada para iniciar como MVP independiente.
- El código debe ser claro, modular y mantenible.
- Todo el proyecto debe escribirse en TypeScript.
- Los cambios deben ser incrementales y seguros.
- Antes de implementar una funcionalidad grande, primero definir estructura, tipos, flujo y responsabilidades.

## 4) Decisión de arquitectura inicial

La arquitectura elegida para el MVP es:

- frontend web tipo PWA para pasajeros;
- panel web para administración;
- módulo web móvil para conductor en la primera fase;
- backend gestionado sin PostgreSQL autoadministrado;
- mapas con herramientas gratuitas;
- tiempo real como requisito central del sistema.

## 5) Stack preferido

### Frontend
- React
- Vite
- TypeScript
- Tailwind CSS
- React Router
- Leaflet para mapas

### Backend / datos / tiempo real
Prioridad de evaluación:
1. Convex
2. Appwrite Cloud
3. PocketBase

Inicialmente se prefiere Convex si resulta conveniente para el flujo del MVP.

### Mapas
- Leaflet
- OpenStreetMap
- rutas cargadas a partir de archivos externos compatibles (por ejemplo KML/GeoJSON convertidos al formato requerido por la app)

## 6) Principios de desarrollo

- Primero funcionalidad, después optimización.
- Primero MVP, después escalado.
- Evitar microservicios.
- Evitar dependencias innecesarias.
- No crear código muerto.
- No inventar estructuras complejas si una opción simple resuelve el problema.
- Mantener separación clara entre dominio, UI, estado y servicios.
- No mezclar lógica de negocio compleja dentro de componentes de UI.
- Usar nombres claros y consistentes.
- Crear tipos compartidos cuando sea útil.
- Añadir comentarios solo cuando aporten valor real.
- En flujos funcionales del MVP no depender de IDs fijos ni de conductor/unidad demo hardcodeados.
- Si autenticación completa no es necesaria todavía, preferir una sesión mínima local por rol antes de agregar login completo.
- Los datos semilla pueden existir para pruebas, pero la lógica principal debe operar sobre selección real de sesión y entidades de la base.
- Las rutas reales importadas desde archivos deben tratarse como fuente operativa del mapa, no como datos mock.
- Conservar en la normalización de rutas, cuando exista en origen, el nombre, tipo de transporte, color, geometría y archivo fuente.
- Mantener un `importKey` estable por ruta importada para semillas idempotentes y migraciones simples.
- Los artefactos derivados de rutas importadas deben generarse por script; no editarlos manualmente si pueden regenerarse.
- Cuando el mapa del pasajero muestre muchas rutas reales, ofrecer enfoque por ruta con selección clara, vista general recuperable y filtrado visual simple antes de agregar más complejidad.
- En selección de ruta del mapa, mostrar solo las unidades activas asociadas a la ruta elegida y ajustar el encuadre del mapa a esa geometría cuando mejore la legibilidad.
- El tracking real del conductor debe apoyarse primero en la API de geolocalización del navegador con mensajes claros de permiso, inicio y detención.
- Separar siempre el flujo de solicitar permiso del flujo de iniciar tracking real; pedir permiso no debe arrancar seguimiento continuo por si solo.
- El arranque del tracking real debe usar primero una adquisicion inicial tolerante y con reintento controlado antes de iniciar `watchPosition`.
- La UI del conductor debe distinguir con claridad permiso no solicitado, permiso concedido, esperando primera senal, primera senal recibida, sin senal inicial, tracking activo y tracking detenido.
- Antes de publicar una lectura real al backend, validar que no sea claramente implausible para operacion del MVP; si la precision del navegador es demasiado baja o la lectura cae exageradamente lejos de la ruta activa, bloquear su publicacion, avisar al conductor y conservar el fallback manual.
- Si la primera lectura del arranque real resulta implausible para la ruta, no dejar el tracking en espera indefinida: cerrar ese intento con mensaje claro de reintento y mantener disponible el modo manual.
- El fallback manual no debe sugerir como punto base una ultima posicion claramente fuera de la ruta activa; en ese caso debe volver a una referencia de la ruta.
- Definir para el MVP una frescura simple de senal por tiempo transcurrido desde la ultima ubicacion, al menos con estados reciente, desactualizada y probablemente detenida.
- La transicion a probable detencion debe ser tolerante para pruebas reales; una unidad no debe desaparecer del mapa principal tras pausas breves de pocos minutos.
- El tracking real debe aplicar control simple de frecuencia y cambio minimo de posicion para evitar `locationUpdates` excesivos cuando la lectura llega demasiado pronto o no cambia de forma relevante.
- PassengerMap no debe mostrar como plenamente vigentes unidades cuya ultima senal ya esta congelada; debe distinguirlas visualmente o retirarlas de la vista principal.
- Cuando PassengerMap este enfocado en una ruta concreta, conviene mantener visibles las unidades probablemente detenidas con una presentacion claramente degradada antes que ocultarlas por completo.
- La nocion operativa del servicio debe derivarse en backend y exponerse desde Convex como una verdad compartida para PassengerMap, DriverPanel y futuras vistas admin.
- En frontend, la clasificacion operativa de un servicio no debe recalcularse de forma principal a partir de timestamps crudos si Convex ya expone un estado derivado equivalente.
- Las vistas admin de monitoreo deben consumir ese mismo estado operativo compartido y usarlo para resumir servicios por ruta, unidad y condicion operativa antes de introducir reglas automaticas.
- El modo manual de ubicación debe mantenerse como fallback operativo mientras no exista tracking avanzado o si el navegador falla, niega permisos o no soporta geolocalización.
- En flujos de tracking del MVP, preferir una sola ruta de escritura de ubicaciones al backend para evitar lógica duplicada entre modo real y modo manual.

## 7) Estructura deseada del proyecto

La estructura objetivo inicial puede ser:

/VaBus_app
  /src
    /app
    /components
    /features
      /auth
      /map
      /routes
      /vehicles
      /driver
      /admin
    /lib
    /services
    /types
    /hooks
    /pages
    /styles
  /public
  /data
    /raw
    /processed
  /scripts
    /routes
  AGENTS.md
  package.json
  tsconfig.json
  vite.config.ts

Si Convex es la opción elegida:
- agregar la carpeta correspondiente para esquemas, funciones y configuración.
- mantener clara la separación entre frontend y lógica de backend.
- mantener separada la lectura de archivos, transformación, normalización, persistencia y renderizado de rutas importadas.

## 8) Módulos del dominio

### Auth
Responsable de:
- login;
- sesiones;
- roles;
- permisos básicos.

Roles mínimos:
- pasajero
- conductor
- administrador

### Rutas
Responsable de:
- catálogo de rutas;
- geometría de ruta;
- nombre, sentido y estado;
- relación con unidades activas;
- importación reproducible desde archivos externos reales como KML o GeoJSON.

### Unidades
Responsable de:
- identificación de unidad;
- ruta activa;
- estado;
- última ubicación;
- último timestamp.

### Tracking en tiempo real
Responsable de:
- recibir actualizaciones de ubicación;
- asociarlas a una unidad activa;
- reflejarlas al mapa del pasajero;
- mostrar última actualización;
- detectar estado activo/inactivo según reglas simples;
- soportar geolocalización real desde navegador en primer plano y fallback manual cuando sea necesario.

### Mapa
Responsable de:
- renderizar mapa base;
- mostrar rutas;
- mostrar marcadores de unidades activas;
- mostrar detalles mínimos de cada unidad;
- permitir enfoque visual por ruta real cuando la vista general sea demasiado cargada.

### Admin
Responsable de:
- CRUD básico de rutas;
- CRUD básico de unidades;
- asignaciones;
- monitoreo básico.

## 9) Alcance del MVP

INCLUIR:
- login básico por rol;
- vista de mapa para pasajero;
- activación de ruta por conductor;
- actualización de ubicación en tiempo real;
- panel admin básico;
- datos semilla de rutas;
- diseño simple pero limpio y usable.

NO INCLUIR todavía:
- pagos;
- predicción avanzada de llegada;
- analítica compleja;
- notificaciones push avanzadas;
- modo offline complejo;
- chat;
- multi-ciudad;
- integraciones gubernamentales;
- optimización avanzada de geolocalización.

## 10) Criterios de calidad

Cada entrega debe cumplir con:
- compilación limpia;
- sin errores de TypeScript;
- componentes reutilizables cuando tenga sentido;
- rutas claras;
- estructura ordenada;
- UX simple;
- código listo para crecer sin rehacer todo.

## 11) Flujo de trabajo esperado con Codex

Al trabajar en este repositorio:
1. primero entender la estructura actual;
2. proponer cambios pequeños y coherentes;
3. implementar por fases;
4. no romper lo ya funcional;
5. después de cada bloque importante, explicar qué se hizo;
6. si una decisión técnica afecta el resto del sistema, dejarla explícita;
7. si faltan archivos base, crearlos correctamente;
8. si una librería no es indispensable, no instalarla.

## 12) Forma de trabajar

Cuando recibas una tarea:
- analiza primero el estado actual del proyecto;
- resume el objetivo técnico en términos concretos;
- implementa con el menor número de cambios razonables;
- valida imports, tipos y estructura;
- si agregas archivos nuevos, hazlo con organización;
- si algo no está definido, elige la alternativa más simple y coherente con este AGENTS.md.
- evita reintroducir dependencias a cuentas, unidades o IDs de prueba fijos en flujos funcionales.
- si trabajas con rutas reales importadas, deja un flujo reproducible para regenerarlas y sembrarlas en la base.
- si mejoras la visualización del mapa, prioriza legibilidad móvil, selección clara y ausencia de interferencia visual antes que controles avanzados.
- si implementas tracking real en navegador, asume limitaciones normales del sistema operativo y del browser: permisos denegados, lecturas inestables o suspensión en segundo plano deben manejarse sin romper el fallback manual.
- si implementas o ajustas el arranque de geolocalizacion, evita prompts repetidos, evita bucles agresivos y deja un reintento manual claro cuando no llegue la primera senal.
- si trabajas la confiabilidad operativa del tracking, expone siempre la ultima senal, el tiempo desde esa senal y una lectura simple de frescura antes de agregar logica mas compleja.
- si una vista necesita interpretar el estado operativo del servicio, consumir primero el estado derivado desde Convex y dejar en frontend solo etiquetas, tiempos transcurridos y decisiones visuales.

## 13) Prioridad actual

La prioridad actual NO es desplegar.
La prioridad actual es construir una base sólida del MVP.

Orden de trabajo sugerido:
1. inicializar proyecto frontend;
2. definir estructura base;
3. definir sistema de rutas y páginas;
4. integrar mapa base;
5. decidir e integrar backend gestionado;
6. construir autenticación;
7. construir módulo conductor;
8. construir visualización en tiempo real;
9. construir panel admin básico;
10. refinar UX.

## 14) Entregables esperados en las primeras iteraciones

Primeras iteraciones esperadas:
- proyecto React + Vite + TypeScript listo;
- Tailwind integrado;
- React Router integrado;
- layout base;
- páginas base por rol;
- mapa base con Leaflet;
- modelos de datos iniciales;
- decisión técnica documentada sobre backend.

## 15) Regla importante para decisiones técnicas

Si hay varias alternativas posibles:
- priorizar simplicidad;
- priorizar costo bajo;
- priorizar velocidad de desarrollo;
- priorizar mantenimiento fácil;
- priorizar tiempo real funcional;
- evitar arquitecturas empresariales innecesarias para el MVP.
- para pruebas operativas del MVP, preferir sesión local mínima persistida antes que autenticación completa cuando eso sea suficiente.

## 16) Estilo de respuesta esperado de Codex

Responder siempre de forma:
- técnica;
- concreta;
- organizada;
- orientada a ejecución;
- sin relleno.

Cuando termines una tarea:
- resume cambios;
- indica archivos creados o modificados;
- explica siguiente paso recomendado.
