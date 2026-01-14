
import { createClient } from '@supabase/supabase-js';

// Hardcoded from your .env verify
const supabaseUrl = 'https://sltufpairovzsiiowhdl.supabase.co';
const supabaseKey = 'sb_secret_xGQro7rOZC_ViBiI6LOfxA_J1ZuhMAp';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
    console.log("Connecting to Supabase...");

    // 1. List all users
    const { data: users, error } = await supabase
        .from('users')
        .select('id, username, password, role, active');

    if (error) {
        console.error("Error fetching users:", error.message);
        return;
    }

    console.log("Users found:", users.length);
    console.table(users);

    // 2. specifically check for 'adminkem'
    const adminUser = users.find(u => u.username === 'adminkem');
    if (adminUser) {
        console.log("\nFound 'adminkem' user:");
        console.log("ID:", adminUser.id);
        console.log("Password stored:", adminUser.password);
        console.log("Active:", adminUser.active);

        if (adminUser.password !== 'admin2025') {
            console.log("\nPassword mismatch! Updating password to 'admin2025'...");
            const { error: updateError } = await supabase
                .from('users')
                .update({ password: 'admin2025' })
                .eq('id', adminUser.id);

            if (updateError) {
                console.error("Failed to update password:", updateError.message);
            } else {
                console.log("Password updated successfully.");
            }
        } else {
            console.log("\nPassword matches 'admin2025'. Login *should* work if keys are correct.");
        }
    } else {
        console.log("\nUser 'adminkem' NOT FOUND.");
    }
}

checkUsers();
