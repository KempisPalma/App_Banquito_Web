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

async function fixLoans() {
    console.log("Fetching all loans...");

    const { data: loans, error } = await supabase
        .from('loans')
        .select('*');

    if (error) {
        console.error("Error fetching loans:", error);
        return;
    }

    console.log(`Found ${loans.length} loans`);

    for (const loan of loans) {
        const correctPendingInterest = parseFloat(loan.amount) * (parseFloat(loan.interest_rate) / 100);
        const currentPendingInterest = parseFloat(loan.pending_interest) || 0;

        console.log(`\nLoan ID: ${loan.id}`);
        console.log(`  Amount: $${loan.amount}`);
        console.log(`  Interest Rate: ${loan.interest_rate}%`);
        console.log(`  Current Pending Principal: $${loan.pending_principal}`);
        console.log(`  Current Pending Interest: $${currentPendingInterest}`);
        console.log(`  Correct Pending Interest: $${correctPendingInterest}`);

        if (Math.abs(currentPendingInterest - correctPendingInterest) > 0.01) {
            console.log(`  ⚠️  Needs update!`);

            const { error: updateError } = await supabase
                .from('loans')
                .update({
                    pending_principal: parseFloat(loan.amount),
                    pending_interest: correctPendingInterest
                })
                .eq('id', loan.id);

            if (updateError) {
                console.error(`  ❌ Error updating:`, updateError);
            } else {
                console.log(`  ✅ Updated successfully!`);
            }
        } else {
            console.log(`  ✓ Already correct`);
        }
    }

    console.log("\n✅ Done!");
}

fixLoans();
