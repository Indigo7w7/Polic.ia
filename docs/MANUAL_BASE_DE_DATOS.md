# Guía de Implementación para la Funcionalidad de la Base de Datos

Este documento detalla los pasos y las mejores prácticas para transformar la interfaz visual de tu aplicación en una solución completamente funcional, con una base de datos persistente y bien gestionada. La implementación se centrará en la conexión, manipulación y mantenimiento de los datos, siguiendo un enfoque estructurado y de buenas prácticas.

## 1. Configuración del Entorno de Base de Datos

Antes de interactuar con la base de datos, es crucial asegurarse de que el entorno esté correctamente configurado.

### 1.1. Instalación de MySQL

Asegúrate de tener MySQL 8.0+ instalado. Puedes usar Docker para una configuración sencilla:

```bash
docker run --name some-mysql -e MYSQL_ROOT_PASSWORD=my-secret-pw -p 3306:3306 -d mysql:latest
```

Alternativamente, puedes instalarlo nativamente:
- **Windows**: [MySQL Installer](https://dev.mysql.com/downloads/installer/) o `choco install mysql`.
- **macOS**: `brew install mysql`.
- **Linux**: `sudo apt install mysql-server`.

### 1.2. Estructura de Tablas

Al ejecutar las migraciones, se crearán las siguientes tablas principales:

| Tabla | Descripción |
|---|---|
| `users` | Usuarios registrados y roles. |
| `learning_areas` | Áreas del temario 2025. |
| `exam_questions` | Banco de preguntas dinámico. |
| `exam_attempts` | Historial y resultados. |
| `leitner_cards` | Repetición espaciada. |

### 1.3. Configuración de Variables de Entorno (.env)

El archivo `src/database/db/index.ts` utiliza variables de entorno para la conexión a la base de datos. Asegúrate de que tu archivo `.env` en la raíz del proyecto contenga las siguientes variables:

```text
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=my-secret-pw
DB_NAME=polic_ia
```

### 1.3. Migraciones de Drizzle ORM

Tu proyecto utiliza Drizzle ORM para definir el esquema de la base de datos (`src/database/db/schema.ts`). Para crear las tablas en tu base de datos MySQL, debes ejecutar las migraciones. El `package.json` ya incluye scripts para esto:

1. **Generar Migraciones**: Crea archivos de migración basados en los cambios en tu `schema.ts`.
   ```bash
   npm run db:generate
   ```
2. **Aplicar Migraciones**: Aplica los cambios a tu base de datos real.
   ```bash
   npm run db:push
   ```

### 1.4. Siembra de Datos Iniciales (seed.ts)

El archivo `src/backend/server/db/seed.ts` (ahora en `src/database/db/seed.ts`) contiene lógica para poblar la base de datos con datos iniciales (áreas de aprendizaje, preguntas base). Para ejecutarlo:

```bash
npx tsx src/database/db/seed.ts
```

---

## 2. Verificación de la Conexión

### 2.1. Iniciar el Servidor Backend (tRPC)
```bash
npm run server:dev
```
Esto iniciará el servidor en `http://localhost:3001` (o el puerto configurado).

### 2.2. Iniciar el Frontend (React)
```bash
npm run dev
```
La aplicación frontend estará en `http://localhost:3000`.

### 2.3. Pruebas de Conectividad
- **Backend a Base de Datos**: Observa la consola para errores de conexión. Si `seed.ts` funciona, la conexión es exitosa.
- **Frontend a Backend**: Navega por la aplicación. Funcionalidades como carga de preguntas (`Dashboard.tsx`) y envío de respuestas (`Simulador.tsx`) deben fluir sin errores.

---

## 3. Funcionalidad de la Base de Datos (CRUD)

### 3.1. Operaciones de Lectura (Read)
- **Carga de Preguntas**: Se usa `trpc.exam.getQuestionsByFilter`. La aleatorización con `sql` y `RAND()` es recomendada para exámenes dinámicos.
- **Historial de Exámenes**: Implementa la visualización del historial usando `exam.getHistory`.

### 3.2. Operaciones de Escritura
- **Registro de Intentos**: El procedimiento `submitAttempt` en `exam.ts` es un ejemplo de escritura compleja que usa transacciones para asegurar la atomicidad de los datos.
- **Tarjetas Leitner**: La actualización de fechas de repaso se calcula automáticamente en base al desempeño del usuario.
- **Gestión de Usuarios**: La sincronización entre Firebase Auth y MySQL debe ser robusta a través del router `user.ts`.

### 3.3. Integración con tRPC
1. **Zod**: Úsalo para definir esquemas de validación de entradas y salidas.
2. **Procedimientos**: Crea `query` para lecturas y `mutation` para escrituras en `src/backend/server/routers/`.
3. **Hooks**: Consume en el frontend con `trpc.router.procedimiento.useQuery()`.

---

## 4. Buenas Prácticas

> [!IMPORTANT]
> **Seguridad**: Nunca expongas credenciales en el código. Usa siempre `.env`. Valida todas las entradas con Zod para prevenir inyecciones.

- **Rendimiento**: Asegúrate de indexar columnas usadas en `WHERE` o `JOIN`. Implementa paginación para tablas grandes (como la de preguntas).
- **Manejo de Errores**: Registra errores detallados en el servidor, pero muestra mensajes amigables y simplificados al usuario final.
- **Mantenimiento**: Mantén el código modular y documentado. Separa la lógica de negocio de la lógica de persistencia.
