import { supabase } from './supabase.js';

async function debugUsers() {
    console.log('Fetching users...');
    const { data: users, error } = await supabase.from('users').select('*');

    if (error) {
        console.error('Error fetching users:', error);
    } else {
        console.log('Users found:', users.length);
        users.forEach(u => {
            console.log(JSON.stringify(u, null, 2));
        });
    }
}

debugUsers();
