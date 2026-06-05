// Verify RLS fix works
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cmtlweqtmmlyelcvqfkx.supabase.co';
const supabaseKey = 'sb_publishable_CXZuN4NwZxN8wwC_8n-wAA_Ys9B9nBD';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const taskId = '24d5d40f-a8af-4032-8b45-2f73b8ea66b1';

    // Test UPDATE
    console.log('=== TEST UPDATE ===');
    const { data: updResult, error: updErr } = await supabase
        .from('tasks')
        .update({ date: '2026-06-09' })
        .eq('id', taskId)
        .select('id, date');
    console.log('Rows updated:', updResult?.length || 0);
    console.log('Result:', updResult);
    console.log('Error:', updErr);

    if (updResult?.length > 0) {
        console.log('✅ UPDATE FUNCIONA!');
        // Revert
        await supabase.from('tasks').update({ date: '' }).eq('id', taskId);
        console.log('Revertido a pendiente');
    } else {
        console.log('❌ UPDATE sigue sin funcionar');
    }

    // Test DELETE
    console.log('\n=== TEST DELETE ===');
    const testId = 'test-del-' + Date.now();
    await supabase.from('tasks').insert([{
        id: testId, opNumber: 'TEST', name: 'Del Test', client: 'Test',
        address: 'Test', date: '', totalHours: 1, duration: 1,
        type: 'pintura', section: 'Pintura', groupId: testId, additionalJobs: '[]'
    }]);
    const { data: delResult } = await supabase.from('tasks').delete().eq('id', testId).select();
    console.log('Rows deleted:', delResult?.length || 0);
    console.log(delResult?.length ? '✅ DELETE FUNCIONA!' : '❌ DELETE sigue sin funcionar');
}

test().catch(err => console.error('Error:', err));
