import { supabase } from './api/supabase.js';

async function addDatesToMembers() {
    try {
        console.log('🔍 Consultando socios sin fecha de ingreso...\n');

        // Obtener todos los socios sin fecha
        const { data: members, error } = await supabase
            .from('members')
            .select('*')
            .is('joined_date', null);

        if (error) {
            console.error('❌ Error al consultar socios:', error);
            return;
        }

        console.log(`📊 Encontrados ${members.length} socios sin fecha de ingreso:\n`);
        members.forEach((m, i) => {
            console.log(`   ${i + 1}. ${m.name} (Cédula: ${m.cedula || 'Sin cédula'})`);
        });

        if (members.length === 0) {
            console.log('\n✅ Todos los socios ya tienen fecha de ingreso.');
            return;
        }

        console.log('\n📅 Asignando fecha de ingreso (hoy: ' + new Date().toLocaleDateString('es-ES') + ') a todos los socios...\n');

        const today = new Date().toISOString();
        let successCount = 0;
        let errorCount = 0;

        // Actualizar cada socio
        for (const member of members) {
            const { error: updateError } = await supabase
                .from('members')
                .update({ joined_date: today })
                .eq('id', member.id);

            if (updateError) {
                console.error(`   ❌ Error al actualizar ${member.name}:`, updateError.message);
                errorCount++;
            } else {
                console.log(`   ✅ Actualizado: ${member.name}`);
                successCount++;
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('📈 Resumen:');
        console.log(`   ✅ Exitosos: ${successCount}`);
        console.log(`   ❌ Errores: ${errorCount}`);
        console.log('='.repeat(50));
        console.log('\n🎉 ¡Proceso completado! Ahora el filtro de año mostrará los años disponibles.');

    } catch (err) {
        console.error('❌ Error general:', err);
    }
}

addDatesToMembers();
