---
description: 
---

# Workflow: Analizar y solucionar bug

Este workflow guía al agente para investigar, diagnosticar y resolver errores en CaboBus.

## Reglas Obligatorias

1. **Revisión del Project Map**: OBLIGATORIO consultar `project-map.md` antes de empezar para saber exactamente la ubicación de lo que modificarás y cómo debe estructurarse adecuadamente la app.
2. **Diseño Mobile-First e Intuitivo**: Al solucionar un bug visual o de UX, recuerda que la app es 100% pensada en móvil. La UI debe ser estrictamente Mobile-First y sumamente intuitiva (diseñada para jóvenes y adultos mayores). No rompas la usabilidad al arreglar el bug.
3. **Excelencia en TS/TSX**: Aprovecha al máximo TypeScript para resolver bugs (corrige tipados, usa exhaustiveness checks, elimina el uso de `any`).
4. **Implementación Limpia y Eficiente**: La solución al bug debe ser "limpia" y eficiente. Revisa bien el impacto de la corrección en el resto de la aplicación antes de proponerla y modificar el código.
5. **Verificación Obligatoria de Código (¡CRÍTICO!)**: ANTES de dar por terminada la corrección, es tu OBLIGACIÓN verificar que el proyecto no quede con errores de sintaxis, imports rotos o fallos de TypeScript. DEBES ejecutar herramientas de validación (como `npm run build`, `npm run lint` o `npx tsc --noEmit`) para asegurarte de no romper la app. Dejar un bug de sintaxis o la aplicación inutilizable por no verificar tus cambios es inaceptable.
6. **Restricciones Técnicas Absolutas**: 
   - NO usar ni interactuar con el DOM usando Chrome o herramientas de automatización de navegador.
   - NO publicar ni hacer despliegues a GitHub, Vercel o Convex.
7. **Formato de Finalización**: Al encontrar y solucionar el bug, tu respuesta final debe incluir:
   - Qué fue lo que se hizo (explicación de la causa del bug y la solución aplicada).
   - Qué recomiendas continuar o mejorar para prevenir fallos similares.
   - Si ya se terminó con esta tarea de corrección, debes recomendar **iniciar un nuevo chat** para evitar la sobrecarga del contexto.