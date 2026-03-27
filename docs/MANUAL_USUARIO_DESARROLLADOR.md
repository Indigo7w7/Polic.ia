# Manual de Usuario para el Desarrollador

Bienvenido al proyecto. Esta guía te orientará en cómo navegar por la nueva estructura de componentes aislados y cómo ejecutar y desarrollar en el sistema.

## 1. Estructura de Carpetas

Todo el código de la aplicación reside en `src/`. Hemos dividido el código en 4 componentes principales:

```text
src/
├── frontend/    # Lógica de interfaz, React, Hooks, Zustand, Tailwind
├── backend/     # Servidor, tRPC, Express, servicios de Firebase, lógica de negocio
├── database/    # Drizzle ORM, esquemas de BD, bancos de exámenes estáticos (data)
└── shared/      # Tipos, constantes, helpers, y código core utilizado globalmente
```

## 2. Reglas de Desarrollo

- **Frontend:** Si necesitas modificar una vista o un botón, dirígete a `src/frontend/views` o `src/frontend/components`.
- **Backend:** Si necesitas crear un nuevo endpoint o regla de negocio, agrégalo a `src/backend/server/routers`.
- **Base de Datos:** Para cambiar estructuras de tablas o esquemas, edita `src/database/db/schema.ts`.
- **Compartido:** Si vas a crear interfaces de TypeScript que tanto el backend como el frontend consumen, colócalas en `src/shared/types/`.

> [!WARNING]
> Nunca importes directamente lógica de `src/backend/` o `src/database/` dentro del **Frontend**. Esto romperá las builds y causará filtraciones de código seguro. El frontend debe pasar sus llamadas a través del estado global o trpc (API).

## 3. Comandos Útiles

El proyecto cuenta con varios comandos empaquetados en `package.json` para facilitar tu flujo normal:

- **Arrancar Frontend:**
  ```bash
  npm run dev
  ```
  Esto levanta el entorno de desarrollo y habilita HMR de Vite.

- **Arrancar Backend / Servidor de Desarrollo:**
  ```bash
  npm run server:dev
  ```
  Esto inicia la recarga en vivo de los endpoints.

- **Verificar Errores:**
  ```bash
  npm run lint
  ```
  Te dirá si hay algún error de Typescript luego de cambiar partes de la estructura.

- **Operaciones de Base de Datos:**
  - `npm run db:generate`: Genera migraciones de mysql en base al esquema.
  - `npm run db:push`: Aplica el esquema directo a la bdd en formato de desarrollo (no seguro para producción sin backups reales).

## 4. Buenas Prácticas
1. Elimina temporalmente archivos innecesarios para evitar deudas técnicas y basura. (Los archivos `tsc_errors.txt` u otros logs deben estar en `.gitignore`).
2. Mantén los dominios separados.
