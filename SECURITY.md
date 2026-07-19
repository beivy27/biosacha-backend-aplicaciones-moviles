# Política de seguridad

## Información que no debe publicarse

- Archivo `.env`.
- Secretos JWT.
- Contraseñas reales.
- Access tokens y refresh tokens.
- Datos personales o productivos.

## Configuración segura

El proyecto exige las variables `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` y `DEMO_PASSWORD`. Si falta alguna, la aplicación se detiene con un mensaje claro para evitar iniciar con una configuración insegura.

## Alcance

Este repositorio es una implementación académica. La caché, los usuarios, los registros y la cola de trabajo están almacenados en memoria.
