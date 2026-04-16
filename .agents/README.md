## .agents

Carpeta de contexto operativo para trabajar CaboBus con agentes y subagentes.

Orden de lectura recomendado al iniciar cualquier chat:

1. `agents.md`
2. `.agents/project-map.md`
3. `.agents/workflows/00-session-start.md`
4. Archivos del modulo afectado por la tarea

Objetivo de esta carpeta:

- dar contexto estable del producto, arquitectura y estado real del repo;
- evitar que cada chat arranque desde cero;
- estandarizar workflows que usen subagentes de forma util y no cosmetica;
- reducir cambios desalineados con el MVP.

Reglas de uso:

- Antes de editar, leer el `project-map` y el workflow aplicable.
- Si la tarea toca mas de un dominio, repartir lectura o verificacion entre subagentes.
- Si el cambio es pequeno y local, no forzar subagentes solo por usarlos.
- No editar artefactos generados de rutas si pueden regenerarse por script.
- No asumir que `auth`, `admin`, `routes` o `vehicles` estan terminados; validar el estado real primero.

Subagentes recomendados:

- `explorer`: para analizar frontend, Convex, rutas importadas, deuda tecnica o impactos.
- `worker`: para implementar cambios acotados con ownership claro y sin solapar archivos.

Estructura:

- `project-map.md`: mapa actual del proyecto y checklist de arranque.
- `workflows/`: recetas operativas por tipo de tarea.
