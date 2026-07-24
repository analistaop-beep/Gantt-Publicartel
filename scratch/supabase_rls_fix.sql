-- Permitir que cada usuario autenticado actualice únicamente su propia fila
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
