# Diagnóstico y Plan de Solución: Proyecto Polic.ia

Tras analizar a fondo el código fuente en `src/frontend`, `src/backend` y `src/database`, he identificado las causas de los fallos de actualización de perfil, la falta de una UI de administrador dedicada y los puntos necesarios para restringir el cambio de escuela y simplificar el inicio de sesión.

---

## 1. Diagnóstico de Fallos de Actualización de Perfil

El error principal reside en una **desincronización entre el estado local (Zustand), Firebase Auth y la base de datos MySQL**.

### Causas Identificadas:
- **Sobrescritura Inmediata:** En `App.tsx`, existe un `useEffect` que observa `profileQuery.data` (la respuesta de MySQL). Cuando actualizas el perfil en la vista `Profile.tsx`, los datos se guardan en la base de datos, pero el componente `App.tsx` vuelve a disparar la consulta y sobrescribe el estado de Zustand con los datos antiguos antes de que la caché de tRPC se invalide correctamente.
- **Inconsistencia de Nombres de Campos:** El backend usa `photo_url` (snake_case) en la base de datos, mientras que el frontend y el store de Zustand esperan `photoURL` (camelCase). Esto provoca que, tras una actualización, la imagen de perfil desaparezca o no se cargue.
- **Doble Fuente de Verdad:** Se intenta actualizar `displayName` en Firebase Auth y `name` en MySQL simultáneamente. Si una falla, el estado queda inconsistente.

### Solución Paso a Paso:
1. **Unificar el Modelo de Datos:** Asegurar que el router de tRPC devuelva siempre `photoURL` mapeado desde `photo_url`.
2. **Invalidación de Caché:** En `Profile.tsx`, después de `mutateAsync`, se debe llamar a `utils.user.getProfile.invalidate()` para forzar a `App.tsx` a obtener los datos frescos.
3. **Priorizar MySQL:** Dejar de usar `updateProfile` de Firebase Auth para el nombre y avatar, y confiar exclusivamente en la base de datos MySQL como fuente de verdad.

---

## 2. Implementación de UI para Administrador

El proyecto ya cuenta con un `AdminPanel.tsx` y un `membership_admin.ts` en el backend, pero el acceso no es intuitivo y faltan herramientas de gestión directa.

### Lo que se necesita para una administración completa:
- **Ruta Exclusiva:** Crear una ruta `/admin-portal` que sea la única vía de entrada para el administrador.
- **Gestión de Membresías:** El backend ya permite `updateUserMembership`, pero la UI debe mostrar claramente la fecha de expiración y permitir extenderla manualmente.
- **Auditoría de Pagos:** Implementar la visualización de los vouchers de Yape (que ya están en la tabla `yape_audits`) para aprobarlos con un solo clic, lo cual activará automáticamente el estado `PRO` del usuario.

### Pasos para implementar:
1. **Modificar `App.tsx`:** Asegurar que las rutas de `/admin` usen el componente `RequireAdmin`.
2. **Dashboard Admin:** Crear una vista de "Comando Central" que resuma:
   - Usuarios totales vs. Premium.
   - Vouchers pendientes de revisión.
   - Botones rápidos para "Hacer Premium" o "Quitar Premium".

---

## 3. Restricción Permanente de Escuela

Actualmente, el backend ya tiene la lógica para evitar cambios (`user.ts` línea 48), pero el frontend permite volver a la pantalla de selección si el usuario conoce la URL.

### Solución Paso a Paso:
1. **Bloqueo en Frontend:** En `SchoolSelector.tsx`, añadir un chequeo inicial: si `user.school` ya tiene valor, redirigir inmediatamente al Dashboard con un mensaje de "Acción no permitida".
2. **Eliminar Acceso desde Perfil:** Asegurarse de que en la vista de Perfil no exista ninguna opción para editar el campo `school`.
3. **Validación de Backend:** Reforzar el procedimiento `selectSchool` en tRPC para que devuelva un error `FORBIDDEN` si el campo en la base de datos ya no es `NULL`.

---

## 4. Inicios de Sesión Específicos

### Solo Google para Usuarios:
1. **Limpiar `Login.tsx`:** Eliminar el formulario de email y contraseña. Dejar únicamente el botón grande de "Continuar con Google".
2. **Backend:** En el router de `auth.ts`, validar que el email no pertenezca a una lista negra o que cumpla con el formato deseado.

### Acceso Exclusivo para Administrador:
1. **Portal de Admin:** Crear una página `src/frontend/views/AdminLogin.tsx`.
2. **Doble Factor o Email/Pass:** Solo para esta ruta, permitir el inicio de sesión con credenciales específicas (email/password) que solo el administrador conozca, o restringir el acceso por email (ej: `brizq02@gmail.com`).
3. **Middleware de Seguridad:** El `adminProcedure` en `trpc.ts` ya verifica el rol; esto garantiza que aunque un usuario normal intente entrar a la UI de admin, el servidor rechazará todas sus peticiones de datos.

---

## Resumen de Tareas Inmediatas:

| Tarea | Archivo a Modificar | Objetivo |
| :--- | :--- | :--- |
| **Fix Perfil** | `src/frontend/views/Profile.tsx` | Añadir `utils.user.getProfile.invalidate()`. |
| **Solo Google** | `src/frontend/views/Login.tsx` | Eliminar inputs de texto, dejar solo botón Google. |
| **Bloqueo Escuela** | `src/frontend/views/SchoolSelector.tsx` | Redirigir si `user.school` ya existe. |
| **Admin UI** | `src/frontend/views/AdminPanel.tsx` | Añadir tabla de gestión de usuarios Premium/Free. |
| **Admin Auth** | `src/backend/server/trpc.ts` | Reforzar el chequeo de `role === 'admin'`. |
