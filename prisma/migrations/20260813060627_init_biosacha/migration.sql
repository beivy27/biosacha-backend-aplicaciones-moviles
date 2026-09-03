-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('comunitario', 'tecnico', 'validador', 'admin');

-- CreateEnum
CREATE TYPE "EstadoTaxonomico" AS ENUM ('pendiente', 'validada', 'rechazada');

-- CreateEnum
CREATE TYPE "EstadoSync" AS ENUM ('pendiente', 'enviado', 'sincronizado', 'error');

-- CreateEnum
CREATE TYPE "EstadoValidacion" AS ENUM ('borrador', 'pendiente', 'aprobado', 'rechazado');

-- CreateEnum
CREATE TYPE "EstadoLote" AS ENUM ('en_cola', 'procesando', 'completado', 'error');

-- CreateTable
CREATE TABLE "usuarios" (
    "id_usuario" SERIAL NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "correo" VARCHAR(180) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'comunitario',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "plantas" (
    "id_planta" SERIAL NOT NULL,
    "nombre_cientifico" VARCHAR(180) NOT NULL,
    "nombre_local_principal" VARCHAR(120) NOT NULL,
    "estado_taxonomico" "EstadoTaxonomico" NOT NULL DEFAULT 'pendiente',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantas_pkey" PRIMARY KEY ("id_planta")
);

-- CreateTable
CREATE TABLE "comunidades" (
    "id_comunidad" SERIAL NOT NULL,
    "nombre" VARCHAR(160) NOT NULL,
    "provincia" VARCHAR(80) NOT NULL,
    "idioma_predominante" VARCHAR(80) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comunidades_pkey" PRIMARY KEY ("id_comunidad")
);

-- CreateTable
CREATE TABLE "registros_botanicos" (
    "id_registro" SERIAL NOT NULL,
    "local_uuid" VARCHAR(100) NOT NULL,
    "id_planta" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_comunidad" INTEGER NOT NULL,
    "fecha_registro" TIMESTAMP(3) NOT NULL,
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,
    "altitud_m" INTEGER,
    "precision_gps_m" DOUBLE PRECISION,
    "habitat" VARCHAR(500) NOT NULL,
    "estado_sync" "EstadoSync" NOT NULL DEFAULT 'pendiente',
    "estado_validacion" "EstadoValidacion" NOT NULL DEFAULT 'borrador',
    "eliminado" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registros_botanicos_pkey" PRIMARY KEY ("id_registro")
);

-- CreateTable
CREATE TABLE "lotes_sincronizacion" (
    "id_lote" UUID NOT NULL,
    "id_usuario" INTEGER,
    "estado" "EstadoLote" NOT NULL DEFAULT 'en_cola',
    "total_registros" INTEGER NOT NULL DEFAULT 0,
    "registros_procesados" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB,
    "error" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_inicio_proceso" TIMESTAMP(3),
    "fecha_fin" TIMESTAMP(3),

    CONSTRAINT "lotes_sincronizacion_pkey" PRIMARY KEY ("id_lote")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "plantas_nombre_cientifico_key" ON "plantas"("nombre_cientifico");

-- CreateIndex
CREATE UNIQUE INDEX "registros_botanicos_local_uuid_key" ON "registros_botanicos"("local_uuid");

-- CreateIndex
CREATE INDEX "registros_botanicos_id_planta_idx" ON "registros_botanicos"("id_planta");

-- CreateIndex
CREATE INDEX "registros_botanicos_id_usuario_idx" ON "registros_botanicos"("id_usuario");

-- CreateIndex
CREATE INDEX "registros_botanicos_id_comunidad_idx" ON "registros_botanicos"("id_comunidad");

-- CreateIndex
CREATE INDEX "registros_botanicos_estado_validacion_idx" ON "registros_botanicos"("estado_validacion");

-- CreateIndex
CREATE INDEX "lotes_sincronizacion_id_usuario_idx" ON "lotes_sincronizacion"("id_usuario");

-- CreateIndex
CREATE INDEX "lotes_sincronizacion_estado_idx" ON "lotes_sincronizacion"("estado");

-- AddForeignKey
ALTER TABLE "registros_botanicos" ADD CONSTRAINT "registros_botanicos_id_planta_fkey" FOREIGN KEY ("id_planta") REFERENCES "plantas"("id_planta") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_botanicos" ADD CONSTRAINT "registros_botanicos_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_botanicos" ADD CONSTRAINT "registros_botanicos_id_comunidad_fkey" FOREIGN KEY ("id_comunidad") REFERENCES "comunidades"("id_comunidad") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lotes_sincronizacion" ADD CONSTRAINT "lotes_sincronizacion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;
