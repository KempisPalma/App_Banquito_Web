
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Error: SUPABASE_URL or SUPABASE_KEY are missing in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
    console.log("Connecting to Supabase...");
    
    // Fetch all columns for the admin user
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', 'adminkem');

    if (error) {
        console.error("Error fetching users:", error);
        return;
    }

    if (users.length === 0) {
        console.log("User 'adminkem' not found.");
        // Try listing all users to see what's there
        const { data: allUsers } = await supabase.from('users').select('username');
        console.log("All usernames:", allUsers?.map(u => u.username));
    } else {
        console.log("User found:", users[0]);
        console.log("Keys:", Object.keys(users[0]));
        console.log("Active value:", users[0].active);
    }
}

checkUsers();
