-- Ejecutar en el SQL Editor de Supabase
-- Agrega las columnas opId y opNumber a la tabla notifications

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS "opId" TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS "opNumber" TEXT DEFAULT NULL;
