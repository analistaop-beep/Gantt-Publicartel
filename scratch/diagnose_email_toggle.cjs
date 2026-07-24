// Diagnóstico: simula exactamente lo que hace el store con la key anon
// Para ver si hay diferencia entre update con anon key vs authenticated session
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://cmtlweqtmmlyelcvqfkx.supabase.co';
const SUPABASE_ANON = 'sb_publishable_CXZuN4NwZxN8wwC_8n-wAA_Ys9B9nBD';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

async function diagnose() {
    // 1. Leer estado actual
    const { data: before, error: readErr } = await supabase.from('profiles').select('*').limit(1);
    if (readErr) { console.error('Error leyendo:', readErr.message); return; }
    const profile = before[0];
    console.log('\nEstado actual del perfil:');
    console.log('  email_notifications:', profile.email_notifications, '(tipo:', typeof profile.email_notifications, ')');

    // 2. Intentar update a false (igual a lo que hace el store)
    console.log('\n--- Intentando update email_notifications = false ---');
    const { data: updateData, error: updateErr, status, statusText } = await supabase
        .from('profiles')
        .update({ email_notifications: false })
        .eq('id', profile.id)
        .select(); // Añadir .select() para ver el resultado real

    console.log('Status HTTP:', status, statusText);
    if (updateErr) {
        console.error('❌ Error en update:', updateErr.message, updateErr.code);
    } else {
        console.log('Resultado del update:', JSON.stringify(updateData));
    }

    // 3. Leer de nuevo para ver el valor guardado
    const { data: after } = await supabase.from('profiles').select('*').eq('id', profile.id);
    console.log('\nValor en DB después del update:');
    console.log('  email_notifications:', after?.[0]?.email_notifications, '(tipo:', typeof after?.[0]?.email_notifications, ')');

    // 4. Revertir a true
    await supabase.from('profiles').update({ email_notifications: true }).eq('id', profile.id);
    console.log('\n✅ Revertido a true.');
}

diagnose();
