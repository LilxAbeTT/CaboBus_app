# Workflow: Implementar o mejorar

Este workflow guía al agente para realizar la implementación de nuevas características o mejoras en CaboBus.

## Reglas Obligatorias

1. **Revisión del Project Map**: OBLIGATORIO consultar `project-map.md` antes de empezar para saber exactamente la ubicación de lo que modificarás y cómo debe estructurarse adecuadamente la app.
2. **Diseño Mobile-First e Intuitivo**: La aplicación es 100% pensada en móvil (una app para ver rutas de camiones). El diseño y estructura deben ser Mobile-First y sumamente intuitivos, pensados para cualquier usuario (desde jóvenes hasta adultos mayores que no sepan mucho de interfaces). La intuitividad es prioridad absoluta (100%).
3. **Excelencia en TS/TSX**: Saca siempre el mejor provecho de TypeScript (ts y tsx). Aplica tipado estricto, interfaces claras y las mejores prácticas del ecosistema React+TS.
4. **Implementación Limpia y Eficiente**: Propón código limpio, mantenible y eficiente en todo momento. Analiza y revisa cuidadosamente lo que propones antes de codificar (ya sea que modifiques directamente o que el usuario te pida planear primero).
5. **Verificación Obligatoria de Código (¡CRÍTICO!)**: ANTES de dar por terminada la implementación, es tu OBLIGACIÓN verificar que el proyecto no quede con errores de sintaxis, imports rotos o fallos de TypeScript. DEBES ejecutar herramientas de validación (como `npm run build`, `npm run lint` o `npx tsc --noEmit`) para asegurarte de no romper la app. Dejar la aplicación rota o inutilizable por no verificar tus cambios es inaceptable.
6. **Restricciones Técnicas Absolutas**: 
   - NO usar ni interactuar con el DOM usando Chrome o herramientas de automatización de navegador.
   - NO publicar ni hacer despliegues a GitHub, Vercel o Convex.
7. **Formato de Finalización**: Al finalizar la implementación o mejora, tu respuesta debe contener obligatoriamente:
   - Qué fue lo que se hizo (resumen claro).
   - Qué recomiendas continuar o mejorar a continuación.
   - Si la tarea ha concluido completamente, debes recomendar **iniciar un nuevo chat** para mantener el contexto limpio.
