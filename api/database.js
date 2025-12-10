import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure db directory exists
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'banquito.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
    -- Members table
    CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        cedula TEXT UNIQUE,
        aliases TEXT, -- JSON array
        phone TEXT,
        active INTEGER DEFAULT 1,
        joined_date TEXT
    );

    -- Weekly payments table
    CREATE TABLE IF NOT EXISTS weekly_payments (
        id TEXT PRIMARY KEY,
        member_id TEXT,
        action_alias TEXT,
        year INTEGER,
        month INTEGER,
        week INTEGER,
        amount REAL,
        date TEXT,
        UNIQUE(member_id, action_alias, year, month, week)
    );

    -- Monthly fees table
    CREATE TABLE IF NOT EXISTS monthly_fees (
        id TEXT PRIMARY KEY,
        member_id TEXT,
        action_alias TEXT,
        year INTEGER,
        month INTEGER,
        amount REAL,
        date TEXT,
        UNIQUE(member_id, action_alias, year, month)
    );

    -- Activities table
    CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        date TEXT,
        description TEXT,
        ticket_price REAL,
        total_tickets_per_member INTEGER DEFAULT 10,
        investment REAL
    );

    -- Member activities (participation)
    CREATE TABLE IF NOT EXISTS member_activities (
        id TEXT PRIMARY KEY,
        activity_id TEXT,
        member_id TEXT,
        action_alias TEXT,
        tickets_sold INTEGER DEFAULT 0,
        tickets_returned INTEGER DEFAULT 0,
        amount_paid REAL DEFAULT 0,
        fully_paid INTEGER DEFAULT 0
    );

    -- Loans table
    CREATE TABLE IF NOT EXISTS loans (
        id TEXT PRIMARY KEY,
        member_id TEXT,
        action_alias TEXT,
        client_name TEXT,
        borrower_type TEXT,
        amount REAL,
        interest_rate REAL,
        start_date TEXT,
        end_date TEXT,
        status TEXT DEFAULT 'active'
    );

    -- Loan payments table
    CREATE TABLE IF NOT EXISTS loan_payments (
        id TEXT PRIMARY KEY,
        loan_id TEXT,
        amount REAL,
        payment_type TEXT,
        date TEXT
    );

    -- Users table
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'user',
        member_id TEXT,
        permissions TEXT, -- JSON array
        active INTEGER DEFAULT 1
    );

    -- User settings table (for storing preferences like selected month, year, view mode, etc.)
    CREATE TABLE IF NOT EXISTS user_settings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        setting_key TEXT NOT NULL,
        setting_value TEXT,
        UNIQUE(user_id, setting_key)
    );
`);

// ==================== MIGRATIONS ====================
try {
    db.prepare('ALTER TABLE loans ADD COLUMN pending_principal REAL').run();
} catch (error) {
    // Column likely exists
}

try {
    db.prepare('ALTER TABLE loans ADD COLUMN pending_interest REAL').run();
} catch (error) {
    // Column likely exists
}

try {
    db.prepare('ALTER TABLE loans ADD COLUMN last_payment_date TEXT').run();
} catch (error) {
    // Column likely exists
}

try {
    db.prepare('ALTER TABLE loans ADD COLUMN next_due_date TEXT').run();
} catch (error) {
    // Column likely exists
}

// Insert default admin user if not exists
const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!adminExists) {
    const { v4: uuidv4 } = await import('uuid');
    db.prepare(`
        INSERT INTO users (id, username, password, name, role, permissions, active)
        VALUES (?, 'admin', 'admin', 'Administrador', 'admin', '["admin"]', 1)
    `).run(uuidv4());
    console.log('Default admin user created');
}

export default db;
