import db from './database.js';
import { supabase } from './supabase.js';

// Keep track of valid member IDs to avoid FK violations
const validMemberIds = new Set();

async function migrateTable(tableName, displayName) {
    console.log(`Migrating ${displayName}...`);
    try {
        const rows = db.prepare(`SELECT * FROM ${tableName}`).all();

        if (rows.length === 0) {
            console.log(`No data in ${displayName} to migrate.`);
            return;
        }

        // Clean and Filter rows
        const cleanRows = rows.reduce((acc, row) => {
            const newRow = { ...row };

            // Clean JSON fields
            if (tableName === 'members' && typeof newRow.aliases === 'string') {
                try { newRow.aliases = JSON.parse(newRow.aliases); } catch (e) { newRow.aliases = []; }
            }
            if (tableName === 'users' && typeof newRow.permissions === 'string') {
                try { newRow.permissions = JSON.parse(newRow.permissions); } catch (e) { newRow.permissions = []; }
            }

            // Filter orphans
            if (['weekly_payments', 'monthly_fees', 'member_activities', 'loans'].includes(tableName)) {
                if (newRow.member_id && !validMemberIds.has(newRow.member_id)) {
                    // console.warn(`Skipping orphaned record in ${tableName} for member_id: ${newRow.member_id}`);
                    return acc;
                }
            }
            // users also has member_id but it's nullable and usually for socios.
            if (tableName === 'users' && newRow.member_id && !validMemberIds.has(newRow.member_id)) {
                newRow.member_id = null; // Decouple instead of skipping user
            }

            if (tableName === 'members') {
                validMemberIds.add(newRow.id);
            }

            acc.push(newRow);
            return acc;
        }, []);

        if (cleanRows.length === 0) {
            console.log(`No valid data (after filtering) in ${displayName} to migrate.`);
            return;
        }

        // Insert in batches of 100
        const batchSize = 100;
        for (let i = 0; i < cleanRows.length; i += batchSize) {
            const batch = cleanRows.slice(i, i + batchSize);
            const { error } = await supabase.from(tableName).upsert(batch);

            if (error) {
                console.error(`❌ Error migrating ${displayName} (batch ${i}):`, error.message);
                console.error(error);
            } else {
                console.log(`✅ Migrated ${batch.length} rows for ${displayName}`);
            }
        }
    } catch (err) {
        console.error(`ERROR processing ${displayName}:`, err.message);
    }
}

async function migrate() {
    console.log('🚀 Starting migration check...');

    // Disable FK checks on supabase side? No, we must likely insert in order.

    // 1. Members
    await migrateTable('members', 'Members');

    // 2. Users (depends on members optionally)
    await migrateTable('users', 'Users');

    // 3. User Settings (depends on users)
    await migrateTable('user_settings', 'User Settings');

    // 4. Activities
    await migrateTable('activities', 'Activities');

    // 5. Member Activities (depends on members and activities)
    await migrateTable('member_activities', 'Member Activities');

    // 6. Weekly Payments (depends on members)
    await migrateTable('weekly_payments', 'Weekly Payments');

    // 7. Monthly Fees (depends on members)
    await migrateTable('monthly_fees', 'Monthly Fees');

    // 8. Loans (depends on members)
    await migrateTable('loans', 'Loans');

    // 9. Loan Payments (depends on loans)
    await migrateTable('loan_payments', 'Loan Payments');

    console.log('✨ Migration completed!');
}

migrate();
