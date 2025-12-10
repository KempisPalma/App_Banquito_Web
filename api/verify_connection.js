import { supabase } from './supabase.js';

async function verify() {
    console.log('Testing connection to Supabase...');
    try {
        const { data, error } = await supabase.from('members').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Connection failed:', error.message);
            console.error('Details:', error);
        } else {
            console.log('✅ Connection successful!');
            console.log('Table "members" is accessible.');
        }
    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

verify();
