
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY are missing in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
    console.log("Connecting to Supabase at:", supabaseUrl);

    const { data: users, error } = await supabase
        .from('users')
        .select('id, username, name, role, active, password');

    if (error) {
        console.error("Error fetching users:", error.message);
        return;
    }

    console.log("\n--- Users Found in Database ---");
    if (users.length === 0) {
        console.log("No users found.");
    } else {
        console.table(users.map(u => ({
            username: u.username,
            role: u.role,
            active: u.active,
            // Show first/last char of password to verify match without fully revealing, or just length
            password_check: u.password ? `${u.password.substring(0, 1)}...${u.password.substring(u.password.length - 1)}` : 'NULL'
        })));
    }
}

checkUsers();
