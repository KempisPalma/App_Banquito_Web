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

async function checkAndFixUserMemberId() {
    console.log("Checking users and members...\n");

    // Get all users
    const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*');

    if (usersError) {
        console.error("Error fetching users:", usersError);
        return;
    }

    // Get all members
    const { data: members, error: membersError } = await supabase
        .from('members')
        .select('*');

    if (membersError) {
        console.error("Error fetching members:", membersError);
        return;
    }

    console.log(`Found ${users.length} users and ${members.length} members\n`);

    for (const user of users) {
        console.log(`\nUser: ${user.username} (${user.name})`);
        console.log(`  Role: ${user.role}`);
        console.log(`  Current member_id: ${user.member_id || 'NULL'}`);

        if (user.role === 'socio' && !user.member_id) {
            // Try to find matching member by name
            const matchingMember = members.find(m =>
                m.name.toLowerCase() === user.name.toLowerCase()
            );

            if (matchingMember) {
                console.log(`  ✅ Found matching member: ${matchingMember.name} (${matchingMember.id})`);
                console.log(`  Updating user with member_id...`);

                const { error: updateError } = await supabase
                    .from('users')
                    .update({ member_id: matchingMember.id })
                    .eq('id', user.id);

                if (updateError) {
                    console.error(`  ❌ Error updating:`, updateError);
                } else {
                    console.log(`  ✅ Updated successfully!`);
                }
            } else {
                console.log(`  ⚠️  No matching member found for user "${user.name}"`);
            }
        } else if (user.role === 'socio' && user.member_id) {
            const member = members.find(m => m.id === user.member_id);
            if (member) {
                console.log(`  ✅ Already linked to member: ${member.name}`);
            } else {
                console.log(`  ⚠️  member_id exists but member not found!`);
            }
        }
    }

    console.log("\n✅ Done!");
}

checkAndFixUserMemberId();
