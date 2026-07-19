# Evolución semanal de BioSacha

## Semana 6 — API REST y reglas de negocio

Se desarrollaron operaciones CRUD para los registros botánicos, validaciones de datos, paginación, eliminación lógica, respuestas HTTP coherentes y restricciones para proteger la integridad de la información.

## Semana 7 — Seguridad y autenticación

Se incorporaron bcrypt para el tratamiento de contraseñas, JWT para access token y refresh token, middleware de autenticación, autorización por roles, protección de endpoints y reutilización de `req.usuario` durante cada solicitud.

## Semana 8 — Optimización del backend

Se diagnosticó `GET /api/registros`, se implementó caché cache-aside con TTL de 60 segundos, invalidación explícita, corrección del riesgo N+1 mediante carga agrupada, selección entre eager y lazy loading, y procesamiento asíncrono de lotes mediante cola y worker.

## Archivo final

`index-semana8-final.js` integra el trabajo acumulado y es el punto de entrada configurado en `package.json`.
