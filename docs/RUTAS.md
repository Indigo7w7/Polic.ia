# Mapa de Rutas — POLIC.ia

## Rutas Frontend

| Ruta | Componente | Acceso | Descripción |
|---|---|---|---|
| `/login` | `Login.tsx` | 🌐 Público | Inicio de sesión (Google, Email, Ghost) |
| `/cebo` | `LeadMagnet.tsx` | 🌐 Público | Landing page / lead magnet |
| `/` | `Dashboard.tsx` | 🔒 Auth | Panel principal con métricas, exámenes y navegación |
| `/seleccionar-escuela` | `SchoolSelector.tsx` | 🔒 Auth | Selección de escuela (EO / EESTP) |
| `/simulador` | `Simulador.tsx` | 🔒 Auth | Simulacro de examen con temporizador |
| `/resultados` | `Resultados.tsx` | 🔒 Auth | Resultados post-examen con pipeline de errores |
| `/galeria` | `LearningGallery.tsx` | 🔒 Auth | Galería de contenido educativo por materia |
| `/yape-checkout` | `YapeCheckout.tsx` | 🔒 Auth | Pasarela de pago Yape |
| `/poligono` | `Flashcards.tsx` | 🔒 Auth (PRO) | Polígono Cognitivo Leitner (flashcards) |
| `/progreso` | `ProgressAudit.tsx` | 🔒 Auth (PRO) | Auditoría de progreso detallada |
| `/perfil` | `Profile.tsx` | 🔒 Auth (PRO) | Perfil de usuario |
| `/ranking` | `Ranking.tsx` | 🔒 Auth | Ranking nacional (parcial FREE, completo PRO) |
| `/admin` | `AdminPanel.tsx` | 🔐 Admin | Panel de administración completo |

---

## Rutas Backend API (tRPC)

Todas las rutas API se acceden via `http://localhost:3001/trpc/[ruta]`.

### `auth.*` — Autenticación
| Endpoint | Tipo | Acceso | Descripción |
|---|---|---|---|
| `auth.login` | mutation | 🌐 Público | Registrar/sincronizar usuario desde Firebase |
| `auth.logout` | mutation | 🔒 Protected | Logout (placeholder) |

### `user.*` — Usuarios
| Endpoint | Tipo | Acceso | Descripción |
|---|---|---|---|
| `user.getProfile` | query | 🔒 Protected | Obtener perfil completo del usuario |
| `user.selectSchool` | mutation | 🔒 Protected | Seleccionar escuela (EO/EESTP) |
| `user.getStats` | query | 🔒 Protected | Estadísticas de exámenes del usuario |
| `user.getRanking` | query | 🔒 Protected | Top 10 ranking nacional |
| `user.updateProfile` | mutation | 🔒 Protected | Actualizar nombre/foto |

### `exam.*` — Exámenes
| Endpoint | Tipo | Acceso | Descripción |
|---|---|---|---|
| `exam.getQuestionsByFilter` | query | 🔒 Protected | Preguntas dinámicas filtradas (escola, área, dificultad) |
| `exam.submitAttempt` | mutation | 🔒 Protected | Enviar intento (transaccional: attempt + answers + Leitner) |
| `exam.getHistory` | query | 🔒 Protected | Historial de intentos |

### `learning.*` — Contenido Educativo
| Endpoint | Tipo | Acceso | Descripción |
|---|---|---|---|
| `learning.getAreas` | query | 🌐 Público | Listar áreas de aprendizaje |
| `learning.getContentByArea` | query | 🌐 Público | Contenido filtrado por área y escuela |

### `leitner.*` — Repetición Espaciada
| Endpoint | Tipo | Acceso | Descripción |
|---|---|---|---|
| `leitner.getPending` | query | 🔒 Protected | Tarjetas pendientes de repaso |
| `leitner.updateCard` | mutation | 🔒 Protected | Actualizar tarjeta (éxito/fallo) |
| `leitner.getStats` | query | 🔒 Protected | Estadísticas de repasos pendientes |
| `leitner.getStatsByArea` | query | 🔒 Protected | Estadísticas por área temática |
| `leitner.getCountByLevel` | query | 🔒 Protected | Conteo por nivel Leitner |

### `membership.*` — Membresía
| Endpoint | Tipo | Acceso | Descripción |
|---|---|---|---|
| `membership.submitVoucher` | mutation | 🔒 Protected | Enviar voucher de pago |

### `admin.*` — Administración
| Endpoint | Tipo | Acceso | Descripción |
|---|---|---|---|
| `admin.getVouchers` | query | 🔐 Admin | Listar todos los vouchers |
| `admin.updateVoucherStatus` | mutation | 🔐 Admin | Aprobar/rechazar voucher |
| `admin.getAdminStats` | query | 🔐 Admin | Dashboard stats (usuarios, revenue, etc.) |
| `admin.getUsers` | query | 🔐 Admin | Listar usuarios (con búsqueda y filtro) |
| `admin.updateUserMembership` | mutation | 🔐 Admin | Cambiar membresía de usuario |
| `admin.updateUserSchool` | mutation | 🔐 Admin | Cambiar escuela de usuario |
| `admin.getAreas` | query | 🔐 Admin | Listar áreas |
| `admin.createArea` | mutation | 🔐 Admin | Crear área de aprendizaje |
| `admin.getContent` | query | 🔐 Admin | Listar contenido |
| `admin.createContent` | mutation | 🔐 Admin | Crear contenido educativo |
| `admin.updateContent` | mutation | 🔐 Admin | Actualizar contenido |
| `admin.deleteContent` | mutation | 🔐 Admin | Eliminar contenido |
| `admin.getQuestions` | query | 🔐 Admin | Listar preguntas (filtradas) |
| `admin.createQuestion` | mutation | 🔐 Admin | Crear pregunta de examen |
| `admin.updateQuestion` | mutation | 🔐 Admin | Actualizar pregunta |
| `admin.deleteQuestion` | mutation | 🔐 Admin | Eliminar pregunta |
| `admin.bulkIngestQuestions` | mutation | 🔐 Admin | Ingesta masiva JSON |
| `admin.getLogs` | query | 🔐 Admin | Ver registro de acciones admin |

---

## Leyenda de Acceso

| Símbolo | Significado |
|---|---|
| 🌐 | Público (sin autenticación) |
| 🔒 | Requiere usuario autenticado |
| 🔐 | Requiere rol de administrador |
