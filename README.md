# BioSacha Backend — Aplicaciones Móviles

Backend académico del proyecto integrador **BioSacha**, desarrollado con Node.js y Express. La aplicación está orientada al registro y preservación de información botánica y conocimientos ancestrales de comunidades amazónicas, con un enfoque de captura **offline-first** y sincronización posterior.

## Entrega principal

El archivo que representa la entrega final de la Semana 8 es:

```text
index-semana8-final.js
```

Los demás archivos se conservan para demostrar continuidad:

- `index.js`: base segura construida antes de la optimización.
- `index-semana8.js`: versión de trabajo de la Semana 8.
- `index-semana8-final.js`: versión final verificada y presentada en el video.

## Evolución semanal

- **Semana 6:** API REST, CRUD, validaciones, paginación, eliminación lógica y reglas de negocio.
- **Semana 7:** autenticación JWT, bcrypt, access token, refresh token, autorización por roles y rutas protegidas.
- **Semana 8:** caché cache-aside, TTL, invalidación explícita, diagnóstico y corrección N+1, eager/lazy loading, cola de trabajo y worker asíncrono.

## Funcionalidades principales

- Respuestas JSON estandarizadas.
- Registro e inicio de sesión.
- Access token y refresh token.
- Roles: comunitario, técnico, validador y administrador.
- CRUD de registros botánicos.
- Paginación y restricciones por usuario.
- Validación de registros por roles autorizados.
- Caché en memoria con estrategia cache-aside.
- TTL de 60 segundos e invalidación en operaciones de escritura.
- Corrección del riesgo N+1 mediante carga agrupada equivalente a eager loading.
- Justificación del uso de eager loading y lazy loading.
- Recepción de lotes con HTTP 202 Accepted.
- Procesamiento en segundo plano mediante una cola y un worker.
- Consulta del estado de los lotes.
- Endpoint de salud del servidor.

## Requisitos

- Node.js 18 o superior.
- npm.

## Instalación

```bash
git clone URL_DEL_REPOSITORIO
cd biosacha-backend-aplicaciones-moviles
npm install
cp .env.example .env
```

Después, edite `.env` y reemplace todos los valores de ejemplo.

## Ejecución

```bash
npm start
```

El servidor se ejecutará, por defecto, en:

```text
http://localhost:3000
```

## Verificación del código

```bash
npm run check
```

Este comando valida la sintaxis de las tres versiones conservadas.

## Endpoints principales

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/health` | Comprueba el estado del servidor |
| POST | `/api/auth/register` | Registra un usuario |
| POST | `/api/auth/login` | Inicia sesión |
| POST | `/api/auth/refresh` | Renueva los tokens |
| GET | `/api/registros` | Lista registros con paginación, caché y eager loading |
| GET | `/api/registros/:id` | Consulta un registro |
| POST | `/api/registros` | Crea un registro |
| PATCH | `/api/registros/:id` | Actualiza parcialmente |
| PUT | `/api/registros/:id` | Reemplaza un registro |
| DELETE | `/api/registros/:id` | Realiza eliminación lógica |
| PATCH | `/api/registros/:id/validacion` | Aprueba o rechaza un registro |
| POST | `/api/sync/lotes` | Encola un lote y responde HTTP 202 |
| GET | `/api/sync/lotes/:id` | Consulta el estado del worker |
| GET | `/api/admin/usuarios` | Lista usuarios para el rol administrador |

## Resultados de la Semana 8

En las pruebas realizadas:

- Tiempo inicial aproximado: **20,623 ms**.
- Consulta con CACHE MISS: **2,196 ms**.
- Consulta con CACHE HIT: **0,474 ms**.
- Reducción aproximada con HIT: **97,70 %**.
- Aceleración aproximada: **43,51 veces**.

Los tiempos pueden variar según el equipo y la ejecución.

## Seguridad

- El archivo `.env` no debe subirse al repositorio.
- Los secretos JWT y la contraseña de demostración se leen desde variables de entorno.
- No deben publicarse tokens, contraseñas reales ni capturas con información sensible.
- Las contraseñas se almacenan como hash de bcrypt.
- Las respuestas de usuario excluyen `password_hash`.

## Consideraciones académicas

La caché, los datos y la cola están implementados en memoria para demostrar los conceptos solicitados. En un entorno productivo se recomienda usar una base de datos persistente, Redis/BullMQ o RabbitMQ, políticas CORS específicas, registros estructurados y pruebas automatizadas.

## Autora

**Beivy Amarilis Rivera Vergara**  
Asignatura: Aplicaciones Móviles  
Proyecto integrador: BioSacha
