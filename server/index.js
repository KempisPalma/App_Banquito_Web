import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import db from './database.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// ==================== AUTH ROUTES ====================

// Login
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ? AND active = 1').get(username, password);
    if (user) {
        user.permissions = JSON.parse(user.permissions || '[]');
        res.json({ success: true, user });
    } else {
        res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    }
});

// Register member
app.post('/api/auth/register', (req, res) => {
    const { cedula, username, password } = req.body;

    const member = db.prepare('SELECT * FROM members WHERE cedula = ?').get(cedula);
    if (!member) {
        return res.status(400).json({ success: false, error: 'No se encontró un socio registrado con esta cédula' });
    }

    const existingUserForMember = db.prepare('SELECT * FROM users WHERE member_id = ?').get(member.id);
    if (existingUserForMember) {
        return res.status(400).json({ success: false, error: 'Este socio ya tiene una cuenta creada' });
    }

    const existingUsername = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (existingUsername) {
        return res.status(400).json({ success: false, error: 'Este nombre de usuario ya está en uso' });
    }

    const id = uuidv4();
    db.prepare(`
        INSERT INTO users (id, username, password, name, role, member_id, permissions, active)
        VALUES (?, ?, ?, ?, 'socio', ?, '[]', 1)
    `).run(id, username, password, member.name, member.id);

    res.json({ success: true });
});

// ==================== USER ROUTES ====================

app.get('/api/users', (req, res) => {
    const users = db.prepare('SELECT * FROM users').all();
    users.forEach(u => u.permissions = JSON.parse(u.permissions || '[]'));
    res.json(users);
});

app.post('/api/users', (req, res) => {
    const { username, password, name, role, memberId, permissions, active } = req.body;
    const id = uuidv4();
    db.prepare(`
        INSERT INTO users (id, username, password, name, role, member_id, permissions, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, username, password, name, role, memberId || null, JSON.stringify(permissions || []), active ? 1 : 0);
    res.json({ id, username, password, name, role, memberId, permissions, active });
});

app.put('/api/users/:id', (req, res) => {
    const { id } = req.params;
    const { username, password, name, role, memberId, permissions, active } = req.body;
    db.prepare(`
        UPDATE users SET username = ?, password = ?, name = ?, role = ?, member_id = ?, permissions = ?, active = ?
        WHERE id = ?
    `).run(username, password, name, role, memberId || null, JSON.stringify(permissions || []), active ? 1 : 0, id);
    res.json({ success: true });
});

app.delete('/api/users/:id', (req, res) => {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// ==================== USER SETTINGS ROUTES ====================

app.get('/api/settings/:userId', (req, res) => {
    const settings = db.prepare('SELECT setting_key, setting_value FROM user_settings WHERE user_id = ?').all(req.params.userId);
    const result = {};
    settings.forEach(s => result[s.setting_key] = s.setting_value);
    res.json(result);
});

app.put('/api/settings/:userId', (req, res) => {
    const { userId } = req.params;
    const settings = req.body; // { key: value, key2: value2 }

    Object.entries(settings).forEach(([key, value]) => {
        db.prepare(`
            INSERT INTO user_settings (id, user_id, setting_key, setting_value)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, setting_key) DO UPDATE SET setting_value = ?
        `).run(uuidv4(), userId, key, value, value);
    });

    res.json({ success: true });
});

// ==================== MEMBER ROUTES ====================

app.get('/api/members', (req, res) => {
    const members = db.prepare('SELECT * FROM members').all();
    members.forEach(m => m.aliases = JSON.parse(m.aliases || '[]'));
    res.json(members);
});

app.post('/api/members', (req, res) => {
    const { name, cedula, aliases, phone, active } = req.body;
    const id = uuidv4();
    const joinedDate = new Date().toISOString();

    db.prepare(`
        INSERT INTO members (id, name, cedula, aliases, phone, active, joined_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, cedula || null, JSON.stringify(aliases || []), phone || null, active ? 1 : 0, joinedDate);

    // Create activity records for new member
    const activities = db.prepare('SELECT id FROM activities').all();
    const identities = (aliases && aliases.length > 0)
        ? aliases.map(alias => ({ memberId: id, actionAlias: alias }))
        : [{ memberId: id, actionAlias: null }];

    activities.forEach(activity => {
        identities.forEach(identity => {
            db.prepare(`
                INSERT INTO member_activities (id, activity_id, member_id, action_alias, tickets_sold, tickets_returned, amount_paid, fully_paid)
                VALUES (?, ?, ?, ?, 0, 0, 0, 0)
            `).run(uuidv4(), activity.id, id, identity.actionAlias);
        });
    });

    res.json({ id, name, cedula, aliases, phone, active, joinedDate });
});

app.put('/api/members/:id', (req, res) => {
    const { id } = req.params;
    const { name, cedula, aliases, phone, active } = req.body;
    db.prepare(`
        UPDATE members SET name = ?, cedula = ?, aliases = ?, phone = ?, active = ?
        WHERE id = ?
    `).run(name, cedula || null, JSON.stringify(aliases || []), phone || null, active ? 1 : 0, id);
    res.json({ success: true });
});

app.delete('/api/members/:id', (req, res) => {
    db.prepare('DELETE FROM members WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// ==================== WEEKLY PAYMENTS ROUTES ====================

app.get('/api/payments/weekly', (req, res) => {
    const payments = db.prepare('SELECT * FROM weekly_payments').all();
    res.json(payments.map(p => ({
        id: p.id,
        memberId: p.member_id,
        actionAlias: p.action_alias,
        year: p.year,
        month: p.month,
        week: p.week,
        amount: p.amount,
        date: p.date
    })));
});

app.post('/api/payments/weekly', (req, res) => {
    const { memberId, actionAlias, year, month, week, amount } = req.body;

    // Check if exists and update or insert
    const existing = db.prepare(`
        SELECT id FROM weekly_payments 
        WHERE member_id = ? AND (action_alias = ? OR (action_alias IS NULL AND ? IS NULL)) AND year = ? AND month = ? AND week = ?
    `).get(memberId, actionAlias, actionAlias, year, month, week);

    if (existing) {
        db.prepare('UPDATE weekly_payments SET amount = ?, date = ? WHERE id = ?')
            .run(amount, new Date().toISOString(), existing.id);
        res.json({ id: existing.id, updated: true });
    } else {
        const id = uuidv4();
        db.prepare(`
            INSERT INTO weekly_payments (id, member_id, action_alias, year, month, week, amount, date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, memberId, actionAlias || null, year, month, week, amount, new Date().toISOString());
        res.json({ id, created: true });
    }
});

// ==================== MONTHLY FEES ROUTES ====================

app.get('/api/payments/monthly', (req, res) => {
    const fees = db.prepare('SELECT * FROM monthly_fees').all();
    res.json(fees.map(f => ({
        id: f.id,
        memberId: f.member_id,
        actionAlias: f.action_alias,
        year: f.year,
        month: f.month,
        amount: f.amount,
        date: f.date
    })));
});

app.post('/api/payments/monthly', (req, res) => {
    const { memberId, actionAlias, year, month, amount } = req.body;

    const existing = db.prepare(`
        SELECT id FROM monthly_fees 
        WHERE member_id = ? AND (action_alias = ? OR (action_alias IS NULL AND ? IS NULL)) AND year = ? AND month = ?
    `).get(memberId, actionAlias, actionAlias, year, month);

    if (existing) {
        db.prepare('UPDATE monthly_fees SET amount = ?, date = ? WHERE id = ?')
            .run(amount, new Date().toISOString(), existing.id);
        res.json({ id: existing.id, updated: true });
    } else {
        const id = uuidv4();
        db.prepare(`
            INSERT INTO monthly_fees (id, member_id, action_alias, year, month, amount, date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, memberId, actionAlias || null, year, month, amount, new Date().toISOString());
        res.json({ id, created: true });
    }
});

// ==================== ACTIVITIES ROUTES ====================

app.get('/api/activities', (req, res) => {
    const activities = db.prepare('SELECT * FROM activities').all();
    res.json(activities.map(a => ({
        id: a.id,
        name: a.name,
        date: a.date,
        description: a.description,
        ticketPrice: a.ticket_price,
        totalTicketsPerMember: a.total_tickets_per_member,
        investment: a.investment
    })));
});

app.post('/api/activities', (req, res) => {
    const { name, date, description, ticketPrice, totalTicketsPerMember, investment } = req.body;
    const id = uuidv4();

    db.prepare(`
        INSERT INTO activities (id, name, date, description, ticket_price, total_tickets_per_member, investment)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, date, description || null, ticketPrice, totalTicketsPerMember || 10, investment || null);

    // Initialize member participation
    const members = db.prepare('SELECT id, aliases FROM members').all();
    members.forEach(member => {
        const aliases = JSON.parse(member.aliases || '[]');
        const identities = aliases.length > 0
            ? aliases.map(alias => ({ memberId: member.id, actionAlias: alias }))
            : [{ memberId: member.id, actionAlias: null }];

        identities.forEach(identity => {
            db.prepare(`
                INSERT INTO member_activities (id, activity_id, member_id, action_alias, tickets_sold, tickets_returned, amount_paid, fully_paid)
                VALUES (?, ?, ?, ?, 0, 0, 0, 0)
            `).run(uuidv4(), id, identity.memberId, identity.actionAlias);
        });
    });

    res.json({ id, name, date, description, ticketPrice, totalTicketsPerMember, investment });
});

app.put('/api/activities/:id', (req, res) => {
    const { id } = req.params;
    const { name, date, description, ticketPrice, totalTicketsPerMember, investment } = req.body;
    db.prepare(`
        UPDATE activities SET name = ?, date = ?, description = ?, ticket_price = ?, total_tickets_per_member = ?, investment = ?
        WHERE id = ?
    `).run(name, date, description || null, ticketPrice, totalTicketsPerMember || 10, investment || null, id);
    res.json({ success: true });
});

app.delete('/api/activities/:id', (req, res) => {
    db.prepare('DELETE FROM member_activities WHERE activity_id = ?').run(req.params.id);
    db.prepare('DELETE FROM activities WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// ==================== MEMBER ACTIVITIES ROUTES ====================

app.get('/api/member-activities', (req, res) => {
    const mas = db.prepare('SELECT * FROM member_activities').all();
    res.json(mas.map(ma => ({
        id: ma.id,
        activityId: ma.activity_id,
        memberId: ma.member_id,
        actionAlias: ma.action_alias,
        ticketsSold: ma.tickets_sold,
        ticketsReturned: ma.tickets_returned,
        amountPaid: ma.amount_paid,
        fullyPaid: ma.fully_paid === 1
    })));
});

app.put('/api/member-activities/:id', (req, res) => {
    const { id } = req.params;
    const { ticketsSold, ticketsReturned, amountPaid, fullyPaid } = req.body;
    db.prepare(`
        UPDATE member_activities SET tickets_sold = ?, tickets_returned = ?, amount_paid = ?, fully_paid = ?
        WHERE id = ?
    `).run(ticketsSold, ticketsReturned, amountPaid, fullyPaid ? 1 : 0, id);
    res.json({ success: true });
});

// ==================== LOANS ROUTES ====================

app.get('/api/loans', (req, res) => {
    const loans = db.prepare('SELECT * FROM loans').all();
    const result = loans.map(l => {
        const payments = db.prepare('SELECT * FROM loan_payments WHERE loan_id = ?').all(l.id);
        return {
            id: l.id,
            memberId: l.member_id,
            actionAlias: l.action_alias,
            clientName: l.client_name,
            borrowerType: l.borrower_type,
            amount: l.amount,
            interestRate: l.interest_rate,
            startDate: l.start_date,
            endDate: l.end_date,
            status: l.status,
            payments: payments.map(p => ({
                id: p.id,
                loanId: p.loan_id,
                amount: p.amount,
                paymentType: p.payment_type,
                date: p.date
            }))
        };
    });
    res.json(result);
});

app.post('/api/loans', (req, res) => {
    const { memberId, actionAlias, clientName, borrowerType, amount, interestRate, startDate, endDate, status } = req.body;
    const id = uuidv4();

    db.prepare(`
        INSERT INTO loans (id, member_id, action_alias, client_name, borrower_type, amount, interest_rate, start_date, end_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, memberId || null, actionAlias || null, clientName || null, borrowerType, amount, interestRate, startDate, endDate, status || 'active');

    res.json({ id, memberId, actionAlias, clientName, borrowerType, amount, interestRate, startDate, endDate, status: status || 'active', payments: [] });
});

app.put('/api/loans/:id', (req, res) => {
    const { id } = req.params;
    const { memberId, actionAlias, clientName, borrowerType, amount, interestRate, startDate, endDate, status } = req.body;
    db.prepare(`
        UPDATE loans SET member_id = ?, action_alias = ?, client_name = ?, borrower_type = ?, amount = ?, interest_rate = ?, start_date = ?, end_date = ?, status = ?
        WHERE id = ?
    `).run(memberId || null, actionAlias || null, clientName || null, borrowerType, amount, interestRate, startDate, endDate, status, id);
    res.json({ success: true });
});

app.delete('/api/loans/:id', (req, res) => {
    db.prepare('DELETE FROM loan_payments WHERE loan_id = ?').run(req.params.id);
    db.prepare('DELETE FROM loans WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// Loan payments
app.post('/api/loans/:id/payments', (req, res) => {
    const { id } = req.params;
    const { amount, paymentType, date } = req.body;
    const paymentId = uuidv4();

    db.prepare(`
        INSERT INTO loan_payments (id, loan_id, amount, payment_type, date)
        VALUES (?, ?, ?, ?, ?)
    `).run(paymentId, id, amount, paymentType, date || new Date().toISOString());

    // Update loan status if fully paid
    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(id);
    const payments = db.prepare('SELECT * FROM loan_payments WHERE loan_id = ?').all(id);
    const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
    const totalDue = loan.amount + (loan.amount * loan.interest_rate / 100);

    if (totalPaid >= totalDue) {
        db.prepare('UPDATE loans SET status = ? WHERE id = ?').run('paid', id);
    }

    res.json({ id: paymentId, loanId: id, amount, paymentType, date: date || new Date().toISOString() });
});

app.put('/api/loans/:loanId/payments/:paymentId', (req, res) => {
    const { loanId, paymentId } = req.params;
    const { amount, paymentType, date } = req.body;

    db.prepare('UPDATE loan_payments SET amount = ?, payment_type = ?, date = ? WHERE id = ?')
        .run(amount, paymentType, date, paymentId);

    // Recalculate loan status
    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId);
    const payments = db.prepare('SELECT * FROM loan_payments WHERE loan_id = ?').all(loanId);
    const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
    const totalDue = loan.amount + (loan.amount * loan.interest_rate / 100);

    db.prepare('UPDATE loans SET status = ? WHERE id = ?').run(totalPaid >= totalDue ? 'paid' : 'active', loanId);

    res.json({ success: true });
});

app.delete('/api/loans/:loanId/payments/:paymentId', (req, res) => {
    const { loanId, paymentId } = req.params;

    db.prepare('DELETE FROM loan_payments WHERE id = ?').run(paymentId);

    // Recalculate loan status
    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId);
    const payments = db.prepare('SELECT * FROM loan_payments WHERE loan_id = ?').all(loanId);
    const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
    const totalDue = loan.amount + (loan.amount * loan.interest_rate / 100);

    db.prepare('UPDATE loans SET status = ? WHERE id = ?').run(totalPaid >= totalDue ? 'paid' : 'active', loanId);

    res.json({ success: true });
});

// ==================== DATA MIGRATION (one-time endpoint to import from localStorage) ====================

app.post('/api/migrate', (req, res) => {
    const { members, weeklyPayments, monthlyFees, activities, memberActivities, loans, users } = req.body;

    try {
        // Import members
        if (members) {
            members.forEach(m => {
                const existing = db.prepare('SELECT id FROM members WHERE id = ?').get(m.id);
                if (!existing) {
                    db.prepare(`
                        INSERT INTO members (id, name, cedula, aliases, phone, active, joined_date)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `).run(m.id, m.name, m.cedula || null, JSON.stringify(m.aliases || []), m.phone || null, m.active ? 1 : 0, m.joinedDate);
                }
            });
        }

        // Import users
        if (users) {
            users.forEach(u => {
                const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(u.id);
                if (!existing) {
                    db.prepare(`
                        INSERT INTO users (id, username, password, name, role, member_id, permissions, active)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `).run(u.id, u.username, u.password, u.name, u.role, u.memberId || null, JSON.stringify(u.permissions || []), u.active ? 1 : 0);
                }
            });
        }

        // Import weekly payments
        if (weeklyPayments) {
            weeklyPayments.forEach(p => {
                const existing = db.prepare('SELECT id FROM weekly_payments WHERE id = ?').get(p.id);
                if (!existing) {
                    db.prepare(`
                        INSERT INTO weekly_payments (id, member_id, action_alias, year, month, week, amount, date)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `).run(p.id, p.memberId, p.actionAlias || null, p.year, p.month, p.week, p.amount, p.date);
                }
            });
        }

        // Import monthly fees
        if (monthlyFees) {
            monthlyFees.forEach(f => {
                const existing = db.prepare('SELECT id FROM monthly_fees WHERE id = ?').get(f.id);
                if (!existing) {
                    db.prepare(`
                        INSERT INTO monthly_fees (id, member_id, action_alias, year, month, amount, date)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `).run(f.id, f.memberId, f.actionAlias || null, f.year, f.month, f.amount, f.date);
                }
            });
        }

        // Import activities
        if (activities) {
            activities.forEach(a => {
                const existing = db.prepare('SELECT id FROM activities WHERE id = ?').get(a.id);
                if (!existing) {
                    db.prepare(`
                        INSERT INTO activities (id, name, date, description, ticket_price, total_tickets_per_member, investment)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `).run(a.id, a.name, a.date, a.description || null, a.ticketPrice, a.totalTicketsPerMember || 10, a.investment || null);
                }
            });
        }

        // Import member activities
        if (memberActivities) {
            memberActivities.forEach(ma => {
                const existing = db.prepare('SELECT id FROM member_activities WHERE id = ?').get(ma.id);
                if (!existing) {
                    db.prepare(`
                        INSERT INTO member_activities (id, activity_id, member_id, action_alias, tickets_sold, tickets_returned, amount_paid, fully_paid)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `).run(ma.id, ma.activityId, ma.memberId, ma.actionAlias || null, ma.ticketsSold, ma.ticketsReturned, ma.amountPaid, ma.fullyPaid ? 1 : 0);
                }
            });
        }

        // Import loans
        if (loans) {
            loans.forEach(l => {
                const existing = db.prepare('SELECT id FROM loans WHERE id = ?').get(l.id);
                if (!existing) {
                    db.prepare(`
                        INSERT INTO loans (id, member_id, action_alias, client_name, borrower_type, amount, interest_rate, start_date, end_date, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `).run(l.id, l.memberId || null, l.actionAlias || null, l.clientName || null, l.borrowerType, l.amount, l.interestRate, l.startDate, l.endDate, l.status);

                    // Import loan payments
                    if (l.payments) {
                        l.payments.forEach(p => {
                            const pExists = db.prepare('SELECT id FROM loan_payments WHERE id = ?').get(p.id);
                            if (!pExists) {
                                db.prepare(`
                                    INSERT INTO loan_payments (id, loan_id, amount, payment_type, date)
                                    VALUES (?, ?, ?, ?, ?)
                                `).run(p.id, l.id, p.amount, p.paymentType, p.date);
                            }
                        });
                    }
                }
            });
        }

        res.json({ success: true, message: 'Datos migrados correctamente' });
    } catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Banquito API Server running on http://localhost:${PORT}`);
});
