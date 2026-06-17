const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://cmtlweqtmmlyelcvqfkx.supabase.co', 'sb_publishable_CXZuN4NwZxN8wwC_8n-wAA_Ys9B9nBD');

async function test() {
    const { data, error } = await supabase.from('tasks').update({ realHours: 5 }).eq('id', '47582d63-6afd-4233-8cc6-4b42bcd201d0');
    console.log("UPDATE ERROR:", error);
}
test();
