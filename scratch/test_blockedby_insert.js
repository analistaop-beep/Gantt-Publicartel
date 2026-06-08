import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env manually
const envPath = path.resolve('.env');
const envConfig = fs.readFileSync(envPath, 'utf-8');
const env = {};
envConfig.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.from('tasks').insert([{
    id: 'test-id-xyz',
    opNumber: 'TEST',
    name: 'TEST TASK',
    client: 'TEST CLIENT',
    address: 'TEST ADDRESS',
    date: '',
    totalHours: 0,
    duration: 0,
    blockedBy: 'some-task-id' // testing if this fails
  }]);
  if (error) {
    console.error('Failed to insert with blockedBy:', error.message);
  } else {
    console.log('Success! Data:', data);
    // Cleanup
    await supabase.from('tasks').delete().eq('id', 'test-id-xyz');
  }
}

test();
