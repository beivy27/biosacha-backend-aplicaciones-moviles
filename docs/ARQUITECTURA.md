# Arquitectura resumida

## Flujo autenticado

1. El cliente inicia sesión.
2. El servidor compara la contraseña con bcrypt.
3. Se generan access token y refresh token.
4. El cliente envía `Authorization: Bearer <token>`.
5. El middleware valida el token y asigna `req.usuario`.
6. El middleware de roles autoriza o rechaza la operación.

## Flujo cache-aside

1. `GET /api/registros` construye una clave por rol, usuario, página y límite.
2. Si existe una entrada vigente, se devuelve CACHE HIT.
3. Si no existe, se procesan los datos y relaciones.
4. El resultado se guarda durante 60 segundos.
5. POST, PATCH, PUT, DELETE y validación invalidan la caché.

## Corrección N+1

Se recopilan los identificadores relacionados, se cargan planta, usuario y comunidad una sola vez y se construyen mapas para enriquecer la respuesta.

## Worker

1. El cliente envía un lote.
2. El endpoint responde HTTP 202.
3. El trabajo se agrega a la cola.
4. El worker procesa el lote en segundo plano.
5. El cliente consulta el estado mediante el identificador del lote.
