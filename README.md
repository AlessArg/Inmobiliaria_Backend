# Backend Nest + Firebase Admin

Este backend expone API para autenticación con Firebase (email/password y Google), y validación de sesión para un frontend externo.

## 1) Instalar dependencias

```bash
npm install
```

## 2) Crear tu archivo `.env`

Copia `.env.example` a `.env` y completa los valores.

```bash
cp .env.example .env
```

Variables usadas:

- `PORT`
- `FRONTEND_URL`
- `BACKEND_API_KEY`
- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`
- `EMPLOYEE_PASSWORD_SECRET`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_WEB_API_KEY`
- `FIREBASE_DATABASE_URL` (opcional)
- `FIREBASE_STORAGE_BUCKET` (opcional)

El backend valida estas variables al iniciar y falla en arranque si falta alguna requerida o si `PORT`/`MYSQL_PORT` no son enteros válidos.

## 3) Qué necesito de Firebase y cómo obtenerlo (paso a paso)

1. Entra a [Firebase Console](https://console.firebase.google.com/) y haz clic en **Crear proyecto**.
2. Pon nombre al proyecto y continúa con la configuración (Google Analytics opcional).
3. Cuando termine, entra a **Configuración del proyecto** (ícono de engrane).
4. En **General**, baja hasta **Tus apps** y crea una app Web (`</>`).
5. Copia `apiKey` y guárdala en `.env` como `FIREBASE_WEB_API_KEY`.
6. Ve a la pestaña **Cuentas de servicio**.
7. Haz clic en **Generar nueva clave privada** y descarga el JSON.
8. Del JSON toma estos valores y pégalos en `.env`:
   - `project_id` -> `FIREBASE_PROJECT_ID`
   - `client_email` -> `FIREBASE_CLIENT_EMAIL`
   - `private_key` -> `FIREBASE_PRIVATE_KEY`
9. En `FIREBASE_PRIVATE_KEY`, deja los saltos de línea como `\\n` y encierra el valor entre comillas.
10. En Firebase, abre **Authentication** -> **Get started**.
11. En **Sign-in method**, habilita **Email/Password**.
12. En **Sign-in method**, habilita **Google** y define email de soporte.
13. En **Authentication** -> **Settings** -> **Authorized domains**, agrega el dominio de tu frontend (por ejemplo `localhost`).
14. Si usarás Firestore para perfiles, crea **Firestore Database** y colección `users`.

## 4) Ejecutar backend

```bash
npm run start:dev
```

## 5) Login como entrada principal del proyecto

La ruta raíz (`GET /`) responde con la información de endpoints y marca `POST /employees/login` como endpoint principal.

## 5.1) Healthcheck operativo

- `GET /health`
  - Response cuando MySQL está disponible:
    ```json
    {
      "status": "ok",
      "database": "up",
      "timestamp": "2026-03-31T12:00:00.000Z",
      "uptimeSeconds": 123
    }
    ```

## 5.2) Contrato global de respuesta (fase 6)

Todas las respuestas HTTP exitosas se envuelven automáticamente con este formato:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "OK",
  "path": "/ruta",
  "method": "GET",
  "timestamp": "2026-03-31T12:00:00.000Z",
  "data": {}
}
```

Todos los errores HTTP se devuelven con este formato uniforme:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "details": [
    "campo_x must be a string"
  ],
  "path": "/ruta",
  "method": "POST",
  "timestamp": "2026-03-31T12:00:00.000Z"
}
```

Además, cada request queda logueado con método, ruta, status y duración en ms.
  - Response cuando MySQL no está disponible:
    ```json
    {
      "status": "degraded",
      "database": "down",
      "timestamp": "2026-03-31T12:00:00.000Z",
      "uptimeSeconds": 123
    }
    ```

## 6) Configurar MySQL para employees

1. Crea una base de datos, por ejemplo `system_authentication`.
2. Crea la tabla `employees` con los mismos nombres de columnas solicitados (incluyendo `employee_salary`).
3. Configura `.env` con:
  - `MYSQL_USER` (usuario de tu servidor MySQL)
  - `MYSQL_PASSWORD` (contraseña de tu servidor MySQL)
4. Configura `BACKEND_API_KEY` para proteger el endpoint login de empleados.
5. Configura `EMPLOYEE_PASSWORD_SECRET` para cifrado/descifrado seguro de `employee_password`.
6. Si quieres seed automático, configura `DEFAULT_EMPLOYEE_*` en `.env`.

Ejemplo de estructura mínima sugerida para `employees`:

```sql
CREATE TABLE employees (
  id_employee INT AUTO_INCREMENT PRIMARY KEY,
  employee_name VARCHAR(255) NOT NULL,
  employee_age INT NOT NULL,
  employee_job VARCHAR(255) NOT NULL,
  employee_salary DECIMAL(10,2) NOT NULL,
  employee_check_in TIME NOT NULL,
  employee_photo TEXT NULL,
  employee_user VARCHAR(100) NOT NULL UNIQUE,
  employee_password TEXT NOT NULL,
  employee_email VARCHAR(255) NOT NULL,
  id_role INT NOT NULL
);
```

El backend intenta crear automáticamente el usuario `Maragon.IT` al iniciar, si no existe.

## 7) Estructura del API para frontend externo

Base URL local: `http://localhost:3000`

- `POST /auth/login/email`
  - Request:
    ```json
    {
      "email": "usuario@correo.com",
      "password": "tu_password"
    }
    ```
  - Response:
    ```json
    {
      "provider": "password",
      "firebaseUserId": "uid",
      "email": "usuario@correo.com",
      "displayName": null,
      "idToken": "...",
      "refreshToken": "...",
      "expiresIn": 3600,
      "decodedToken": {}
    }
    ```

- `POST /auth/login/google`
  - Request (opción 1 - recomendado):
    ```json
    {
      "googleIdToken": "TOKEN_DE_GOOGLE"
    }
    ```
  - Request (opción 2):
    ```json
    {
      "googleAccessToken": "ACCESS_TOKEN_DE_GOOGLE"
    }
    ```
  - Response: misma estructura que `/auth/login/email`, con `provider: "google.com"`.

- `POST /auth/verify-token`
  - Request:
    ```json
    {
      "idToken": "FIREBASE_ID_TOKEN"
    }
    ```
  - Response:
    ```json
    {
      "valid": true,
      "decodedToken": {}
    }
    ```

- `GET /auth/me`
  - Headers: `Authorization: Bearer FIREBASE_ID_TOKEN`
  - Response:
    ```json
    {
      "valid": true,
      "decodedToken": {}
    }
    ```

- `POST /employees/seed`
  - Crea el usuario por defecto (Maragon.IT) si no existe. Útil para inicializar después de crear la DB.

- `POST /employees`
  - Request:
    ```json
    {
      "employee_name": "Marvin Alessandro Aragon de León",
      "employee_age": 22,
      "employee_job": "Analista Desarrollador Senior",
      "employee_salary": 25000,
      "employee_check_in": "08:00:00",
      "employee_photo": null,
      "employee_user": "Maragon.IT",
      "employee_password": "Aragon_1",
      "employee_email": "maragon.it@empresa.local",
      "id_role": 1
    }
    ```
  - Comportamiento:
    - Cifra `employee_password` antes de guardar en MySQL.
    - Valida que `employee_check_in` sea formato TIME (`HH:mm:ss`).

- `POST /employees/login`
  - Header obligatorio: `x-api-key: TU_BACKEND_API_KEY`
  - Request (acepta ambos formatos):
    ```json
    {
      "user": "Maragon.IT",
      "password": "Aragon_1"
    }
    ```
    o
    ```json
    {
      "employee_user": "Maragon.IT",
      "employee_password": "Aragon_1"
    }
    ```
  - Respuestas:
    - `200` si usuario/contraseña coinciden y el empleado está activo.
    - `401` si usuario/contraseña no coinciden.
    - `403` si el empleado está inactivo.

- `GET /employees`
  - Header obligatorio: `x-api-key: TU_BACKEND_API_KEY`
  - Response: Array de todos los empleados (sin contraseñas por seguridad).
    ```json
    [
      {
        "id_employee": 1,
        "employee_name": "Marvin Alessandro Aragon de León",
        "employee_age": 22,
        "employee_job": "Analista Desarrollador Senior",
        "employee_salary": 25000,
        "employee_check_in": "08:00:00",
        "employee_photo": null,
        "employee_user": "Maragon.IT",
        "employee_email": "maragon.it@empresa.local",
        "activo": true,
        "role_name": "Administrador"
      }
    ]
    ```

- `GET /employees/:id_employee`
  - Header obligatorio: `x-api-key: TU_BACKEND_API_KEY`
  - Response: Información del empleado específico (sin contraseña).
    ```json
    {
      "id_employee": 1,
      "employee_name": "Marvin Alessandro Aragon de León",
      "employee_age": 22,
      "employee_job": "Analista Desarrollador Senior",
      "employee_salary": 25000,
      "employee_check_in": "08:00:00",
      "employee_photo": null,
      "employee_user": "Maragon.IT",
      "employee_email": "maragon.it@empresa.local",
      "activo": true,
      "role_name": "Administrador"
    }
    ```
  - Respuestas: `404` si el empleado no existe.

- `PATCH /employees/:id_employee`
  - Header obligatorio: `x-api-key: TU_BACKEND_API_KEY`
  - Request: JSON con campos opcionales a actualizar (ejemplo actualizando email y salary).
    ```json
    {
      "employee_email": "nuevo@email.com",
      "employee_salary": 30000
    }
    ```
  - Response: Empleado actualizado (sin contraseña).
    ```json
    {
      "id_employee": 1,
      "employee_name": "Marvin Alessandro Aragon de León",
      "employee_age": 22,
      "employee_job": "Analista Desarrollador Senior",
      "employee_salary": 30000,
      "employee_check_in": "08:00:00",
      "employee_photo": null,
      "employee_user": "Maragon.IT",
      "employee_email": "nuevo@email.com",
      "activo": true,
      "role_name": "Administrador",
      "message": "Employee updated successfully"
    }
    ```
  - Comportamiento: Solo actualiza los campos proporcionados. Valida formatos y unicidad de `employee_user`. Permite actualizar empleados inactivos.

- `GET /employees/roles`
  - Header obligatorio: `x-api-key: TU_BACKEND_API_KEY`
  - Response: Array de todos los roles.
    ```json
    [
      {
        "id_role": 1,
        "role_name": "Administrador"
      },
      {
        "id_role": 2,
        "role_name": "Usuario"
      }
    ]
    ```

- `GET /employees/marcajes`
  - Header obligatorio: `x-api-key: TU_BACKEND_API_KEY`
  - Response: Array de todos los marcajes con nombre del empleado.
    ```json
    [
      {
        "id_marcaje": 1,
        "id_employee": 1,
        "employee_name": "Marvin Alessandro Aragon de León",
        "fecha": "2023-10-01",
        "hora_entrada": "08:00:00",
        "hora_salida": "17:00:00",
        "estado": "completado"
      }
    ]
    ```

- `GET /employees/marcajes/:id_employee`
  - Header obligatorio: `x-api-key: TU_BACKEND_API_KEY`
  - Response: Array de marcajes del empleado específico.
    ```json
    [
      {
        "id_marcaje": 1,
        "id_employee": 1,
        "employee_name": "Marvin Alessandro Aragon de León",
        "fecha": "2023-10-01",
        "hora_entrada": "08:00:00",
        "hora_salida": "17:00:00",
        "estado": "completado"
      }
    ]
    ```

- `POST /employees/marcajes`
  - Header obligatorio: `x-api-key: TU_BACKEND_API_KEY`
  - Request: JSON con campos opcionales.
    ```json
    {
      "fecha_hora": "2023-10-01 08:00:00",
      "descripcion": "Entrada laboral",
      "motivo": "Trabajo",
      "id_employee": 1
    }
    ```
  - Response: Marcaje creado.
    ```json
    {
      "id_marcaje": 1,
      "fecha_hora": "2023-10-01 08:00:00",
      "descripcion": "Entrada laboral",
      "motivo": "Trabajo",
      "id_employee": 1,
      "message": "Marcaje created successfully"
    }
    ```

## 8) Endpoints de usuarios (opcionales)

- `GET /users/auth?maxResults=20&pageToken=`
  - Lista usuarios de Firebase Authentication.
- `GET /users/auth/:uid`
  - Consulta un usuario de Authentication por `uid`.
- `GET /users/firestore?limit=20`
  - Lista documentos de la colección `users` en Firestore.
- `GET /users/firestore/:uid`
  - Consulta un documento por `uid` en la colección `users`.

## 9) Ejemplos con curl

```bash
curl -X POST "http://localhost:3000/auth/login/email" -H "Content-Type: application/json" -d "{\"email\":\"usuario@correo.com\",\"password\":\"123456\"}"
curl -X POST "http://localhost:3000/auth/login/google" -H "Content-Type: application/json" -d "{\"googleIdToken\":\"TOKEN_AQUI\"}"
curl -X POST "http://localhost:3000/auth/verify-token" -H "Content-Type: application/json" -d "{\"idToken\":\"TOKEN_AQUI\"}"
curl "http://localhost:3000/auth/me" -H "Authorization: Bearer TOKEN_AQUI"
curl -X POST "http://localhost:3000/employees/seed"
curl -X POST "http://localhost:3000/employees" -H "Content-Type: application/json" -d "{\"employee_name\":\"Marvin Alessandro Aragon de León\",\"employee_age\":22,\"employee_job\":\"Analista Desarrollador Senior\",\"employee_salary\":25000,\"employee_check_in\":\"08:00:00\",\"employee_photo\":null,\"employee_user\":\"Maragon.IT\",\"employee_password\":\"Aragon_1\",\"employee_email\":\"maragon.it@empresa.local\",\"id_role\":1}"
curl -X POST "http://localhost:3000/employees/login" -H "Content-Type: application/json" -H "x-api-key: TU_BACKEND_API_KEY" -d "{\"user\":\"Maragon.IT\",\"password\":\"Aragon_1\"}"
curl "http://localhost:3000/employees" -H "x-api-key: TU_BACKEND_API_KEY"
curl "http://localhost:3000/employees/1" -H "x-api-key: TU_BACKEND_API_KEY"
curl -X PATCH "http://localhost:3000/employees/1" -H "Content-Type: application/json" -H "x-api-key: TU_BACKEND_API_KEY" -d "{\"employee_email\":\"nuevo@email.com\"}"
curl "http://localhost:3000/employees/marcajes" -H "x-api-key: TU_BACKEND_API_KEY"
curl "http://localhost:3000/employees/marcajes/1" -H "x-api-key: TU_BACKEND_API_KEY"
curl -X POST "http://localhost:3000/employees/marcajes" -H "Content-Type: application/json" -H "x-api-key: TU_BACKEND_API_KEY" -d "{\"fecha_hora\":\"2023-10-01 08:00:00\",\"descripcion\":\"Entrada\",\"id_employee\":1}"
curl "http://localhost:3000/employees/roles" -H "x-api-key: TU_BACKEND_API_KEY"
curl "http://localhost:3000/users/auth?maxResults=10"
curl "http://localhost:3000/users/auth/UID_AQUI"
curl "http://localhost:3000/users/firestore?limit=10"
curl "http://localhost:3000/users/firestore/UID_AQUI"
```

## Nota de seguridad

No subas tu `.env` ni el JSON de service account al repositorio. Solo comparte `.env.example`.
