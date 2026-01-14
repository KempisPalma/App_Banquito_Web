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

async function debugSocioSavings() {
    console.log("=== Debugging Socio Savings ===\n");

    // Get user Lidia
    const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('username', 'Lidia');

    if (usersError || !users || users.length === 0) {
        console.error("Error fetching user Lidia:", usersError);
        return;
    }

    const lidiaUser = users[0];
    console.log("User Lidia:");
    console.log(`  ID: ${lidiaUser.id}`);
    console.log(`  Name: ${lidiaUser.name}`);
    console.log(`  Role: ${lidiaUser.role}`);
    console.log(`  Member ID: ${lidiaUser.member_id || 'NULL'}\n`);

    // Get all members named Lidia
    const { data: members, error: membersError } = await supabase
        .from('members')
        .select('*')
        .ilike('name', '%lidia%');

    if (membersError) {
        console.error("Error fetching members:", membersError);
        return;
    }

    console.log(`Found ${members.length} members with 'Lidia' in name:`);
    members.forEach(m => {
        console.log(`  - ${m.name} (ID: ${m.id})`);
    });

    if (members.length > 0 && !lidiaUser.member_id) {
        const member = members[0];
        console.log(`\n✅ Linking user to member: ${member.name} (${member.id})`);

        const { error: updateError } = await supabase
            .from('users')
            .update({ member_id: member.id })
            .eq('id', lidiaUser.id);

        if (updateError) {
            console.error("❌ Error updating:", updateError);
        } else {
            console.log("✅ Updated successfully!");
            lidiaUser.member_id = member.id;
        }
    }

    if (lidiaUser.member_id) {
        console.log(`\n=== Calculating savings for member ${lidiaUser.member_id} ===`);

        // Get weekly payments
        const { data: weeklyPayments, error: wpError } = await supabase
            .from('weekly_payments')
            .select('*')
            .eq('member_id', lidiaUser.member_id);

        if (wpError) {
            console.error("Error fetching weekly payments:", wpError);
        } else {
            const weeklyTotal = weeklyPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
            console.log(`Weekly Payments: ${weeklyPayments.length} payments = $${weeklyTotal.toFixed(2)}`);
        }

        // Get monthly fees
        const { data: monthlyFees, error: mfError } = await supabase
            .from('monthly_fees')
            .select('*')
            .eq('member_id', lidiaUser.member_id);

        if (mfError) {
            console.error("Error fetching monthly fees:", mfError);
        } else {
            const monthlyTotal = monthlyFees.reduce((sum, p) => sum + parseFloat(p.amount), 0);
            console.log(`Monthly Fees: ${monthlyFees.length} payments = $${monthlyTotal.toFixed(2)}`);
        }

        const totalSavings = (weeklyPayments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0) +
            (monthlyFees?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0);
        console.log(`\n💰 TOTAL SAVINGS FOR LIDIA: $${totalSavings.toFixed(2)}`);
    }

    // Get ALL payments for comparison
    const { data: allWeekly } = await supabase.from('weekly_payments').select('*');
    const { data: allMonthly } = await supabase.from('monthly_fees').select('*');

    const allTotal = (allWeekly?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0) +
        (allMonthly?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0);
    console.log(`\n💰 TOTAL SAVINGS (ALL MEMBERS): $${allTotal.toFixed(2)}`);
}

debugSocioSavings();
