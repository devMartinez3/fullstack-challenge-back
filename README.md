# Backend Challenge API

API REST con NestJS, Prisma y PostgreSQL; desplegable en AWS Lambda (HTTP API). Incluye proxy a ReqRes.in para login e importación de usuarios, y CRUD local de usuarios y publicaciones.

---

## Requisitos

- **Node.js 20** (recomendado; mínimo 18 para Prisma y Lambda)
- **PostgreSQL** (local o remoto) para desarrollo
- **npm** (o pnpm/yarn)
- **Docker** (opcional): para levantar solo la base de datos con `docker-compose`
- **AWS CLI** (opcional): para desplegar en Lambda

---

## Tecnologías


| Tecnología                                  | Uso                                                           |
| ------------------------------------------- | ------------------------------------------------------------- |
| NestJS 11                                   | Framework API, inyección de dependencias, validación, Swagger |
| Prisma 6                                    | ORM, migraciones, cliente generado en `prisma/generated`      |
| PostgreSQL                                  | Base de datos (local o RDS en AWS)                            |
| class-validator / class-transformer         | DTOs y validación de payloads                                 |
| ReqRes.in                                   | API externa para login e importación de usuarios              |
| Serverless Framework 4 + serverless-esbuild | Empaquetado y despliegue en AWS Lambda (Node 20)              |
| Swagger (@nestjs/swagger)                   | Documentación interactiva en `/api/docs`                      |
| Helmet                                      | Cabeceras de seguridad HTTP                                   |
| Throttler                                   | Límite de peticiones                                          |
| JWT                                         | Token devuelto en login                                       |
| Jest + Supertest                            | Tests unitarios y e2e                                         |
| TypeScript, ESLint, Prettier                | Lenguaje y calidad de código                                  |
| serverless-offline                          | Pruebas locales del stack Serverless sin desplegar            |


---

## Instalación

1. Clonar (o descargar) el repositorio y entrar en la carpeta del proyecto.
2. Instalar dependencias: `npm install`
3. Copiar variables de entorno: `cp .env.example .env`
4. Editar `.env` con `DATABASE_URL`, `SECRET_KEY`, `REQRES_URL` y, si aplica, `PORT`.
5. Generar cliente Prisma: `npx prisma generate`
6. Aplicar migraciones: `npx prisma migrate deploy`
  (Si no hay migraciones previas: `npx prisma migrate dev --name init`)

---

## Variables de entorno

Crear `.env` en la raíz (no subir al repositorio). Valores mínimos:


| Variable       | Descripción                                                         |
| -------------- | ------------------------------------------------------------------- |
| `DATABASE_URL` | URL de conexión PostgreSQL (obligatorio)                            |
| `SECRET_KEY`   | Clave para JWT y cabecera con ReqRes (obligatorio)                  |
| `REQRES_URL`   | URL base de ReqRes.in, p. ej. `https://reqres.in/api` (obligatorio) |
| `PORT`         | Puerto del servidor en local (opcional, por defecto 3000)           |


Para **desplegar en Lambda** añadir en `.env`:


| Variable                   | Descripción                                            |
| -------------------------- | ------------------------------------------------------ |
| `LAMBDA_SECURITY_GROUP_ID` | ID del security group de la Lambda (p. ej. `sg-xxxxx`) |
| `VPC_SUBNET_ID_1`          | ID de una subnet privada (p. ej. `subnet-xxxxx`)       |
| `VPC_SUBNET_ID_2`          | ID de otra subnet privada (p. ej. `subnet-yyyyy`)      |


El security group de RDS debe permitir tráfico **inbound** en el puerto **5432 unicamente** desde el security group de la Lambda.

---

## Ejecución

### Local (desarrollo)

```bash
npm run start:dev
```

La API queda en `http://localhost:3000`. Swagger: `http://localhost:3000/api/docs`.

### Local (producción)

```bash
npm run build
npm run start:prod
```

### Docker (solo base de datos)

Levantar PostgreSQL en puerto 5433:

```bash
docker-compose up -d
```

En `.env` usar por ejemplo:

```env
DATABASE_URL="postgresql://root:rootpassword@localhost:5433/backend_challenge"
```

Luego ejecutar migraciones y arrancar la API como en los pasos de instalación y ejecución local.

### Serverless offline

Probar el stack Serverless en local sin desplegar en AWS:

```bash
npm run deploy:offline
```

---

## Despliegue

La API se despliega como una función Lambda detrás de HTTP API (API Gateway v2), dentro de una VPC y con conexión privada a RDS.

**Prerrequisitos:** Node 20 (o 18+), `npm install` ejecutado, AWS CLI configurado, RDS PostgreSQL en la misma VPC con security group que permita 5432 desde la Lambda, y variables de VPC/security group en `.env`.

**Lambda (stage dev):**

```bash
npx prisma generate
npm run deploy
```

**Lambda (stage prod):**

```bash
npm run deploy:prod
```

El script `deploy` ejecuta `nest build`, comprueba que exista `dist/src/lambda.js` y luego `serverless deploy`. Tras el despliegue, la consola muestra la URL del HTTP API.

- Base: `https://<api-id>.execute-api.us-east-2.amazonaws.com`
- Swagger: `https://<api-id>.execute-api.us-east-2.amazonaws.com/api/docs`

---

## Rutas de la API

Base URL en local: `http://localhost:3000` (o el `PORT` configurado). En Lambda: `https://<api-id>.execute-api.us-east-2.amazonaws.com`.


| Método | Ruta                    | Descripción                                                 |
| ------ | ----------------------- | ----------------------------------------------------------- |
| GET    | `/`                     | Health / mensaje de bienvenida                              |
| GET    | `/stats`                | Estadísticas (totales y últimos usuarios y posts)           |
| POST   | `/auth/login`           | Login proxy a ReqRes; devuelve token JWT y datos de usuario |
| POST   | `/users/import/:id`     | Importa usuario de ReqRes por ID y lo guarda en BD          |
| GET    | `/users/saved`          | Lista usuarios guardados (paginado: `page`, `limit`)        |
| GET    | `/users/saved/:id`      | Detalle de un usuario guardado (con posts)                  |
| PATCH  | `/users/saved/:id`      | Actualiza datos del usuario                                 |
| PATCH  | `/users/saved/:id/role` | Cambia rol (USER/ADMIN); requiere admin                     |
| DELETE | `/users/saved/:id`      | Borra usuario y sus posts; requiere admin                   |
| POST   | `/posts`                | Crea un post                                                |
| GET    | `/posts`                | Lista posts (paginado; opcional `userId`)                   |
| GET    | `/posts/:id`            | Detalle de un post (con autor)                              |
| PUT    | `/posts/:id`            | Actualiza un post (parcial)                                 |
| DELETE | `/posts/:id`            | Elimina un post                                             |
| GET    | `/api/docs`             | Documentación Swagger (UI interactiva)                      |


Las respuestas siguen un formato común (interceptor) con `data`, `message` y códigos HTTP estándar. Contratos y ejemplos en **GET /api/docs**.

---

## Estructura del proyecto

```
├── prisma/
│   ├── schema.prisma       Modelos User, Post y generador de cliente
│   ├── migrations/         Migraciones SQL
│   └── generated/prisma/  Cliente Prisma generado + motor para Lambda
├── src/
│   ├── lambda.ts           Handler para AWS Lambda (Nest + serverless-express)
│   ├── main.ts             Entrada para ejecución local (nest start)
│   ├── app.module.ts       Módulo raíz
│   ├── app.controller.ts  GET /, GET /stats
│   ├── auth/               POST /auth/login (proxy ReqRes)
│   ├── users/              Importación y CRUD de usuarios guardados
│   ├── posts/              CRUD de publicaciones
│   └── common/             Filtros, interceptores, DTOs compartidos
├── serverless.yml          Definición Lambda, VPC, env, plugin esbuild
├── esbuild.config.js       Aliases, externals, plugin Prisma
└── tsconfig.build.json     Include src + prisma para nest build (lambda.js)
```

---

## Tests

```bash
npm run test           # Tests unitarios
npm run test:watch     # Tests unitarios en modo watch
npm run test:cov       # Cobertura
npm run test:e2e       # Tests e2e
```

---

## Licencia

UNLICENSED (proyecto de prueba técnica).