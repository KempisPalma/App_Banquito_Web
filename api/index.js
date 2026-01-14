import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabase.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Helper for error handling
const handleError = (res, error) => {
    console.error('API Error:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
};

// ==================== AUTH ROUTES ====================

// Login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', password) // Note: In production use hashed passwords and comparing hashes
            .eq('active', true)
            .single();

        if (error || !user) {
            return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
        }

        // Fix JSON fields if strings (Supabase sometimes returns objects, sometimes strings depending on client)
        // Usually Supabase returns objects for JSONB.
        if (typeof user.permissions === 'string') {
            try { user.permissions = JSON.parse(user.permissions); } catch (e) { user.permissions = []; }
        }

        res.json({ success: true, user });
    } catch (err) {
        handleError(res, err);
    }
});

// Register member
app.post('/api/auth/register', async (req, res) => {
    const { cedula, username, password } = req.body;

    try {
        const { data: member, error: memberError } = await supabase
            .from('members')
            .select('*')
            .eq('cedula', cedula)
            .single();

        if (memberError || !member) {
            return res.status(400).json({ success: false, error: 'No se encontró un socio registrado con esta cédula' });
        }

        // Check if user exists for this member
        const { data: existingUserForMember } = await supabase
            .from('users')
            .select('id')
            .eq('member_id', member.id)
            .maybeSingle();

        if (existingUserForMember) {
            return res.status(400).json({ success: false, error: 'Este socio ya tiene una cuenta creada' });
        }

        // Check username
        const { data: existingUsername } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .maybeSingle();

        if (existingUsername) {
            return res.status(400).json({ success: false, error: 'Este nombre de usuario ya está en uso' });
        }

        const id = uuidv4();
        const { error: insertError } = await supabase
            .from('users')
            .insert({
                id,
                username,
                password,
                name: member.name,
                role: 'socio',
                member_id: member.id,
                permissions: [],
                active: true
            });

        if (insertError) throw insertError;

        res.json({ success: true });
    } catch (err) {
        handleError(res, err);
    }
});

// ==================== USER ROUTES ====================

app.get('/api/users', async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: true });
        if (error) throw error;

        // Ensure permissions are proper objects (Supabase does this automatically for JSONB usually)
        users.forEach(u => {
            if (typeof u.permissions === 'string') {
                try { u.permissions = JSON.parse(u.permissions); } catch (e) { u.permissions = []; }
            }
        });

        res.json(users);
    } catch (err) {
        handleError(res, err);
    }
});

app.post('/api/users', async (req, res) => {
    const { username, password, name, role, memberId, permissions, active } = req.body;

    // Validation: Socio must have a memberId
    if (role === 'socio' && !memberId) {
        return res.status(400).json({ success: false, error: 'Para usuarios con rol Socio, es obligatorio vincular un socio existente.' });
    }

    const id = uuidv4();
    try {
        const { error } = await supabase
            .from('users')
            .insert({
                id,
                username,
                password,
                name,
                role,
                member_id: memberId || null,
                permissions: permissions || [],
                active: active ? true : false
            });

        if (error) throw error;
        res.json({ id, username, password, name, role, memberId, permissions, active });
    } catch (err) {
        handleError(res, err);
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { username, password, name, role, memberId, permissions, active } = req.body;

    // Validation
    if (role === 'socio' && !memberId) {
        return res.status(400).json({ success: false, error: 'Para usuarios con rol Socio, es obligatorio vincular un socio existente.' });
    }

    try {
        const { error } = await supabase
            .from('users')
            .update({
                username,
                password,
                name,
                role,
                member_id: memberId || null,
                permissions: permissions || [],
                active: active ? true : false
            })
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        handleError(res, err);
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('users').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        handleError(res, err);
    }
});

// ==================== USER SETTINGS ROUTES ====================

app.get('/api/settings/:userId', async (req, res) => {
    try {
        const { data: settings, error } = await supabase
            .from('user_settings')
            .select('setting_key, setting_value')
            .eq('user_id', req.params.userId);

        if (error) throw error;

        const result = {};
        settings.forEach(s => result[s.setting_key] = s.setting_value);
        res.json(result);
    } catch (err) {
        handleError(res, err);
    }
});

app.put('/api/settings/:userId', async (req, res) => {
    const { userId } = req.params;
    const settings = req.body;

    try {
        const upserts = Object.entries(settings).map(([key, value]) => ({
            user_id: userId,
            setting_key: key,
            setting_value: value
        }));

        // Upsert needs to know the constraint to match on. 
        // Supabase upsert: if primary key or unique constraint matches.
        // We have UNIQUE(user_id, setting_key).
        if (upserts.length > 0) {
            const { error } = await supabase
                .from('user_settings')
                .upsert(upserts, { onConflict: 'user_id, setting_key' });

            if (error) throw error;
        }

        res.json({ success: true });
    } catch (err) {
        handleError(res, err);
    }
});

// ==================== MEMBER ROUTES ====================

app.get('/api/members', async (req, res) => {
    try {
        const { data: members, error } = await supabase.from('members').select('*').order('joined_date', { ascending: true, nullsFirst: true });
        if (error) throw error;

        if (members.length > 0) {
            console.log("Member keys:", Object.keys(members[0]));
        }

        members.forEach(m => {
            if (typeof m.aliases === 'string') {
                try { m.aliases = JSON.parse(m.aliases); } catch (e) { m.aliases = []; }
            }
        });
        res.json(members);
    } catch (err) {
        handleError(res, err);
    }
});

app.post('/api/members', async (req, res) => {
    const { name, cedula, aliases, phone, active } = req.body;



    const id = uuidv4();
    const joinedDate = new Date().toISOString();

    try {
        // Insert Member
        const { error } = await supabase

            .from('members')
            .insert({
                id,
                name,
                cedula: cedula || null,
                aliases: aliases || [],
                phone: phone || null,
                active: active ? true : false,
                joined_date: joinedDate
            });

        if (error) throw error;

        // Initialize Activities for new member
        const { data: activities } = await supabase.from('activities').select('id');

        if (activities && activities.length > 0) {
            const identities = (aliases && aliases.length > 0)
                ? aliases.map(alias => ({ memberId: id, actionAlias: alias }))
                : [{ memberId: id, actionAlias: null }];

            const memberActivities = [];
            activities.forEach(activity => {
                identities.forEach(identity => {
                    memberActivities.push({
                        id: uuidv4(),
                        activity_id: activity.id,
                        member_id: id,
                        action_alias: identity.actionAlias,
                        tickets_sold: 0,
                        tickets_returned: 0,
                        amount_paid: 0,
                        fully_paid: false
                    });
                });
            });

            if (memberActivities.length > 0) {
                await supabase.from('member_activities').insert(memberActivities);
            }
        }

        res.json({ id, name, cedula, aliases, phone, active, joinedDate });
    } catch (err) {
        handleError(res, err);
    }
});

app.put('/api/members/:id', async (req, res) => {
    const { id } = req.params;
    const { name, cedula, aliases, phone, active } = req.body;
    try {
        const { error } = await supabase
            .from('members')
            .update({
                name,
                cedula: cedula || null,
                aliases: aliases || [],
                phone: phone || null,
                active: active ? true : false
            })
            .eq('id', id);

        if (error) throw error;

        // Sync activities for any new aliases/actions
        const { data: allActivities } = await supabase.from('activities').select('id');
        const { data: existingMas, error: fetchError } = await supabase.from('member_activities')
            .select('id, activity_id, action_alias')
            .eq('member_id', id);

        if (fetchError) console.error("Error fetching existing MAs:", fetchError);

        if (allActivities) {
            console.log("Syncing activities for member:", id);
            console.log("Aliases received:", aliases);

            const identities = (aliases && aliases.length > 0)
                ? aliases.map(alias => ({ memberId: id, actionAlias: alias }))
                : [{ memberId: id, actionAlias: null }];

            console.log("Identities to check:", identities);

            const toInsert = [];

            allActivities.forEach(activity => {
                identities.forEach(identity => {
                    const exists = existingMas?.some(ma =>
                        ma.activity_id === activity.id &&
                        ma.action_alias === identity.actionAlias
                    );

                    if (!exists) {
                        console.log(`Adding new activity participation: ActID=${activity.id}, Alias=${identity.actionAlias}`);
                        toInsert.push({
                            id: uuidv4(),
                            activity_id: activity.id,
                            member_id: id,
                            action_alias: identity.actionAlias,
                            tickets_sold: 0,
                            tickets_returned: 0,
                            amount_paid: 0,
                            fully_paid: false
                        });
                    }
                });
            });

            if (toInsert.length > 0) {
                console.log("Inserting new MAs:", toInsert.length);
                const { error: insertError } = await supabase.from('member_activities').insert(toInsert);
                if (insertError) console.error("Error inserting MAs:", insertError);
            } else {
                console.log("No new MAs to insert.");
            }

            // identify aliases to remove and delete them
            if (existingMas) {
                const toDeleteIds = existingMas
                    .filter(ma => {
                        // We want to DELETE if the alias is NOT in the new identities list
                        const foundInNew = identities.some(i => i.actionAlias === ma.action_alias);
                        return !foundInNew;
                    })
                    .map(ma => ma.id);

                if (toDeleteIds.length > 0) {
                    console.log("Deleting removed MAs count:", toDeleteIds.length, toDeleteIds);
                    const { error: delError } = await supabase
                        .from('member_activities')
                        .delete()
                        .in('id', toDeleteIds);

                    if (delError) console.error("Error deleting MAs:", delError);
                }
            }
        }

        res.json({ success: true });
    } catch (err) {
        handleError(res, err);
    }
});

app.delete('/api/members/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Delete Weekly Payments
        const { error: err1 } = await supabase.from('weekly_payments').delete().eq('member_id', id);
        if (err1) console.error('Error deleting weekly_payments:', err1);

        // 2. Delete Monthly Fees
        const { error: err2 } = await supabase.from('monthly_fees').delete().eq('member_id', id);
        if (err2) console.error('Error deleting monthly_fees:', err2);

        // 3. Delete Member Activities
        const { error: err3 } = await supabase.from('member_activities').delete().eq('member_id', id);
        if (err3) console.error('Error deleting member_activities:', err3);

        // 4. Delete Loans and Loan Payments
        // First get loans to delete their payments
        const { data: loans } = await supabase.from('loans').select('id').eq('member_id', id);
        if (loans && loans.length > 0) {
            const loanIds = loans.map(l => l.id);
            if (loanIds.length > 0) {
                const { error: errPay } = await supabase.from('loan_payments').delete().in('loan_id', loanIds);
                if (errPay) console.error('Error deleting loan_payments:', errPay);
            }
            const { error: errLoan } = await supabase.from('loans').delete().eq('member_id', id);
            if (errLoan) console.error('Error deleting loans:', errLoan);
        }

        // 5. Delete Users
        const { error: errUser } = await supabase.from('users').delete().eq('member_id', id);
        if (errUser) console.error('Error deleting users:', errUser);

        // 6. Delete Settings? (user_settings depends on users, cascading there might work if users deleted, but good to be safe if user table has cascade on delete for settings, otherwise manual)
        // Check schema: user_settings REFERENCES users(id) ON DELETE CASCADE. So deleting users is enough.

        // 7. Finally Delete Member
        const { error } = await supabase.from('members').delete().eq('id', id);
        if (error) throw error;

        res.json({ success: true });
    } catch (err) {
        handleError(res, err);
    }
});

// ==================== WEEKLY PAYMENTS ROUTES ====================

app.get('/api/payments/weekly', async (req, res) => {
    try {
        const { data: payments, error } = await supabase.from('weekly_payments').select('*');
        if (error) throw error;

        res.json(payments.map(p => ({
            id: p.id,
            memberId: p.member_id,
            actionAlias: p.action_alias,
            year: p.year,
            month: p.month,
            week: p.week,
            amount: parseFloat(p.amount), // Ensure number
            date: p.date
        })));
    } catch (err) {
        handleError(res, err);
    }
});

app.post('/api/payments/weekly', async (req, res) => {
    const { memberId, actionAlias, year, month, week, amount } = req.body;

    try {
        // Attempt insert, check if exists via unique constraint logic in logic or upsert
        // Since we want to toggle between insert/update, explicit check is safer or upsert

        // Let's use upsert with ON CONFLICT logic if supabase supports checking "member_id, action_alias, year, month, week"
        // But action_alias can be NULL. Unique constraints with NULLs in Postgres are tricky (NULL != NULL).
        // However, Supabase (Postgres 15+) supports NULLs not distinct in unique indexes if defined that way.
        // Our schema: UNIQUE(member_id, action_alias, year, month, week). By default NULLs are distinct.
        // So multiple rows with NULL action_alias could exist if we aren't careful? 
        // Standard SQL: UNIQUE allows multiple NULLs.
        // In our case, we probably want only one.

        // Strategy: Query first.
        let query = supabase
            .from('weekly_payments')
            .select('id')
            .eq('member_id', memberId)
            .eq('year', year)
            .eq('month', month)
            .eq('week', week);

        if (actionAlias) {
            query = query.eq('action_alias', actionAlias);
        } else {
            query = query.is('action_alias', null);
        }

        const { data: existing } = await query.maybeSingle();

        if (existing) {
            const { error } = await supabase
                .from('weekly_payments')
                .update({ amount, date: new Date().toISOString() })
                .eq('id', existing.id);
            if (error) throw error;
            res.json({ id: existing.id, updated: true });
        } else {
            const id = uuidv4();
            const { error } = await supabase
                .from('weekly_payments')
                .insert({
                    id,
                    member_id: memberId,
                    action_alias: actionAlias || null,
                    year,
                    month,
                    week,
                    amount,
                    date: new Date().toISOString()
                });
            if (error) throw error;
            res.json({ id, created: true });
        }
    } catch (err) {
        handleError(res, err);
    }
});

// ==================== MONTHLY FEES ROUTES ====================

app.get('/api/payments/monthly', async (req, res) => {
    try {
        const { data: fees, error } = await supabase.from('monthly_fees').select('*');
        if (error) throw error;

        res.json(fees.map(f => ({
            id: f.id,
            memberId: f.member_id,
            actionAlias: f.action_alias,
            year: f.year,
            month: f.month,
            amount: parseFloat(f.amount),
            date: f.date
        })));
    } catch (err) {
        handleError(res, err);
    }
});

app.post('/api/payments/monthly', async (req, res) => {
    const { memberId, actionAlias, year, month, amount } = req.body;

    try {
        let query = supabase
            .from('monthly_fees')
            .select('id')
            .eq('member_id', memberId)
            .eq('year', year)
            .eq('month', month);

        if (actionAlias) {
            query = query.eq('action_alias', actionAlias);
        } else {
            query = query.is('action_alias', null);
        }

        const { data: existing } = await query.maybeSingle();

        if (existing) {
            const { error } = await supabase
                .from('monthly_fees')
                .update({ amount, date: new Date().toISOString() })
                .eq('id', existing.id);
            if (error) throw error;
            res.json({ id: existing.id, updated: true });
        } else {
            const id = uuidv4();
            const { error } = await supabase
                .from('monthly_fees')
                .insert({
                    id,
                    member_id: memberId,
                    action_alias: actionAlias || null,
                    year,
                    month,
                    amount,
                    date: new Date().toISOString()
                });
            if (error) throw error;
            res.json({ id, created: true });
        }
    } catch (err) {
        handleError(res, err);
    }
});

// ==================== ACTIVITIES ROUTES ====================

app.get('/api/activities', async (req, res) => {
    try {
        const { data: activities, error } = await supabase.from('activities').select('*');
        if (error) throw error;

        res.json(activities.map(a => ({
            id: a.id,
            name: a.name,
            date: a.date,
            description: a.description,
            ticketPrice: parseFloat(a.ticket_price),
            totalTicketsPerMember: a.total_tickets_per_member,
            investment: a.investment ? parseFloat(a.investment) : null
        })));
    } catch (err) {
        handleError(res, err);
    }
});

app.post('/api/activities', async (req, res) => {
    const { name, date, description, ticketPrice, totalTicketsPerMember, investment } = req.body;
    const id = uuidv4();

    try {
        const { error } = await supabase
            .from('activities')
            .insert({
                id,
                name,
                date,
                description: description || null,
                ticket_price: ticketPrice,
                total_tickets_per_member: totalTicketsPerMember || 10,
                investment: investment || null
            });

        if (error) throw error;

        // Initialize member participation
        const { data: members } = await supabase.from('members').select('id, aliases');

        if (members && members.length > 0) {
            const memberActivities = [];
            members.forEach(member => {
                let aliases = member.aliases || [];
                if (typeof aliases === 'string') {
                    try { aliases = JSON.parse(aliases); } catch (e) { aliases = []; }
                }

                const identities = aliases.length > 0
                    ? aliases.map(alias => ({ memberId: member.id, actionAlias: alias }))
                    : [{ memberId: member.id, actionAlias: null }];

                identities.forEach(identity => {
                    memberActivities.push({
                        id: uuidv4(),
                        activity_id: id,
                        member_id: member.id,
                        action_alias: identity.actionAlias,
                        tickets_sold: 0,
                        tickets_returned: 0,
                        amount_paid: 0,
                        fully_paid: false
                    });
                });
            });

            if (memberActivities.length > 0) {
                await supabase.from('member_activities').insert(memberActivities);
            }
        }

        res.json({ id, name, date, description, ticketPrice, totalTicketsPerMember, investment });
    } catch (err) {
        handleError(res, err);
    }
});

app.put('/api/activities/:id', async (req, res) => {
    const { id } = req.params;
    const { name, date, description, ticketPrice, totalTicketsPerMember, investment } = req.body;
    try {
        const { error } = await supabase
            .from('activities')
            .update({
                name,
                date,
                description: description || null,
                ticket_price: ticketPrice,
                total_tickets_per_member: totalTicketsPerMember || 10,
                investment: investment || null
            })
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        handleError(res, err);
    }
});

app.delete('/api/activities/:id', async (req, res) => {
    try {
        // Cascade delete should handle member_activities, but let's be safe if not configured in DB (my schema said ON DELETE CASCADE)
        // Check schema.sql: "activity_id TEXT REFERENCES activities(id) ON DELETE CASCADE" -> Yes.
        const { error } = await supabase.from('activities').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        handleError(res, err);
    }
});

// ==================== MEMBER ACTIVITIES ROUTES ====================

app.get('/api/member-activities', async (req, res) => {
    try {
        const { data: mas, error } = await supabase.from('member_activities').select('*');
        if (error) throw error;

        res.json(mas.map(ma => ({
            id: ma.id,
            activityId: ma.activity_id,
            memberId: ma.member_id,
            actionAlias: ma.action_alias,
            ticketsSold: ma.tickets_sold,
            ticketsReturned: ma.tickets_returned,
            amountPaid: parseFloat(ma.amount_paid),
            fullyPaid: ma.fully_paid
        })));
    } catch (err) {
        handleError(res, err);
    }
});

app.put('/api/member-activities/:id', async (req, res) => {
    const { id } = req.params;
    const { ticketsSold, ticketsReturned, amountPaid, fullyPaid } = req.body;
    try {
        const { error } = await supabase
            .from('member_activities')
            .update({
                tickets_sold: ticketsSold,
                tickets_returned: ticketsReturned,
                amount_paid: amountPaid,
                fully_paid: fullyPaid ? true : false
            })
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        handleError(res, err);
    }
});

// ==================== LOANS ROUTES ====================

app.get('/api/loans', async (req, res) => {
    try {
        const { data: loans, error } = await supabase
            .from('loans')
            .select(`
                *,
                loan_payments (*)
            `);

        if (error) throw error;

        const result = loans.map(l => ({
            id: l.id,
            memberId: l.member_id,
            actionAlias: l.action_alias,
            clientName: l.client_name,
            borrowerType: l.borrower_type,
            amount: parseFloat(l.amount),
            interestRate: parseFloat(l.interest_rate),
            startDate: l.start_date,
            endDate: l.end_date,
            status: l.status,
            pendingPrincipal: l.pending_principal !== null ? parseFloat(l.pending_principal) : parseFloat(l.amount),
            pendingInterest: l.pending_interest !== null ? parseFloat(l.pending_interest) : 0,
            lastPaymentDate: l.last_payment_date,
            nextDueDate: l.next_due_date,
            payments: l.loan_payments ? l.loan_payments.map(p => ({
                id: p.id,
                loanId: p.loan_id,
                amount: parseFloat(p.amount),
                paymentType: p.payment_type,
                date: p.date
            })) : []
        }));

        res.json(result);
    } catch (err) {
        handleError(res, err);
    }
});

app.post('/api/loans', async (req, res) => {
    const { memberId, actionAlias, clientName, borrowerType, amount, interestRate, startDate, endDate, status } = req.body;
    const id = uuidv4();

    try {
        const pendingInterest = amount * (interestRate / 100);
        const { error } = await supabase
            .from('loans')
            .insert({
                id,
                member_id: memberId || null,
                action_alias: actionAlias || null,
                client_name: clientName || null,
                borrower_type: borrowerType,
                amount,
                interest_rate: interestRate,
                start_date: startDate,
                end_date: endDate,
                status: status || 'active',
                pending_principal: amount,
                pending_interest: pendingInterest,
                next_due_date: endDate
            });

        if (error) throw error;
        res.json({ id, memberId, actionAlias, clientName, borrowerType, amount, interestRate, startDate, endDate, status: status || 'active', payments: [] });
    } catch (err) {
        handleError(res, err);
    }
});

app.put('/api/loans/:id', async (req, res) => {
    const { id } = req.params;
    const { memberId, actionAlias, clientName, borrowerType, amount, interestRate, startDate, endDate, status } = req.body;
    try {
        const { error } = await supabase
            .from('loans')
            .update({
                member_id: memberId || null,
                action_alias: actionAlias || null,
                client_name: clientName || null,
                borrower_type: borrowerType,
                amount,
                interest_rate: interestRate,
                start_date: startDate,
                end_date: endDate,
                status
            })
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        handleError(res, err);
    }
});

app.delete('/api/loans/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('loans').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        handleError(res, err);
    }
});

// Loan payments
app.post('/api/loans/:id/payments', async (req, res) => {
    const { id } = req.params;
    const { amount, paymentType, date } = req.body;
    const paymentId = uuidv4();

    try {
        // 1. Get current loan state
        const { data: loan, error: fetchError } = await supabase
            .from('loans')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !loan) throw new Error('Loan not found');

        let pending_principal = parseFloat(loan.pending_principal) || parseFloat(loan.amount);
        let pending_interest = parseFloat(loan.pending_interest) || 0;

        // 2. Insert Payment
        const { error: insertError } = await supabase
            .from('loan_payments')
            .insert({
                id: paymentId,
                loan_id: id,
                amount,
                payment_type: paymentType,
                date: date || new Date().toISOString()
            });

        if (insertError) throw insertError;

        // 3. Update Calculations
        if (paymentType === 'principal') {
            pending_principal -= amount;
            if (pending_principal < 0) pending_principal = 0;
        } else {
            pending_interest -= amount;
            if (pending_interest < 0) pending_interest = 0;
        }

        // Fetch all payments to recalculate status accurately using the simulation logic
        const { data: allPayments, error: historyError } = await supabase
            .from('loan_payments')
            .select('*')
            .eq('loan_id', id);

        if (historyError) throw historyError;

        // --- Recalculate Loan Status with Overdue Logic (Backend Port) ---
        // Includes the current payment which was just inserted
        const currentPayments = [...allPayments, { amount, payment_type: paymentType, date: date || new Date().toISOString() }];

        // Helper to calculate total due
        const calculateBackendTotalDue = (loanObj, paymentsList) => {
            const endDate = new Date(loanObj.end_date);
            const now = new Date(); // Server time
            const interestRate = parseFloat(loanObj.interest_rate);
            const amountOriginal = parseFloat(loanObj.amount);

            // Base Interest
            const baseInterest = amountOriginal * (interestRate / 100);

            // Simulation State
            let overdueInterest = 0;
            let currentDate = new Date(endDate);
            currentDate.setMonth(currentDate.getMonth() + 1);

            while (currentDate <= now) {
                // Payments before cutoff
                const paymentsUntilCutoff = paymentsList.filter(p =>
                    p.payment_type === 'principal' && new Date(p.date) <= currentDate
                );
                const principalPaidAtCutoff = paymentsUntilCutoff.reduce((acc, p) => acc + parseFloat(p.amount), 0);
                const remainingPrincipal = Math.max(0, amountOriginal - principalPaidAtCutoff);

                if (remainingPrincipal <= 0.01) break;

                overdueInterest += remainingPrincipal * (interestRate / 100);
                currentDate.setMonth(currentDate.getMonth() + 1);
            }

            return amountOriginal + baseInterest + overdueInterest;
        };

        const realTotalDue = calculateBackendTotalDue(loan, currentPayments);
        const realTotalPaid = currentPayments.reduce((acc, p) => acc + parseFloat(p.amount), 0);
        const realRemaining = Math.max(0, realTotalDue - realTotalPaid);

        let newStatus = loan.status;
        if (realRemaining <= 0.01) {
            newStatus = 'paid';
        } else {
            newStatus = 'active'; // Reopen if unpaid balance exists
        }
        // -----------------------------------------------------------------

        const paymentDateObj = new Date(date || new Date().toISOString());
        const nextDueDateObj = new Date(paymentDateObj);
        nextDueDateObj.setMonth(nextDueDateObj.getMonth() + 1);
        const nextDueDate = nextDueDateObj.toISOString();

        const { error: updateError } = await supabase
            .from('loans')
            .update({
                pending_principal,
                pending_interest,
                last_payment_date: date || new Date().toISOString(),
                next_due_date: nextDueDate,
                status: newStatus
            })
            .eq('id', id);

        if (updateError) throw updateError;

        res.json({ id: paymentId, loanId: id, amount, paymentType, date: date || new Date().toISOString() });
    } catch (err) {
        handleError(res, err);
    }
});

app.put('/api/loans/:loanId/payments/:paymentId', async (req, res) => {
    const { loanId, paymentId } = req.params;
    const { amount, paymentType, date } = req.body;

    try {
        const { error: updatePaymentError } = await supabase
            .from('loan_payments')
            .update({ amount, payment_type: paymentType, date })
            .eq('id', paymentId);

        if (updatePaymentError) throw updatePaymentError;

        // Recalculate Logic (Simplified: Check total vs dues)
        // Ideally we should replay all payments, but that is complex.
        // We will just do the status check based on total paid vs total due (initial)

        const { data: loan } = await supabase.from('loans').select('*').eq('id', loanId).single();
        const { data: payments } = await supabase.from('loan_payments').select('*').eq('loan_id', loanId);

        const totalPaid = payments.reduce((acc, p) => acc + parseFloat(p.amount), 0);
        const totalDue = parseFloat(loan.amount) + (parseFloat(loan.amount) * parseFloat(loan.interest_rate) / 100);

        const { error: updateLoanError } = await supabase
            .from('loans')
            .update({ status: totalPaid >= totalDue ? 'paid' : 'active' })
            .eq('id', loanId);

        if (updateLoanError) throw updateLoanError;

        res.json({ success: true });
    } catch (err) {
        handleError(res, err);
    }
});

app.delete('/api/loans/:loanId/payments/:paymentId', async (req, res) => {
    const { loanId, paymentId } = req.params;

    try {
        const { error: deleteError } = await supabase.from('loan_payments').delete().eq('id', paymentId);
        if (deleteError) throw deleteError;

        // Recalculate status similar to put
        const { data: loan } = await supabase.from('loans').select('*').eq('id', loanId).single();
        const { data: payments } = await supabase.from('loan_payments').select('*').eq('loan_id', loanId);

        const totalPaid = payments.reduce((acc, p) => acc + parseFloat(p.amount), 0);
        const totalDue = parseFloat(loan.amount) + (parseFloat(loan.amount) * parseFloat(loan.interest_rate) / 100);

        const { error: updateLoanError } = await supabase
            .from('loans')
            .update({ status: totalPaid >= totalDue ? 'paid' : 'active' })
            .eq('id', loanId);

        if (updateLoanError) throw updateLoanError;

        res.json({ success: true });
    } catch (err) {
        handleError(res, err);
    }
});

// Remove old migrate endpoint or replace with a status check
app.get('/api/health', async (req, res) => {
    try {
        // Test database connection
        const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });

        res.json({
            status: 'ok',
            environment: process.env.NODE_ENV,
            supabase_config: {
                url_configured: !!process.env.SUPABASE_URL,
                key_configured: !!process.env.SUPABASE_KEY,
                key_start: process.env.SUPABASE_KEY ? process.env.SUPABASE_KEY.substring(0, 5) + '...' : 'none'
            },
            db_connection: error ? 'failed' : 'success',
            user_count: count,
            db_error: error ? error.message : null
        });
    } catch (err) {
        res.status(500).json({
            status: 'server_error',
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// ==================== ADMIN MIGRATION / IMPORT ROUTES ====================

app.post('/api/admin/import', async (req, res) => {
    const { members, users, activities, loans, weeklyPayments, monthlyFees, memberActivities } = req.body;

    try {
        // 1. Members
        if (members && members.length > 0) {
            const membersToUpsert = members.map(m => ({
                id: m.id,
                name: m.name,
                cedula: m.cedula,
                aliases: typeof m.aliases === 'string' ? JSON.parse(m.aliases) : (m.aliases || []),
                phone: m.phone,
                active: m.active,
                joined_date: m.joinedDate || m.joined_date || new Date().toISOString()
            }));
            const { error: errMembers } = await supabase.from('members').upsert(membersToUpsert);
            if (errMembers) throw errMembers;
        }

        // 2. Users
        if (users && users.length > 0) {
            const usersToUpsert = users.map(u => ({
                id: u.id,
                username: u.username,
                password: u.password,
                name: u.name,
                role: u.role,
                member_id: u.memberId || u.member_id,
                permissions: typeof u.permissions === 'string' ? JSON.parse(u.permissions) : (u.permissions || []),
                active: u.active
            }));
            const { error: errUsers } = await supabase.from('users').upsert(usersToUpsert);
            if (errUsers) throw errUsers;
        }

        // 3. Activities
        if (activities && activities.length > 0) {
            const activitiesToUpsert = activities.map(a => ({
                id: a.id,
                name: a.name,
                date: a.date,
                description: a.description,
                ticket_price: a.ticketPrice || a.ticket_price,
                total_tickets_per_member: a.totalTicketsPerMember || a.total_tickets_per_member,
                investment: a.investment
            }));
            const { error: errActivities } = await supabase.from('activities').upsert(activitiesToUpsert);
            if (errActivities) throw errActivities;
        }

        // 4. Loans & Payments inside Loans
        if (loans && loans.length > 0) {
            const loansToUpsert = loans.map(l => ({
                id: l.id,
                member_id: l.memberId || l.member_id,
                action_alias: l.actionAlias || l.action_alias,
                client_name: l.clientName || l.client_name,
                borrower_type: l.borrowerType || l.borrower_type,
                amount: l.amount,
                interest_rate: l.interestRate || l.interest_rate,
                start_date: l.startDate || l.start_date,
                end_date: l.endDate || l.end_date,
                status: l.status,
                pending_principal: l.pendingPrincipal !== undefined ? l.pendingPrincipal : l.pending_principal,
                pending_interest: l.pendingInterest !== undefined ? l.pendingInterest : l.pending_interest,
                last_payment_date: l.lastPaymentDate || l.last_payment_date,
                next_due_date: l.nextDueDate || l.next_due_date
            }));
            const { error: errLoans } = await supabase.from('loans').upsert(loansToUpsert);
            if (errLoans) throw errLoans;

            // Extract payments from loans
            let allLoanPayments = [];
            loans.forEach(l => {
                if (l.payments && l.payments.length > 0) {
                    allLoanPayments = [...allLoanPayments, ...l.payments.map(p => ({
                        id: p.id,
                        loan_id: p.loanId || p.loan_id || l.id,
                        amount: p.amount,
                        payment_type: p.paymentType || p.payment_type,
                        date: p.date
                    }))];
                }
            });

            if (allLoanPayments.length > 0) {
                const { error: errLP } = await supabase.from('loan_payments').upsert(allLoanPayments);
                if (errLP) console.error("Error upserting loan payments", errLP); // Log but continue
            }
        }

        // 5. Weekly Payments
        if (weeklyPayments && weeklyPayments.length > 0) {
            const wpToUpsert = weeklyPayments.map(p => ({
                id: p.id,
                member_id: p.memberId || p.member_id,
                action_alias: p.actionAlias || p.action_alias,
                year: p.year,
                month: p.month,
                week: p.week,
                amount: p.amount,
                date: p.date
            }));
            const { error: errWP } = await supabase.from('weekly_payments').upsert(wpToUpsert);
            if (errWP) throw errWP;
        }

        // 6. Monthly Fees
        if (monthlyFees && monthlyFees.length > 0) {
            const mfToUpsert = monthlyFees.map(f => ({
                id: f.id,
                member_id: f.memberId || f.member_id,
                action_alias: f.actionAlias || f.action_alias,
                year: f.year,
                month: f.month,
                amount: f.amount,
                date: f.date
            }));
            const { error: errMF } = await supabase.from('monthly_fees').upsert(mfToUpsert);
            if (errMF) throw errMF;
        }

        // 7. Member Activities
        if (memberActivities && memberActivities.length > 0) {
            const maToUpsert = memberActivities.map(ma => ({
                id: ma.id,
                activity_id: ma.activityId || ma.activity_id,
                member_id: ma.memberId || ma.member_id,
                action_alias: ma.actionAlias || ma.action_alias,
                tickets_sold: ma.ticketsSold !== undefined ? ma.ticketsSold : ma.tickets_sold,
                tickets_returned: ma.ticketsReturned !== undefined ? ma.ticketsReturned : ma.tickets_returned,
                amount_paid: ma.amountPaid !== undefined ? ma.amountPaid : ma.amount_paid,
                fully_paid: ma.fullyPaid !== undefined ? ma.fullyPaid : ma.fully_paid
            }));
            const { error: errMA } = await supabase.from('member_activities').upsert(maToUpsert);
            if (errMA) throw errMA;
        }

        res.json({ success: true, message: "Data imported successfully" });
    } catch (err) {
        handleError(res, err);
    }
});

// Start server only if run directly (local dev)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Banquito API Server running on http://localhost:${PORT}`);
    });
}

// Export for Vercel
export default app;
