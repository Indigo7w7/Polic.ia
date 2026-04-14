# Plan: Expansión FSRS + Galería Profunda + Módulos Avanzados

## Contexto

El sistema tiene MySQL (no SQLite). Los conceptos de la spec SQLite se adaptan a MySQL manteniendo la lógica exacta. El backbone FSRS ya está implementado; este plan añade la **capa de contenido inteligente** y los **módulos de interacción avanzada**.

---

## Módulos a Implementar

### Módulo A — Galería ↔ FSRS: Vinculación Dinámica de Contenido

**El vínculo crítico:** Cuando el admin añade nuevo contenido (`uploadTacticalSyllabus`), cada pregunta del campo `questions` de la unidad puede generar automáticamente una tarjeta FSRS para todos los estudiantes matriculados.

#### [MODIFY] `routers/admin_courses.ts`
- En `uploadTacticalSyllabus` y `addMaterialToCourse`: Añadir un campo `autoFlashcards: boolean` opcional. Si `true`, encolar las preguntas de la unidad para que todos los estudiantes activos reciban automáticamente las flashcards en estado `new`.
- Nuevo endpoint `enrollFlashcardsFromUnit(unitId)` — Admin puede reenviar las flashcards de una unidad ya existente a los usuarios nuevos.

#### [NEW] Tabla `content_fsrs_map` (en schema.ts)
Tabla puente que registra qué unidades de galería tienen flashcards activas:
```sql
content_fsrs_map(
  id, 
  content_id FK→learning_content.id,
  question_id FK→exam_questions.id (si la pregunta viene del simulacro),
  deck_tag VARCHAR   -- ej: 'galeria:comunicacion:gramatica'
)
```
Esto permite que al añadir nueva content, el sistema sepa qué flashcards ya existen y cuáles crear.

#### [MODIFY] `routers/learning_progress.ts`
- Cuando el usuario completa una unidad (`markComplete`), crear automáticamente las flashcards FSRS de las preguntas de esa unidad (sin pedir confirmación) en estado `new`.

---

### Módulo B — Type-in-the-Answer con Levenshtein

Nuevo modo de tarjeta donde el usuario escribe la respuesta en lugar de seleccionar opciones.

#### [NEW] `src/shared/utils/levenshtein.ts`
Implementación pura TypeScript del algoritmo de Levenshtein (distancia de edición). Calcula similitud porcentual entre la respuesta escrita y la correcta. Umbral: ≥ 80% = correcto.

#### [MODIFY] `views/Flashcards.tsx`
- Añadir un toggle `Modo Escritura` en el header.
- Si activo: mostrar `<input type="text">` en lugar de los 4 botones.
- Al presionar Enter: comparar con la respuesta correcta usando Levenshtein, colorear en verde/rojo, autocalificar (correcto > 80% → ease 3, incorrecto → ease 1).

---

### Módulo C — Motor de Búsqueda FULLTEXT (equivalente a FTS5)

#### [MODIFY] `migrate_prod.cjs`
Añadir índice FULLTEXT a MySQL en `exam_questions.question` y `learning_content.body`:
```sql
ALTER TABLE exam_questions ADD FULLTEXT KEY ft_question (question);
ALTER TABLE learning_content ADD FULLTEXT KEY ft_body (title, body);
```

#### [NEW] Endpoint `leitner.searchCards({ query })`
Buscar tarjetas del usuario usando `MATCH(question) AGAINST (? IN BOOLEAN MODE)`.

#### [MODIFY] `views/Flashcards.tsx` 
Añadir barra de búsqueda en el panel de estadísticas para buscar tarjetas por término.

---

### Módulo D — Interleaving Engine

#### [MODIFY] `routers/leitner.ts` → `getPending`
Añadir parámetro `interleave: boolean`. Si `true`, mezclar tarjetas de diferentes áreas usando `ORDER BY RAND()` dentro del grupo de `relearning+learning` (prioridad) y luego `review+new`.

---

### Módulo E — Exportación .pkg (ZIP backup)

Dado que el backend corre en Node.js, usar el paquete `archiver` (ya disponible en el ecosistema Node) para generar un archivo ZIP descargable con:
- `collection.json` — todos los datos FSRS del usuario
- `review_log.json` — historial completo de revisiones
- `manifest.json` — metadatos de la colección

#### [NEW] Endpoint REST dedicado (no tRPC, para streaming)
`GET /api/export/deck?userId=X&token=Y` — Genera y devuelve el .pkg como binary stream.

#### [MODIFY] `views/Flashcards.tsx`
Botón "Exportar .pkg" en el panel de telemetría.

---

### Módulo F — TTS via Web Speech API

Implementación 100% en el cliente, sin dependencias de servidor.

#### [NEW] `src/shared/utils/tts.ts`
Wrapper para `window.speechSynthesis` con:
- `speak(text, lang = 'es-PE')` — Lee el texto actual de la tarjeta
- `stop()` — Detiene la lectura
- `isTTSAvailable()` — Detecta soporte del navegador

#### [MODIFY] `views/Flashcards.tsx`
Botón 🔊 en el header de la tarjeta. Al hacer clic lee el frente o el dorso visible.

---

### Módulo G — Auto-sync de Nuevo Contenido de Galería

Cuando el admin hace `uploadTacticalSyllabus` y una unidad tiene preguntas (`questions[]`), el sistema:
1. Registra en `content_fsrs_map` el vínculo `content_id → question_ids[]`
2. Opcionalmente propaga flashcards `new` a todos los usuarios PRO suscritos

Esto requiere el nuevo campo `deck_tag` en `leitner_cards` (VARCHAR) que etiqueta la tarjeta con su origen: `'galeria:comunicacion'`, `'simulacro:eo:nivel3'`, etc.

---

## Archivos a Modificar/Crear

| Archivo | Tipo | Módulo |
|---|---|---|
| `src/shared/utils/levenshtein.ts` | **NEW** | B |
| `src/shared/utils/tts.ts` | **NEW** | F |
| `src/database/db/schema.ts` | MODIFY | A, G |
| `migrate_prod.cjs` | MODIFY | C, A |
| `src/backend/server/routers/admin_courses.ts` | MODIFY | A, G |
| `src/backend/server/routers/leitner.ts` | MODIFY | D, E, C |
| `src/backend/server/index.ts` | MODIFY | E |
| `src/frontend/views/Flashcards.tsx` | MODIFY | B, C, D, E, F |
| `src/backend/server/routers/learning_progress.ts` | MODIFY | A |

## Prioridad de Implementación

| Prioridad | Módulo | Valor | Esfuerzo |
|---|---|---|---|
| 🔴 1 | **A** — Galería Auto-FSRS | Muy Alto | Medio |
| 🔴 1 | **B** — Type-in-the-Answer | Alto | Bajo |
| 🔴 1 | **F** — TTS | Alto | Muy Bajo |
| 🟠 2 | **D** — Interleaving | Medio | Muy Bajo |
| 🟠 2 | **C** — FULLTEXT Search | Medio | Bajo |
| 🟡 3 | **E** — Export .pkg | Medio | Medio |
| 🟡 3 | **G** — Auto-sync masivo | Bajo | Alto |

> [!IMPORTANT]
> La tabla `content_fsrs_map` requiere una migración de BD. Se añadirá a `migrate_prod.cjs`.

> [!NOTE]
> Image Occlusion (mapas de calor SVG sobre imágenes) queda fuera de este sprint por requerir un editor de máscaras vectoriales separado — es una feature completa por sí sola.

> [!NOTE]
> Delta Sync LWW y Tombstones quedan para Fase 3 — requieren un sistema de sincronización multi-cliente que aún no existe.

## Verificación
1. Admin sube syllabus con preguntas → flashcards aparecen en Polígono de los estudiantes
2. Modo escritura en Flashcards → input + Levenshtein → feedback visual verde/rojo
3. Botón 🔊 lee la tarjeta en voz alta
4. Query de búsqueda devuelve resultados en < 50ms
5. Botón "Exportar .pkg" descarga un ZIP con los datos completos
