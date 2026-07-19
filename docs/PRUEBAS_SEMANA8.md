# Pruebas funcionales de la Semana 8

Las pruebas pueden realizarse con cURL, Postman o Insomnia.

## 1. Salud del servidor

```bash
curl http://localhost:3000/api/health
```

## 2. Inicio de sesión

Use la misma contraseña configurada en `DEMO_PASSWORD`.

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "correo": "admin@biosacha.local",
    "password": "CONTRASENA_CONFIGURADA_EN_DEMO_PASSWORD"
  }'
```

## 3. Ruta protegida sin token

```bash
curl http://localhost:3000/api/registros
```

Resultado esperado: HTTP 401.

## 4. Caché

Realice dos solicitudes consecutivas autenticadas a:

```text
GET /api/registros?page=1&limit=10
```

La primera debe indicar `MISS` y la segunda `HIT`.

## 5. Invalidación

1. Consulte el listado hasta obtener HIT.
2. Modifique un registro mediante PATCH.
3. Consulte nuevamente el listado.
4. El resultado debe volver a MISS y la siguiente consulta a HIT.

## 6. Worker

Envíe un lote mediante `POST /api/sync/lotes`. La respuesta debe ser HTTP 202. Consulte después `GET /api/sync/lotes/:id` hasta observar el estado `completado`.
