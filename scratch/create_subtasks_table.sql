-- ================================================================
-- TABLA: subtasks (Sub-tareas de Tareas Pendientes)
-- ================================================================

-- 1. Crear tabla de sub-tareas si no existe
CREATE TABLE IF NOT EXISTS public.subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Para realizar',
    date TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índice por task_id para acelerar las búsquedas por tarea
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON public.subtasks(task_id);

-- 3. Vincular Foreign Key con tasks (con eliminación en cascada)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_subtasks_task'
    ) THEN
        BEGIN
            ALTER TABLE public.subtasks 
            ADD CONSTRAINT fk_subtasks_task 
            FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'No se pudo vincular Foreign Key estricta por tipos, omitiendo constraint.';
        END;
    END IF;
END $$;

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

-- 5. Crear política de acceso para permitir lectura y escritura completa
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'subtasks' AND policyname = 'Allow full access to subtasks'
    ) THEN
        CREATE POLICY "Allow full access to subtasks"
        ON public.subtasks
        FOR ALL
        TO public
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;
