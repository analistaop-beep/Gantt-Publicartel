const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://cmtlweqtmmlyelcvqfkx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_CXZuN4NwZxN8wwC_8n-wAA_Ys9B9nBD'; // Note: User provided this key

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function migrate() {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data_dump.json'), 'utf8'));

    // Sequence matters for foreign keys
    const tables = ['teams', 'members', 'vehicles', 'tasks', 'task_members', 'task_vehicles', 'reminders'];

    for (const table of tables) {
        if (!data[table] || data[table].length === 0) {
            console.log(`Skipping table ${table} (no data)`);
            continue;
        }

        console.log(`Migrating ${data[table].length} rows for ${table}...`);
        
        // Map camelCase to table names if needed, but we used quoted camelCase in our SQL 
        // Better-sqlite3 gave us rows with camelCase keys already.
        
        const { error } = await supabase.from(table).insert(data[table]);
        
        if (error) {
            console.error(`Error migrating ${table}:`, error.message);
        } else {
            console.log(`Successfully migrated ${table}`);
        }
    }
}

migrate().catch(console.error);
