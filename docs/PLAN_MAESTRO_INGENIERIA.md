# Plan Maestro de Ingeniería y Reestructuración: Polic.ia

Este documento detalla la hoja de ruta técnica para transformar el proyecto en un sistema de alto rendimiento, coherente y con una arquitectura de accesos profesional.

---

## 1. Arquitectura de Identidad: Portales Divergentes (Admin vs Alumno)

### El Problema:
El administrador y el alumno comparten el mismo punto de entrada y flujo inicial. Esto es ineficiente y resta autoridad al sistema de gestión.

### La Solución (Paso a Paso):
1.  **Traffic Controller en `App.tsx`:**
    *   Modificar el `useEffect` que observa el `profileQuery.data`.
    *   **Lógica:** Tan pronto como el perfil se cargue desde MySQL, si el `role` es `admin`, el sistema ejecutará un `navigate('/admin-portal', { replace: true })` inmediato.
    *   Esto garantiza que el administrador nunca vea la interfaz de "postulante" a menos que lo desee explícitamente.
2.  **Protección de Rutas (Guards):**
    *   Reforzar `RequireAdmin.tsx` para que, si un usuario no-admin intenta entrar a `/admin`, sea expulsado al Dashboard con un mensaje de error.

---

## 2. Autenticación Simplificada y Profesional

### El Problema:
El login actual mezcla email/password con Google y muestra mensajes de advertencia que restan profesionalismo.

### La Solución (Paso a Paso):
1.  **Rediseño de `Login.tsx`:**
    *   **Eliminación:** Quitar los campos de email, contraseña y el botón de registro manual.
    *   **Limpieza:** Eliminar el texto de "atención" debajo del botón de Google.
    *   **UX:** Centrar el botón de "Ingresar con Google" con un diseño táctico (bordes definidos, sombras azules, tipografía en mayúsculas).
2.  **Sincronización Automática:**
    *   Al hacer login con Google, el sistema debe verificar en MySQL si el usuario existe. Si no, crearlo con el rol `user` por defecto (excepto para el correo del dueño `brizq02@gmail.com`).

---

## 3. Lógica de Negocio PRO: Experiencia Limpia y Eficaz

### El Problema:
Un usuario que ha pagado (PRO) no debería ser bombardeado con contenido gratuito o "demos" que solo sirven para captar clientes nuevos.

### La Solución (Paso a Paso):
1.  **Filtro de Contenido Inteligente en `Dashboard.tsx`:**
    *   Si `isPremium === true`, el sistema filtrará automáticamente la lista de exámenes para **ocultar** todos los que tengan el flag `esDemo: true`.
    *   El alumno PRO solo verá los simulacros oficiales, el ranking de élite y las herramientas avanzadas.
2.  **Eliminación de "Cebos" (Lead Magnets):**
    *   Ocultar el panel de "Próximo Evento" o "Mega Simulacro" si el usuario ya es PRO, o transformarlo en un beneficio exclusivo.
3.  **Estado Financiero en UI:**
    *   Cambiar todos los botones de "Mejorar Rango" por un badge de "AGENTE ÉLITE ACTIVO" para reforzar la sensación de pertenencia.

---

## 4. Gestión de Perfil y Blindaje de Identidad (Escuela)

### El Problema:
Los datos no se actualizan correctamente y el usuario podría intentar cambiar su escuela (EO/EESTP) después de elegirla.

### La Solución (Paso a Paso):
1.  **Sincronización MySQL/Zustand:**
    *   En `Profile.tsx`, implementar `utils.user.getProfile.invalidate()` tras cada actualización exitosa.
    *   Asegurar que el backend devuelva `photoURL` (camelCase) mapeado desde `photo_url`.
2.  **Bloqueo de Escuela Irreversible:**
    *   **Frontend:** En `SchoolSelector.tsx`, añadir un guard: `if (user.school) navigate('/')`.
    *   **Backend:** El procedimiento `selectSchool` en tRPC debe lanzar un `TRPCError(FORBIDDEN)` si el campo `school` en la base de datos ya tiene un valor. **La escuela se elige una sola vez y para siempre.**

---

## Resumen Técnico de Implementación

| Módulo | Acción Crítica | Archivo Principal |
| :--- | :--- | :--- |
| **Auth** | Solo Google + Redirect Admin | `src/frontend/views/Login.tsx` |
| **Navegación** | Guard de Admin en Root | `src/frontend/App.tsx` |
| **Membresía** | Ocultar Demos/Ads para PRO | `src/frontend/views/Dashboard.tsx` |
| **Seguridad** | Escuela Irreversible (Backend) | `src/backend/server/routers/user.ts` |
| **Datos** | Sync Invalidation | `src/frontend/views/Profile.tsx` |
