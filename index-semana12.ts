import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

const app = express();
const PORT = Number(process.env.PORT || 3000);

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

app.use(cors());
app.use(express.json());


// ==========================================================
// SEMANA 12 - SEGURIDAD Y SESION
// ==========================================================

function obtenerVariableEntorno(nombre: string): string {
  const valor = process.env[nombre];

  if (!valor) {
    throw new Error(`Falta la variable de entorno obligatoria: ${nombre}`);
  }

  return valor;
}

const JWT_ACCESS_SECRET = obtenerVariableEntorno("JWT_ACCESS_SECRET");
const JWT_REFRESH_SECRET = obtenerVariableEntorno("JWT_REFRESH_SECRET");

function generarTokensSemana12(usuario: {
  id_usuario: number;
  rol: string;
}) {
  const payload = {
    sub: String(usuario.id_usuario),
    rol: usuario.rol,
  };

  const access_token = jwt.sign(
    payload,
    JWT_ACCESS_SECRET,
    { expiresIn: "15m" }
  );

  const refresh_token = jwt.sign(
    payload,
    JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  return {
    token_type: "Bearer",
    access_token,
    refresh_token,
    expires_in: "15m",
  };
}


app.get("/api/health", async (_req, res) => {
  const usuarios = await prisma.usuario.count();

  res.json({
    exito: true,
    servicio: "BioSacha API",
    base_datos: "PostgreSQL",
    estado: "activo",
    usuarios,
  });
});


// ===== SEMANA 12 - POST OFFLINE OUTBOX =====
app.post("/api/registros", async (req, res) => {
  try {
    const local_uuid = String(req.body?.local_uuid ?? "").trim();

    if (!local_uuid) {
      return res.status(422).json({
        exito: false,
        mensaje: "local_uuid es obligatorio"
      });
    }

    const existente = await prisma.registroBotanico.findUnique({
      where: { local_uuid }
    });

    if (existente) {
      return res.status(200).json({
        exito: true,
        datos: existente,
        mensaje: "Registro ya sincronizado; duplicado evitado"
      });
    }

    const registro = await prisma.registroBotanico.create({
      data: {
        local_uuid,
        id_planta: Number(req.body?.id_planta ?? 1),
        id_usuario: Number(req.body?.id_usuario ?? 2),
        id_comunidad: Number(req.body?.id_comunidad ?? 1),
        fecha_registro: new Date(
          req.body?.fecha_registro ??
          req.body?.creado_local_en ??
          Date.now()
        ),
        latitud: Number(req.body?.latitud ?? -0.4629),
        longitud: Number(req.body?.longitud ?? -76.9872),
        altitud_m: Number(req.body?.altitud_m ?? 250),
        precision_gps_m: Number(req.body?.precision_gps_m ?? 5),
        habitat: String(
          req.body?.habitat ??
          "Registro sincronizado desde BioSacha móvil"
        ),
        estado_sync: "sincronizado",
        estado_validacion: "pendiente",
        eliminado: false
      }
    });

    return res.status(201).json({
      exito: true,
      datos: registro,
      mensaje: "Registro sincronizado correctamente con PostgreSQL"
    });

  } catch (error) {
    console.error("POST /api/registros:", error);

    return res.status(500).json({
      exito: false,
      mensaje: "No fue posible persistir el registro"
    });
  }
});


app.get("/api/registros", async (_req, res) => {
  try {
    const registros = await prisma.registroBotanico.findMany({
      where: {
        eliminado: false,
      },
      include: {
        planta: true,
        comunidad: true,
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
            correo: true,
            rol: true,
            activo: true,
          },
        },
      },
      orderBy: {
        id_registro: "desc",
      },
    });

    res.json({
      exito: true,
      total: registros.length,
      datos: registros,
      mensaje: "Registros obtenidos desde PostgreSQL",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      exito: false,
      mensaje: "Error consultando PostgreSQL",
    });
  }
});


// ==========================================================
// SEMANA 12 - AUTENTICACION POSTGRESQL + PRISMA
// ==========================================================

app.post("/api/auth/login", async (req, res) => {
  try {
    const { correo, password } = req.body ?? {};

    if (!correo || !password) {
      return res.status(400).json({
        exito: false,
        mensaje: "Correo y contraseña son obligatorios",
      });
    }

    const usuario = await prisma.usuario.findFirst({
      where: {
        correo,
        activo: true,
      },
    });

    if (!usuario) {
      return res.status(401).json({
        exito: false,
        mensaje: "Credenciales incorrectas",
      });
    }

    const passwordCorrecto = await bcrypt.compare(
      password,
      usuario.password_hash
    );

    if (!passwordCorrecto) {
      return res.status(401).json({
        exito: false,
        mensaje: "Credenciales incorrectas",
      });
    }

    const tokens = generarTokensSemana12(usuario);

    return res.status(200).json({
      exito: true,
      datos: {
        usuario: {
          id_usuario: usuario.id_usuario,
          nombre: usuario.nombre,
          correo: usuario.correo,
          rol: usuario.rol,
          activo: usuario.activo,
        },
        tokens,
      },
      mensaje: "Inicio de sesión exitoso",
    });
  } catch (error) {
    console.error("Error en login:", error);

    return res.status(500).json({
      exito: false,
      mensaje: "Error procesando el inicio de sesión",
    });
  }
});


app.post("/api/auth/refresh", async (req, res) => {
  try {
    const { refresh_token } = req.body ?? {};

    if (!refresh_token) {
      return res.status(401).json({
        exito: false,
        mensaje: "Refresh token no proporcionado",
      });
    }

    const payload = jwt.verify(
      refresh_token,
      JWT_REFRESH_SECRET
    ) as jwt.JwtPayload;

    const usuario = await prisma.usuario.findFirst({
      where: {
        id_usuario: Number(payload.sub),
        activo: true,
      },
    });

    if (!usuario) {
      return res.status(401).json({
        exito: false,
        mensaje: "Usuario no válido",
      });
    }

    const tokens = generarTokensSemana12(usuario);

    return res.status(200).json({
      exito: true,
      datos: {
        tokens,
      },
      mensaje: "Token renovado correctamente",
    });
  } catch {
    return res.status(401).json({
      exito: false,
      mensaje: "Refresh token vencido o inválido",
    });
  }
});


app.get("/api/auth/me", async (req, res) => {
  try {
    const authorization =
      req.headers.authorization ?? "";

    const [tipo, token] = authorization.split(" ");

    if (tipo !== "Bearer" || !token) {
      return res.status(401).json({
        exito: false,
        mensaje: "Token no proporcionado",
      });
    }

    const payload = jwt.verify(
      token,
      JWT_ACCESS_SECRET
    ) as jwt.JwtPayload;

    const usuario = await prisma.usuario.findFirst({
      where: {
        id_usuario: Number(payload.sub),
        activo: true,
      },
      select: {
        id_usuario: true,
        nombre: true,
        correo: true,
        rol: true,
        activo: true,
      },
    });

    if (!usuario) {
      return res.status(401).json({
        exito: false,
        mensaje: "Sesión no válida",
      });
    }

    return res.status(200).json({
      exito: true,
      datos: {
        usuario,
      },
      mensaje: "Sesión válida",
    });
  } catch {
    return res.status(401).json({
      exito: false,
      mensaje: "Token vencido o inválido",
    });
  }
});


app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ BioSacha Semana 12 ejecutándose en http://localhost:${PORT}`);
  console.log("✅ Backend conectado a PostgreSQL");
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
