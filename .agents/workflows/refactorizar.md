# Workflow: Refactorizar

Este workflow guía al agente para realizar la refactorización profunda de vistas o áreas de la aplicación en CaboBus, asegurando la mejor estructura y las mejores prácticas.

## Reglas Obligatorias

1. **Revisión del Project Map**: OBLIGATORIO consultar `project-map.md` antes de empezar para saber exactamente la ubicación de lo que modificarás y cómo debe estructurarse adecuadamente la app. Entender la arquitectura actual es vital antes de cualquier refactor.
2. **Diseño Mobile-First e Intuitivo**: Al refactorizar componentes o vistas, recuerda que la app es 100% pensada en móvil. La UI debe mantenerse estrictamente Mobile-First y sumamente intuitiva. El refactor nunca debe degradar la usabilidad visual o la experiencia del usuario.
3. **Excelencia en TS/TSX y Mejores Prácticas**: Saca siempre el mejor provecho de TypeScript. Aplica tipado estricto, interfaces claras y los mejores patrones de diseño en React+TS. Divide componentes monolíticos, extrae lógica repetitiva en custom hooks y mantén una separación estricta de responsabilidades (UI, Estado, Servicios).
4. **Implementación Limpia y Estructurada**: El código resultante debe ser sumamente limpio, modular y mantenible. No se permiten refactorizaciones a medias; asegúrate de que la nueva estructura sea robusta y facilite futuras integraciones sin añadir complejidad innecesaria.
5. **Verificación Obligatoria de Código (¡CRÍTICO!)**: ANTES de dar por terminada la refactorización, es tu OBLIGACIÓN verificar que el proyecto no quede con errores de sintaxis, imports rotos o fallos de TypeScript. DEBES ejecutar herramientas de validación (como `npm run build`, `npm run lint` o `npx tsc --noEmit`) para asegurarte de no romper la app. Dejar la aplicación rota por dependencias cruzadas o imports perdidos tras un refactor es inaceptable.
6. **Restricciones Técnicas Absolutas**: 
   - NO usar ni interactuar con el DOM usando Chrome o herramientas de automatización de navegador.
   - NO publicar ni hacer despliegues a GitHub, Vercel o Convex.
7. **Formato de Finalización**: Al concluir la refactorización, tu respuesta debe contener obligatoriamente:
   - Qué fue lo que se refactorizó detalladamente y qué ventajas estructurales se consiguieron.
   - Qué recomiendas continuar o mejorar a continuación en base a la nueva estructura.
   - Si la tarea ha concluido completamente, debes recomendar **iniciar un nuevo chat** para mantener el contexto limpio.
