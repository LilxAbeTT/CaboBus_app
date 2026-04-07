# Workflow - Session Start

Usar este workflow al inicio de cada chat antes de proponer o tocar codigo.

## Objetivo

Entrar al repo con contexto real del proyecto y decidir si la tarea necesita subagentes.

## Lectura minima obligatoria

1. `agents.md`
2. `.agents/project-map.md`
3. `package.json`
4. Archivos del modulo afectado

## Preguntas que debes responder antes de actuar

1. Que quiere cambiar exactamente el usuario.
2. Que dominios toca la tarea.
3. Que parte ya existe y que parte sigue placeholder.
4. Que validacion minima requiere.
5. Si conviene paralelizar con subagentes.

## Regla de subagentes

Usa subagentes si ocurre al menos una de estas condiciones:

- la tarea toca frontend y Convex;
- la tarea toca codigo y pipeline de rutas;
- la tarea requiere analisis amplio antes de editar;
- la tarea permite dividir ownership de archivos sin solape.

## Reparto recomendado

Para tareas medianas o grandes:

- `explorer` 1: frontend / UX / componentes / hooks
- `explorer` 2: Convex / schema / queries / mutations
- `explorer` 3 opcional: docs / rutas reales / seeds / validacion

El agente principal debe:

- sintetizar el objetivo tecnico;
- elegir workflow;
- decidir el plan de implementacion;
- integrar resultados.

## Salida interna esperada

Antes de editar, deja claro para ti:

- objetivo tecnico;
- archivos probables;
- riesgos;
- validaciones;
- si habra subagentes y con que ownership.
