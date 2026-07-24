-- Crear o actualizar tabla soportes
CREATE TABLE IF NOT EXISTS public.soportes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL,
    numero TEXT NOT NULL,
    ubicacion TEXT,
    ruta TEXT,
    localidad TEXT,
    ficha TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Si la tabla ya existía sin la columna localidad:
ALTER TABLE public.soportes ADD COLUMN IF NOT EXISTS localidad TEXT;

-- Habilitar RLS
ALTER TABLE public.soportes ENABLE ROW LEVEL SECURITY;

-- Política: usuarios autenticados pueden hacer todo
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'soportes' AND policyname = 'Authenticated full access'
    ) THEN
        CREATE POLICY "Authenticated full access"
        ON public.soportes
        FOR ALL
        USING (auth.role() = 'authenticated')
        WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;
