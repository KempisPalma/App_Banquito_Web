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

async function linkLidiaUserToMember() {
    console.log("=== Linking Lidia User to Member ===\n");

    // Find Lidia user
    const { data: users } = await supabase
        .from('users')
        .select('*')
        .eq('username', 'Lidia');

    if (!users || users.length === 0) {
        console.error("❌ User 'Lidia' not found");
        return;
    }

    const lidiaUser = users[0];
    console.log(`Found user: ${lidiaUser.name} (${lidiaUser.username})`);
    console.log(`Current member_id: ${lidiaUser.member_id || 'NULL'}\n`);

    // Find Lidia member
    const { data: members } = await supabase
        .from('members')
        .select('*')
        .ilike('name', '%lidia%');

    if (!members || members.length === 0) {
        console.error("❌ No member with 'Lidia' in name found");
        return;
    }

    console.log(`Found ${members.length} member(s):`);
    members.forEach(m => console.log(`  - ${m.name} (ID: ${m.id})`));

    const lidiaMember = members[0];
    console.log(`\nLinking user to member: ${lidiaMember.name} (${lidiaMember.id})`);

    const { error } = await supabase
        .from('users')
        .update({ member_id: lidiaMember.id })
        .eq('id', lidiaUser.id);

    if (error) {
        console.error("❌ Error updating:", error);
    } else {
        console.log("✅ Successfully linked!");
        console.log(`\nUser '${lidiaUser.username}' now linked to member '${lidiaMember.name}'`);
        console.log("Please refresh the app to see the changes.");
    }
}

linkLidiaUserToMember();
