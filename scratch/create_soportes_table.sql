-- Crear tabla soportes
CREATE TABLE IF NOT EXISTS public.soportes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL,
    numero TEXT NOT NULL,
    ubicacion TEXT,
    ruta TEXT,
    ficha TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.soportes ENABLE ROW LEVEL SECURITY;

-- Política: usuarios autenticados pueden hacer todo
CREATE POLICY "Authenticated full access"
ON public.soportes
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
