const { createClient } = require('@supabase/supabase-js');

// Use service role key to bypass RLS for diagnostics
// NOTE: Replace with actual service role key from Supabase dashboard > Settings > API
const SUPABASE_URL = 'https://cmtlweqtmmlyelcvqfkx.supabase.co';
const SUPABASE_ANON = 'sb_publishable_CXZuN4NwZxN8wwC_8n-wAA_Ys9B9nBD';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

async function diagnose() {
    console.log('\n=== 1. Verificando si la columna email_notifications existe ===');
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) {
        console.error('Error leyendo profiles:', error.message);
    } else {
        console.log('Columnas disponibles en profiles:', Object.keys(data[0] || {}));
        const hasColumn = data[0] && 'email_notifications' in data[0];
        console.log('¿Columna email_notifications existe?:', hasColumn ? '✅ SÍ' : '❌ NO — debes ejecutar el SQL en Supabase');
    }

    console.log('\n=== 2. Verificando RLS: intento de update con anon key ===');
    if (data && data[0]) {
        const profileId = data[0].id;
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ email_notifications: true })
            .eq('id', profileId);
        if (updateError) {
            console.error('Error al actualizar con anon key:', updateError.message);
            console.log('→ La política RLS está bloqueando los updates. Debes agregar una política en Supabase.');
        } else {
            console.log('✅ Update con anon key funcionó correctamente.');
        }
    }
}

diagnose();
