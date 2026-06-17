const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://cmtlweqtmmlyelcvqfkx.supabase.co', 'sb_publishable_CXZuN4NwZxN8wwC_8n-wAA_Ys9B9nBD');

async function test() {
    const { data, error } = await supabase.from('tasks').select('*').limit(1);
    console.log(JSON.stringify(data, null, 2));
    console.log("ERROR:", error);
}
test();
