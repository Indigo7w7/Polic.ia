# Plan de Reestructuración Lógica y Eficacia: Polic.ia

Tras un análisis profundo "desde cero", he detectado que el sistema actual carece de una separación clara de responsabilidades y flujos de navegación lógicos. Este plan detalla cómo transformar el programa en una herramienta profesional y coherente.

---

## 1. Arquitectura de Identidad: Portales Divergentes

### El Problema:
El administrador y el alumno comparten el mismo punto de entrada y flujo inicial. Esto es poco práctico y resta autoridad al sistema de gestión.

### La Solución:
1.  **Redirección Automática por Rol (App.tsx):**
    *   Implementar un "Traffic Controller" en el componente raíz. 
    *   **Lógica:** Tan pronto como el perfil se cargue desde MySQL, si el `role` es `admin`, el sistema ejecutará un `navigate('/admin-portal', { replace: true })`. El administrador nunca verá el Dashboard de alumnos.
2.  **Portal de Alumno (Login.tsx):**
    *   **Simplificación Total:** Eliminar el formulario de email/password y el mensaje de advertencia inferior. 
    *   **Acceso Único:** Un solo botón de "Ingresar con Google". Esto garantiza que todos los alumnos tengan una identidad verificada y un avatar real desde el inicio.

---

## 2. Lógica de Negocio PRO: Exclusividad Real

### El Problema:
Un usuario que ha pagado (PRO) no debería ser bombardeado con contenido gratuito o "demos" que solo sirven para captar clientes nuevos.

### La Solución:
1.  **Filtro de Contenido Inteligente (Dashboard.tsx):**
    *   Si `isPremium === true`, el sistema filtrará automáticamente la lista de exámenes para **ocultar** todos los que tengan el flag `esDemo: true`.
    *   El alumno PRO solo verá los simulacros oficiales, el ranking de élite y las herramientas avanzadas.
2.  **Limpieza de UI:**
    *   Ocultar banners de "Mejorar Rango" o "Lead Magnets" para usuarios con suscripción activa. El espacio se utilizará para mostrar estadísticas de rendimiento y áreas de mejora.

---

## 3. Integridad de Datos: Escuela Inmutable

### El Problema:
La elección de escuela (EO o EESTP) es una decisión de carrera. Permitir que el usuario la cambie o vuelva a la pantalla de selección es un fallo lógico grave.

### La Solución:
1.  **Bloqueo de Base de Datos (Backend):**
    *   Modificar el router `user.ts` para que el procedimiento `selectSchool` verifique si el campo `school` ya tiene datos. Si es así, lanzará un error de "Acción Prohibida".
2.  **Guard de Navegación (Frontend):**
    *   En `SchoolSelector.tsx`, añadir un efecto que redirija al Dashboard si el usuario ya tiene una escuela asignada en su perfil.

---

## 4. Eficacia en la Gestión de Perfil

### El Problema:
Los cambios en el perfil no se reflejan de inmediato debido a la falta de invalidación de caché, y hay inconsistencias entre los nombres de campos de MySQL y el Store.

### La Solución:
1.  **Sincronización Total:**
    *   Asegurar que el backend devuelva siempre `photoURL` (camelCase) mapeado desde `photo_url`.
    *   En `Profile.tsx`, usar `utils.user.getProfile.invalidate()` para que el sistema se refresque automáticamente tras cada guardado.

---

## Hoja de Ruta de Implementación

| Paso | Módulo | Acción |
| :--- | :--- | :--- |
| **1** | **Auth & Routing** | Implementar redirección directa para Admin y login único Google para Alumnos. |
| **2** | **Business Logic** | Ocultar Demos y Ads para usuarios PRO en el Dashboard. |
| **3** | **Data Integrity** | Bloquear el cambio de escuela en Backend y Frontend de forma permanente. |
| **4** | **UX/UI** | Refactorizar el Panel de Perfil para sincronización instantánea con MySQL. |
| **5** | **Admin UI** | Optimizar el Panel Táctico para gestión directa de membresías y vouchers. |
