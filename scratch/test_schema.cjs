const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://cmtlweqtmmlyelcvqfkx.supabase.co', 'sb_publishable_CXZuN4NwZxN8wwC_8n-wAA_Ys9B9nBD');

async function test() {
    const { data: members, error: fetchErr } = await supabase.from('members').select('*').limit(1);
    if (fetchErr) {
        console.error("Fetch Error:", fetchErr);
        return;
    }
    console.log("Member columns:", Object.keys(members[0] || {}));
}
test();
