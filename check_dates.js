import { supabase } from './api/supabase.js';

async function checkMemberDates() {
    const { data: members } = await supabase
        .from('members')
        .select('name, joined_date')
        .order('name');

    console.log('\n📋 Estado de fechas de ingreso:\n');
    console.log('='.repeat(60));

    let withDate = 0;
    let withoutDate = 0;

    members.forEach(m => {
        const dateStr = m.joined_date
            ? `✅ ${new Date(m.joined_date).toLocaleDateString('es-ES')}`
            : '❌ SIN FECHA';

        console.log(`${m.name.padEnd(25)} ${dateStr}`);

        if (m.joined_date) withDate++;
        else withoutDate++;
    });

    console.log('='.repeat(60));
    console.log(`\n📊 Resumen: ${withDate} con fecha, ${withoutDate} sin fecha\n`);
}

checkMemberDates();
