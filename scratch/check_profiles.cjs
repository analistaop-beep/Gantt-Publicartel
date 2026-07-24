const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://cmtlweqtmmlyelcvqfkx.supabase.co', 'sb_publishable_CXZuN4NwZxN8wwC_8n-wAA_Ys9B9nBD');

async function checkProfilesSchema() {
    try {
        const { data, error } = await supabase.from('profiles').select('*').limit(1);
        if (error) {
            console.error("Supabase error:", error);
        } else {
            console.log("Schema row:", data);
        }
    } catch (e) {
        console.error("Unexpected error:", e);
    }
}

checkProfilesSchema();
