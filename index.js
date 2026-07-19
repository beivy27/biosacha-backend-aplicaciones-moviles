require("dotenv").config();

const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

const variablesRequeridas = {
  JWT_ACCESS_SECRET: ACCESS_SECRET,
  JWT_REFRESH_SECRET: REFRESH_SECRET,
  DEMO_PASSWORD
};

const variablesFaltantes = Object.entries(variablesRequeridas)
  .filter(([, valor]) => !valor)
  .map(([nombre]) => nombre);

if (variablesFaltantes.length > 0) {
  throw new Error(
    `Faltan variables de entorno obligatorias: ${variablesFaltantes.join(", ")}`
  );
}

app.use(cors());
app.use(express.json());

const rolesPermitidos = ["comunitario", "tecnico", "validador", "admin"];
const refreshTokensValidos = new Set();

let usuarios = [
  {
    id_usuario: 1,
    nombre: "Administrador BioSacha",
    correo: "admin@biosacha.local",
    password_hash: bcrypt.hashSync(DEMO_PASSWORD, 10),
    rol: "admin",
    activo: true
  },
  {
    id_usuario: 2,
    nombre: "Validador Técnico",
    correo: "validador@biosacha.local",
    password_hash: bcrypt.hashSync(DEMO_PASSWORD, 10),
    rol: "validador",
    activo: true
  },
  {
    id_usuario: 3,
    nombre: "Usuario Comunitario",
    correo: "comunitario@biosacha.local",
    password_hash: bcrypt.hashSync(DEMO_PASSWORD, 10),
    rol: "comunitario",
    activo: true
  }
];

let registros = [
  {
    id_registro: 1,
    local_uuid: "demo-001",
    id_planta: 1,
    id_usuario: 3,
    id_comunidad: 1,
    fecha_registro: "2026-07-03T10:00:00Z",
    latitud: -1.492,
    longitud: -78.002,
    altitud_m: 950,
    precision_gps_m: 5,
    habitat: "Bosque húmedo amazónico cercano a sendero comunitario.",
    estado_sync: "enviado",
    estado_validacion: "borrador",
    eliminado: false
  }
];

function respuestaExito(res, status, datos, mensaje) {
  return res.status(status).json({ exito: true, datos, mensaje });
}

function respuestaError(res, status, errores, mensaje) {
  return res.status(status).json({ exito: false, errores, mensaje });
}

function ocultarPassword(usuario) {
  const { password_hash, ...seguro } = usuario;
  return seguro;
}

function correoValido(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

function generarTokens(usuario) {
  const payload = {
    sub: String(usuario.id_usuario),
    rol: usuario.rol
  };

  const access_token = jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m"
  });

  const refresh_token = jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d"
  });

  refreshTokensValidos.add(refresh_token);

  return {
    token_type: "Bearer",
    access_token,
    refresh_token,
    expires_in: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m"
  };
}

function autenticar(req, res, next) {
  const header = req.headers.authorization || "";
  const [tipo, token] = header.split(" ");

  if (tipo !== "Bearer" || !token) {
    return respuestaError(
      res,
      401,
      [{ campo: "authorization", mensaje: "Token no proporcionado" }],
      "No autenticado"
    );
  }

  try {
    const payload = jwt.verify(token, ACCESS_SECRET);
    const usuario = usuarios.find(
      (u) => u.id_usuario === Number(payload.sub) && u.activo
    );

    if (!usuario) {
      return respuestaError(
        res,
        401,
        [{ campo: "usuario", mensaje: "Usuario no válido o inactivo" }],
        "No autenticado"
      );
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    const mensaje =
      error.name === "TokenExpiredError" ? "Token vencido" : "Token inválido";

    return respuestaError(
      res,
      401,
      [{ campo: "authorization", mensaje }],
      "No autenticado"
    );
  }
}

function autorizarRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.usuario.rol)) {
      return respuestaError(
        res,
        403,
        [{ campo: "rol", mensaje: "Rol insuficiente para ejecutar esta operación" }],
        "No autorizado"
      );
    }
    next();
  };
}

function puedeGestionarRegistro(usuario, registro) {
  return usuario.rol === "admin" || registro.id_usuario === usuario.id_usuario;
}

function validarRegistro(body, parcial = false) {
  const errores = [];
  const obligatorios = [
    "local_uuid",
    "id_planta",
    "id_comunidad",
    "fecha_registro",
    "latitud",
    "longitud",
    "habitat"
  ];

  if (!parcial) {
    obligatorios.forEach((campo) => {
      if (body[campo] === undefined || body[campo] === null || body[campo] === "") {
        errores.push({ campo, mensaje: "El campo es obligatorio" });
      }
    });
  }

  if (body.id_planta !== undefined && !Number.isInteger(Number(body.id_planta))) {
    errores.push({ campo: "id_planta", mensaje: "Debe ser un número entero" });
  }

  if (body.id_comunidad !== undefined && !Number.isInteger(Number(body.id_comunidad))) {
    errores.push({ campo: "id_comunidad", mensaje: "Debe ser un número entero" });
  }

  if (body.latitud !== undefined) {
    const lat = Number(body.latitud);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      errores.push({ campo: "latitud", mensaje: "Debe estar entre -90 y 90" });
    }
  }

  if (body.longitud !== undefined) {
    const lon = Number(body.longitud);
    if (Number.isNaN(lon) || lon < -180 || lon > 180) {
      errores.push({ campo: "longitud", mensaje: "Debe estar entre -180 y 180" });
    }
  }

  if (body.fecha_registro !== undefined) {
    const fecha = new Date(body.fecha_registro);
    if (Number.isNaN(fecha.getTime())) {
      errores.push({ campo: "fecha_registro", mensaje: "Debe tener formato de fecha válido" });
    } else if (fecha > new Date()) {
      errores.push({ campo: "fecha_registro", mensaje: "No puede ser posterior a la fecha actual" });
    }
  }

  if (body.habitat !== undefined) {
    if (typeof body.habitat !== "string" || body.habitat.length < 10 || body.habitat.length > 500) {
      errores.push({ campo: "habitat", mensaje: "Debe tener entre 10 y 500 caracteres" });
    }
  }

  return errores;
}

app.get("/api/health", (req, res) => {
  respuestaExito(
    res,
    200,
    { servicio: "BioSacha API segura", estado: "activo" },
    "Backend seguro funcionando correctamente"
  );
});

app.post("/api/auth/register", async (req, res) => {
  const { nombre, correo, password, rol = "comunitario" } = req.body;
  const errores = [];

  if (!nombre || nombre.length < 3) {
    errores.push({ campo: "nombre", mensaje: "El nombre es obligatorio y debe tener al menos 3 caracteres" });
  }

  if (!correo || !correoValido(correo)) {
    errores.push({ campo: "correo", mensaje: "Correo electrónico inválido" });
  }

  if (!password || password.length < 8) {
    errores.push({ campo: "password", mensaje: "La contraseña debe tener al menos 8 caracteres" });
  }

  if (!rolesPermitidos.includes(rol)) {
    errores.push({ campo: "rol", mensaje: "Rol no permitido" });
  }

  if (errores.length > 0) {
    return respuestaError(res, 422, errores, "Los datos enviados no son válidos");
  }

  const existe = usuarios.find((u) => u.correo === correo);
  if (existe) {
    return respuestaError(
      res,
      409,
      [{ campo: "correo", mensaje: "Ya existe un usuario con este correo" }],
      "Conflicto por usuario duplicado"
    );
  }

  const nuevoUsuario = {
    id_usuario: usuarios.length + 1,
    nombre,
    correo,
    password_hash: await bcrypt.hash(password, 10),
    rol,
    activo: true
  };

  usuarios.push(nuevoUsuario);

  respuestaExito(
    res,
    201,
    ocultarPassword(nuevoUsuario),
    "Usuario registrado correctamente"
  );
});

app.post("/api/auth/login", async (req, res) => {
  const { correo, password } = req.body;

  if (!correo || !password) {
    return respuestaError(
      res,
      400,
      [{ campo: "credenciales", mensaje: "Correo y contraseña son obligatorios" }],
      "Solicitud incompleta"
    );
  }

  const usuario = usuarios.find((u) => u.correo === correo && u.activo);
  if (!usuario) {
    return respuestaError(
      res,
      401,
      [{ campo: "credenciales", mensaje: "Credenciales incorrectas" }],
      "No autenticado"
    );
  }

  const passwordCorrecto = await bcrypt.compare(password, usuario.password_hash);
  if (!passwordCorrecto) {
    return respuestaError(
      res,
      401,
      [{ campo: "credenciales", mensaje: "Credenciales incorrectas" }],
      "No autenticado"
    );
  }

  const tokens = generarTokens(usuario);

  respuestaExito(
    res,
    200,
    { usuario: ocultarPassword(usuario), tokens },
    "Inicio de sesión exitoso"
  );
});

app.post("/api/auth/refresh", (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return respuestaError(
      res,
      401,
      [{ campo: "refresh_token", mensaje: "Token de actualización no proporcionado" }],
      "No autenticado"
    );
  }

  if (!refreshTokensValidos.has(refresh_token)) {
    return respuestaError(
      res,
      401,
      [{ campo: "refresh_token", mensaje: "Token de actualización no reconocido" }],
      "No autenticado"
    );
  }

  try {
    const payload = jwt.verify(refresh_token, REFRESH_SECRET);
    const usuario = usuarios.find((u) => u.id_usuario === Number(payload.sub) && u.activo);

    if (!usuario) {
      return respuestaError(
        res,
        401,
        [{ campo: "usuario", mensaje: "Usuario no válido" }],
        "No autenticado"
      );
    }

    refreshTokensValidos.delete(refresh_token);
    const tokens = generarTokens(usuario);

    return respuestaExito(res, 200, { tokens }, "Token renovado correctamente");
  } catch (error) {
    return respuestaError(
      res,
      401,
      [{ campo: "refresh_token", mensaje: "Token vencido o inválido" }],
      "No autenticado"
    );
  }
});

app.get("/api/registros", autenticar, (req, res) => {
  const pagina = Number(req.query.pagina || 1);
  const limite = Number(req.query.limite || 10);

  let visibles = registros.filter((r) => !r.eliminado);

  if (req.usuario.rol === "comunitario") {
    visibles = visibles.filter((r) => r.id_usuario === req.usuario.id_usuario);
  }

  const inicio = (pagina - 1) * limite;
  const datos = visibles.slice(inicio, inicio + limite);

  respuestaExito(
    res,
    200,
    {
      registros: datos,
      paginacion: {
        paginaActual: pagina,
        limite,
        totalRegistros: visibles.length,
        totalPaginas: Math.ceil(visibles.length / limite)
      }
    },
    "Registros consultados correctamente"
  );
});

app.get("/api/registros/:id", autenticar, (req, res) => {
  const id = Number(req.params.id);
  const registro = registros.find((r) => r.id_registro === id && !r.eliminado);

  if (!registro) {
    return respuestaError(
      res,
      404,
      [{ campo: "id", mensaje: "Registro no encontrado" }],
      "Recurso no encontrado"
    );
  }

  if (!puedeGestionarRegistro(req.usuario, registro) && !["validador"].includes(req.usuario.rol)) {
    return respuestaError(
      res,
      403,
      [{ campo: "usuario", mensaje: "No puede acceder a registros de otro usuario" }],
      "No autorizado"
    );
  }

    respuestaExito(res, 200, registro, "Registro consultado correctamente");
});

app.post(
  "/api/registros",
  autenticar,
  autorizarRoles("comunitario", "tecnico", "admin"),
  (req, res) => {
    const errores = validarRegistro(req.body);

    if (errores.length > 0) {
      return respuestaError(res, 422, errores, "Los datos enviados no son válidos");
    }

    const duplicado = registros.find((r) => r.local_uuid === req.body.local_uuid);
    if (duplicado) {
      return respuestaError(
        res,
        409,
        [{ campo: "local_uuid", mensaje: "Ya existe un registro con este identificador local" }],
        "Conflicto por registro duplicado"
      );
    }

    const nuevoRegistro = {
      id_registro: registros.length + 1,
      local_uuid: req.body.local_uuid || randomUUID(),
      id_planta: Number(req.body.id_planta),
      id_usuario: req.usuario.id_usuario,
      id_comunidad: Number(req.body.id_comunidad),
      fecha_registro: req.body.fecha_registro,
      latitud: Number(req.body.latitud),
      longitud: Number(req.body.longitud),
      altitud_m: req.body.altitud_m ? Number(req.body.altitud_m) : null,
      precision_gps_m: req.body.precision_gps_m ? Number(req.body.precision_gps_m) : null,
      habitat: req.body.habitat,
      estado_sync: "pendiente",
      estado_validacion: "borrador",
      eliminado: false
    };

    registros.push(nuevoRegistro);

    respuestaExito(res, 201, nuevoRegistro, "Registro botánico creado correctamente");
  }
);

app.patch(
  "/api/registros/:id",
  autenticar,
  autorizarRoles("comunitario", "tecnico", "admin"),
  (req, res) => {
    const id = Number(req.params.id);
    const registro = registros.find((r) => r.id_registro === id && !r.eliminado);

    if (!registro) {
      return respuestaError(res, 404, [{ campo: "id", mensaje: "Registro no encontrado" }], "Recurso no encontrado");
    }

    if (!puedeGestionarRegistro(req.usuario, registro)) {
      return respuestaError(
        res,
        403,
        [{ campo: "usuario", mensaje: "No puede modificar registros de otro usuario" }],
        "No autorizado"
      );
    }

    const errores = validarRegistro(req.body, true);
    if (errores.length > 0) {
      return respuestaError(res, 422, errores, "Los datos enviados no son válidos");
    }

    Object.assign(registro, req.body);

    respuestaExito(res, 200, registro, "Registro actualizado parcialmente");
  }
);

app.put(
  "/api/registros/:id",
  autenticar,
  autorizarRoles("comunitario", "tecnico", "admin"),
  (req, res) => {
    const id = Number(req.params.id);
    const registro = registros.find((r) => r.id_registro === id && !r.eliminado);

    if (!registro) {
      return respuestaError(res, 404, [{ campo: "id", mensaje: "Registro no encontrado" }], "Recurso no encontrado");
    }

    if (!puedeGestionarRegistro(req.usuario, registro)) {
      return respuestaError(
        res,
        403,
        [{ campo: "usuario", mensaje: "No puede reemplazar registros de otro usuario" }],
        "No autorizado"
      );
    }

    const errores = validarRegistro(req.body);
    if (errores.length > 0) {
      return respuestaError(res, 422, errores, "Los datos enviados no son válidos");
    }

    Object.assign(registro, {
      local_uuid: req.body.local_uuid,
      id_planta: Number(req.body.id_planta),
      id_comunidad: Number(req.body.id_comunidad),
      fecha_registro: req.body.fecha_registro,
      latitud: Number(req.body.latitud),
      longitud: Number(req.body.longitud),
      habitat: req.body.habitat
    });

    respuestaExito(res, 200, registro, "Registro reemplazado completamente");
  }
);

app.delete(
  "/api/registros/:id",
  autenticar,
  autorizarRoles("comunitario", "tecnico", "admin"),
  (req, res) => {
    const id = Number(req.params.id);
    const registro = registros.find((r) => r.id_registro === id && !r.eliminado);

    if (!registro) {
      return respuestaError(res, 404, [{ campo: "id", mensaje: "Registro no encontrado" }], "Recurso no encontrado");
    }

    if (!puedeGestionarRegistro(req.usuario, registro)) {
      return respuestaError(
        res,
        403,
        [{ campo: "usuario", mensaje: "No puede eliminar registros de otro usuario" }],
        "No autorizado"
      );
    }

    registro.eliminado = true;
    registro.fecha_eliminacion = new Date().toISOString();

    return res.status(204).send();
  }
);

app.patch(
  "/api/registros/:id/validacion",
  autenticar,
  autorizarRoles("validador", "admin"),
  (req, res) => {
    const id = Number(req.params.id);
    const registro = registros.find((r) => r.id_registro === id && !r.eliminado);

    if (!registro) {
      return respuestaError(res, 404, [{ campo: "id", mensaje: "Registro no encontrado" }], "Recurso no encontrado");
    }

    if (registro.id_usuario === req.usuario.id_usuario) {
      return respuestaError(
        res,
        403,
        [{ campo: "usuario", mensaje: "El usuario creador no puede aprobar su propio registro" }],
        "Regla de negocio incumplida"
      );
    }

    const estados = ["aprobado", "rechazado"];
    if (!estados.includes(req.body.estado_validacion)) {
      return respuestaError(
        res,
        422,
        [{ campo: "estado_validacion", mensaje: "Debe ser aprobado o rechazado" }],
        "Datos inválidos"
      );
    }

    registro.estado_validacion = req.body.estado_validacion;
    registro.comentario_validacion = req.body.comentario || null;
    registro.fecha_validacion = new Date().toISOString();
    registro.id_validador = req.usuario.id_usuario;

    respuestaExito(res, 200, registro, "Validación registrada correctamente");
  }
);

app.get("/api/admin/usuarios", autenticar, autorizarRoles("admin"), (req, res) => {
  respuestaExito(
    res,
    200,
    usuarios.map(ocultarPassword),
    "Usuarios consultados correctamente"
  );
});

app.use((req, res) => {
  respuestaError(
    res,
    404,
    [{ campo: "ruta", mensaje: "Endpoint no encontrado" }],
    "Recurso no encontrado"
  );
});

app.listen(PORT, () => {
  console.log(`BioSacha API segura ejecutándose en http://localhost:${PORT}`);
});
