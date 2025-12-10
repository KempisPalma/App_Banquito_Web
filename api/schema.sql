-- Enable UUID extension (optional if generating UUIDs in app, but good practice)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Members table
CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cedula TEXT UNIQUE,
    aliases JSONB, -- JSON array
    phone TEXT,
    active BOOLEAN DEFAULT true,
    joined_date TIMESTAMP WITH TIME ZONE
);

-- Weekly payments table
CREATE TABLE IF NOT EXISTS weekly_payments (
    id TEXT PRIMARY KEY,
    member_id TEXT REFERENCES members(id),
    action_alias TEXT,
    year INTEGER,
    month INTEGER,
    week INTEGER,
    amount NUMERIC,
    date TIMESTAMP WITH TIME ZONE,
    UNIQUE(member_id, action_alias, year, month, week)
);

-- Monthly fees table
CREATE TABLE IF NOT EXISTS monthly_fees (
    id TEXT PRIMARY KEY,
    member_id TEXT REFERENCES members(id),
    action_alias TEXT,
    year INTEGER,
    month INTEGER,
    amount NUMERIC,
    date TIMESTAMP WITH TIME ZONE,
    UNIQUE(member_id, action_alias, year, month)
);

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE,
    description TEXT,
    ticket_price NUMERIC,
    total_tickets_per_member INTEGER DEFAULT 10,
    investment NUMERIC
);

-- Member activities (participation)
CREATE TABLE IF NOT EXISTS member_activities (
    id TEXT PRIMARY KEY,
    activity_id TEXT REFERENCES activities(id) ON DELETE CASCADE,
    member_id TEXT REFERENCES members(id),
    action_alias TEXT,
    tickets_sold INTEGER DEFAULT 0,
    tickets_returned INTEGER DEFAULT 0,
    amount_paid NUMERIC DEFAULT 0,
    fully_paid BOOLEAN DEFAULT false
);

-- Loans table
CREATE TABLE IF NOT EXISTS loans (
    id TEXT PRIMARY KEY,
    member_id TEXT REFERENCES members(id),
    action_alias TEXT,
    client_name TEXT,
    borrower_type TEXT,
    amount NUMERIC,
    interest_rate NUMERIC,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active',
    pending_principal NUMERIC,
    pending_interest NUMERIC,
    last_payment_date TIMESTAMP WITH TIME ZONE,
    next_due_date TIMESTAMP WITH TIME ZONE
);

-- Loan payments table
CREATE TABLE IF NOT EXISTS loan_payments (
    id TEXT PRIMARY KEY,
    loan_id TEXT REFERENCES loans(id) ON DELETE CASCADE,
    amount NUMERIC,
    payment_type TEXT,
    date TIMESTAMP WITH TIME ZONE
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'user',
    member_id TEXT REFERENCES members(id),
    permissions JSONB,
    active BOOLEAN DEFAULT true
);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    setting_key TEXT NOT NULL,
    setting_value TEXT,
    UNIQUE(user_id, setting_key)
);
