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

async function verifyAndFixLidia() {
    console.log("=== VERIFICANDO USUARIO LIDIA ===\n");

    // 1. Verificar usuario
    const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('username', 'Lidia')
        .single();

    console.log("Usuario Lidia:");
    console.log(JSON.stringify(user, null, 2));
    console.log(`\nmember_id actual: ${user?.member_id || 'NULL'}\n`);

    // 2. Buscar miembro Lidia
    const { data: members } = await supabase
        .from('members')
        .select('*');

    console.log("Todos los miembros:");
    members?.forEach(m => {
        console.log(`  - ${m.name} (ID: ${m.id})`);
    });

    const lidiaMember = members?.find(m => m.name.toLowerCase().includes('lidia'));

    if (lidiaMember) {
        console.log(`\n✅ Miembro Lidia encontrado: ${lidiaMember.name} (${lidiaMember.id})`);

        if (user?.member_id !== lidiaMember.id) {
            console.log(`\n⚠️  El member_id no coincide. Actualizando...`);

            const { error } = await supabase
                .from('users')
                .update({ member_id: lidiaMember.id })
                .eq('id', user.id);

            if (error) {
                console.error("❌ Error:", error);
            } else {
                console.log("✅ Actualizado correctamente!");
            }
        } else {
            console.log("✅ El member_id ya está correcto");
        }

        // 3. Calcular ahorros
        console.log(`\n=== CALCULANDO AHORROS PARA MIEMBRO ${lidiaMember.id} ===`);

        const { data: weeklyPayments } = await supabase
            .from('weekly_payments')
            .select('*')
            .eq('member_id', lidiaMember.id);

        const { data: monthlyFees } = await supabase
            .from('monthly_fees')
            .select('*')
            .eq('member_id', lidiaMember.id);

        const weeklyTotal = weeklyPayments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
        const monthlyTotal = monthlyFees?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;
        const totalLidia = weeklyTotal + monthlyTotal;

        console.log(`Pagos semanales: ${weeklyPayments?.length || 0} = $${weeklyTotal.toFixed(2)}`);
        console.log(`Cuotas mensuales: ${monthlyFees?.length || 0} = $${monthlyTotal.toFixed(2)}`);
        console.log(`\n💰 TOTAL LIDIA: $${totalLidia.toFixed(2)}`);

        // Total de todos
        const { data: allWeekly } = await supabase.from('weekly_payments').select('*');
        const { data: allMonthly } = await supabase.from('monthly_fees').select('*');
        const totalAll = (allWeekly?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0) +
            (allMonthly?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0);

        console.log(`💰 TOTAL TODOS: $${totalAll.toFixed(2)}`);
    } else {
        console.log("\n❌ No se encontró miembro Lidia");
    }
}

verifyAndFixLidia();
