# Plan Maestro de Reestructuración y Mejora: Polic.ia

Este documento detalla la hoja de ruta técnica para transformar el proyecto en un sistema de alto rendimiento, coherente y con una experiencia de usuario (UX) de nivel premium.

---

## 1. Arquitectura de Navegación y Acceso Directo (Admin First)

### Problema Detectado:
El administrador debe pasar por el Dashboard de usuario antes de llegar a su panel. Esto es ineficiente y rompe la jerarquía del sistema.

### Solución Paso a Paso:
1.  **Middleware de Enrutamiento en `App.tsx`:**
    *   Modificar el `useEffect` que observa el `profileQuery.data`.
    *   **Lógica:** Si `data.role === 'admin'`, realizar un `navigate('/admin', { replace: true })` inmediato.
    *   Esto garantiza que el administrador nunca vea la interfaz de "postulante" a menos que lo desee explícitamente.
2.  **Protección de Rutas (Guards):**
    *   Reforzar `RequireAdmin.tsx` para que, si un usuario no-admin intenta entrar a `/admin`, sea expulsado al Dashboard con un mensaje de error.

---

## 2. Autenticación Simplificada y Profesional

### Problema Detectado:
El login actual mezcla email/password con Google y muestra mensajes de advertencia que restan profesionalismo.

### Solución Paso a Paso:
1.  **Rediseño de `Login.tsx`:**
    *   **Eliminación:** Quitar los campos de email, contraseña y el botón de registro manual.
    *   **Limpieza:** Eliminar el texto de "atención" debajo del botón de Google.
    *   **UX:** Centrar el botón de "Continuar con Google" con un diseño táctico (bordes definidos, sombras azules, tipografía en mayúsculas).
2.  **Sincronización Automática:**
    *   Al hacer login con Google, el sistema debe verificar en MySQL si el usuario existe. Si no, crearlo con el rol `user` por defecto (excepto para el correo del dueño `brizq02@gmail.com`).

---

## 3. Lógica de Membresía PRO: Experiencia Limpia

### Problema Detectado:
Los usuarios que ya pagaron (PRO) siguen viendo anuncios, demos y botones de "Mejorar Rango", lo cual es molesto.

### Solución Paso a Paso:
1.  **Ocultamiento de Demos en `Dashboard.tsx`:**
    *   Modificar el renderizado de los exámenes. Si `isPremium === true`, filtrar la lista de exámenes para **no mostrar** aquellos marcados como `esDemo`. El usuario PRO solo debe ver los exámenes reales y completos.
2.  **Eliminación de "Cebos" (Lead Magnets):**
    *   Ocultar el panel de "Próximo Evento" o "Mega Simulacro" si el usuario ya es PRO, o transformarlo en un beneficio exclusivo.
3.  **Estado Financiero en UI:**
    *   Cambiar todos los botones de "Mejorar Rango" por un badge de "AGENTE ÉLITE ACTIVO" para reforzar la sensación de pertenencia.

---

## 4. Gestión de Perfil y Blindaje de Escuela

### Problema Detectado:
Los datos no se actualizan correctamente y el usuario podría intentar cambiar su escuela (EO/EESTP) después de elegirla.

### Solución Paso a Paso:
1.  **Sincronización MySQL/Zustand:**
    *   En `Profile.tsx`, implementar `utils.user.getProfile.invalidate()` tras cada actualización exitosa.
    *   Asegurar que el backend devuelva `photoURL` (camelCase) para que coincida con el store.
2.  **Bloqueo de Escuela Irreversible:**
    *   **Frontend:** En `SchoolSelector.tsx`, añadir un guard: `if (user.school) navigate('/')`.
    *   **Backend:** El procedimiento `selectSchool` en tRPC debe lanzar un `TRPCError(FORBIDDEN)` si el campo `school` en la base de datos ya tiene un valor. **La escuela se elige una sola vez y para siempre.**

---

## 5. Panel de Administración Potenciado

### Problema Detectado:
Falta una herramienta de gestión rápida de usuarios.

### Solución Paso a Paso:
1.  **Nueva Vista: Gestión de Usuarios:**
    *   Crear una tabla en el `AdminPanel` que permita buscar por email o nombre.
    *   Añadir un interruptor (Switch) para activar/desactivar el modo PRO de cualquier usuario manualmente.
2.  **Aprobación de Vouchers:**
    *   Optimizar la vista de vouchers para que al hacer clic en "Aprobar", el sistema no solo cambie el estado del pago, sino que actualice el `membership` del usuario a `PRO` y le asigne 30 días de acceso automáticamente.

---

## Resumen Técnico de Implementación

| Módulo | Acción Crítica | Archivo Principal |
| :--- | :--- | :--- |
| **Auth** | Solo Google + Redirect Admin | `src/frontend/views/Login.tsx` |
| **Navegación** | Guard de Admin en Root | `src/frontend/App.tsx` |
| **Membresía** | Ocultar Demos/Ads para PRO | `src/frontend/views/Dashboard.tsx` |
| **Seguridad** | Escuela Irreversible (Backend) | `src/backend/server/routers/user.ts` |
| **Datos** | Sync Invalidation | `src/frontend/views/Profile.tsx` |
