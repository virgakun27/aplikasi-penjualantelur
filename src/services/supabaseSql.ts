// =========================================================
// EGGTRACK SUPABASE SQL SCRIPTS & SCHEMA GENERATOR
// Script otomatis pembuatan tabel, index, RLS, trigger, & seeder
// =========================================================

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected?: boolean;
  lastSyncedAt?: string | null;
}

export const generateFullSupabaseSql = (farmName: string = 'Peternakan Ayam Petelur Sejahtera', dailyTargetKg: number = 30): string => {
  return `-- =========================================================
-- EGGTRACK - SUPABASE DATABASE MIGRATION SCRIPT
-- Menyiapkan 6 Tabel Utama, Index Performa, RLS, & Realtime
-- Tanggal Dibuat: ${new Date().toISOString().split('T')[0]}
-- =========================================================

-- 1. AKTIFKAN EKSTENSI UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================
-- 2. PEMBUATAN TABEL-TABEL UTAMA
-- =========================================================

-- TABEL 1: USERS (PENGGUNA & ROLE BASED ACCESS CONTROL)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Pengelola', 'Kasir')),
    status TEXT NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TABEL 2: PRODUCTION (PENCATATAN PRODUKSI TELUR HARIAN)
CREATE TABLE IF NOT EXISTS public.production (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    weight_kg NUMERIC(10, 2) NOT NULL CHECK (weight_kg >= 0),
    eggs_per_kg NUMERIC(10, 2) DEFAULT 16,
    notes TEXT,
    recorded_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TABEL 3: SALES (TRANSAKSI PENJUALAN TELUR)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    customer_name TEXT DEFAULT 'Penjualan Telur',
    quantity INTEGER DEFAULT 0,
    weight_kg NUMERIC(10, 2) NOT NULL CHECK (weight_kg > 0),
    price_per_unit NUMERIC(12, 2) NOT NULL CHECK (price_per_unit >= 0),
    total_amount NUMERIC(14, 2) NOT NULL CHECK (total_amount >= 0),
    payment_status TEXT NOT NULL CHECK (payment_status IN ('Lunas', 'Belum Lunas')),
    recorded_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TABEL 4: EXPENSES (PENGELUARAN BIAYA OPERASIONAL)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    description TEXT,
    recorded_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TABEL 5: CAPITAL_CONVERSIONS (KONVERSI ALOKASI MODAL KERJA)
CREATE TABLE IF NOT EXISTS public.capital_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    allocation TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Selesai' CHECK (status IN ('Rencana', 'Selesai')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- TABEL 6: SETTINGS (KONFIGURASI STANDAR PETERNAKAN)
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_name TEXT NOT NULL DEFAULT '${farmName.replace(/'/g, "''")}',
    price_per_kg NUMERIC(12, 2) NOT NULL DEFAULT 28000,
    daily_target_kg NUMERIC(10, 2) NOT NULL DEFAULT ${dailyTargetKg},
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================
-- 3. INDEX UNTUK OPTIMASI PERFORMA QUERY
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_production_date ON public.production(date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_conversions_date ON public.capital_conversions(date DESC);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- =========================================================
-- 4. AKTIFKAN ROW LEVEL SECURITY (RLS) PADA SEMUA TABEL
-- =========================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capital_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 5. KEBIJAKAN KEAMANAN (RLS POLICIES)
-- Memberikan akses penuh CRUD untuk aplikasi frontend
-- =========================================================
DROP POLICY IF EXISTS "Akses Penuh Users" ON public.users;
CREATE POLICY "Akses Penuh Users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh Produksi" ON public.production;
CREATE POLICY "Akses Penuh Produksi" ON public.production FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh Penjualan" ON public.sales;
CREATE POLICY "Akses Penuh Penjualan" ON public.sales FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh Pengeluaran" ON public.expenses;
CREATE POLICY "Akses Penuh Pengeluaran" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh Konversi Modal" ON public.capital_conversions;
CREATE POLICY "Akses Penuh Konversi Modal" ON public.capital_conversions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh Settings" ON public.settings;
CREATE POLICY "Akses Penuh Settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

-- =========================================================
-- 6. PUBLIKASI REALTIME (OPSIONAL - SINKRONISASI INSTAN)
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'production'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.production, public.sales, public.expenses, public.capital_conversions, public.users, public.settings;
  END IF;
END $$;

-- =========================================================
-- 7. DATA AWAL (SEED DATA DEFAULT PENGGUNA & PENGATURAN)
-- =========================================================
INSERT INTO public.users (name, username, password, role, status)
VALUES 
  ('Pemilik Farm (Owner)', 'admin', 'admin123', 'Admin', 'Aktif'),
  ('Operator Kandang', 'operator', '123456', 'Pengelola', 'Aktif'),
  ('Kasir Toko', 'kasir', '123456', 'Kasir', 'Aktif')
ON CONFLICT (username) DO NOTHING;

INSERT INTO public.settings (farm_name, price_per_kg, daily_target_kg)
VALUES ('${farmName.replace(/'/g, "''")}', 28000, ${dailyTargetKg})
ON CONFLICT DO NOTHING;
`;
};

export const generateTablesOnlySql = (): string => {
  return `-- =========================================================
-- STRUKTUR TABEL & INDEX SAJA (TANPA RLS)
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Pengelola', 'Kasir')),
    status TEXT NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.production (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    weight_kg NUMERIC(10, 2) NOT NULL CHECK (weight_kg >= 0),
    eggs_per_kg NUMERIC(10, 2) DEFAULT 16,
    notes TEXT,
    recorded_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    customer_name TEXT DEFAULT 'Penjualan Telur',
    quantity INTEGER DEFAULT 0,
    weight_kg NUMERIC(10, 2) NOT NULL CHECK (weight_kg > 0),
    price_per_unit NUMERIC(12, 2) NOT NULL CHECK (price_per_unit >= 0),
    total_amount NUMERIC(14, 2) NOT NULL CHECK (total_amount >= 0),
    payment_status TEXT NOT NULL CHECK (payment_status IN ('Lunas', 'Belum Lunas')),
    recorded_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    description TEXT,
    recorded_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.capital_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    allocation TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Selesai' CHECK (status IN ('Rencana', 'Selesai')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_name TEXT NOT NULL DEFAULT 'Peternakan Ayam Petelur Sejahtera',
    price_per_kg NUMERIC(12, 2) NOT NULL DEFAULT 28000,
    daily_target_kg NUMERIC(10, 2) NOT NULL DEFAULT 30.0,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_production_date ON public.production(date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_conversions_date ON public.capital_conversions(date DESC);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
`;
};

export const generateRlsOnlySql = (): string => {
  return `-- =========================================================
-- KEBIJAKAN ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capital_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses Penuh Users" ON public.users;
CREATE POLICY "Akses Penuh Users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh Produksi" ON public.production;
CREATE POLICY "Akses Penuh Produksi" ON public.production FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh Penjualan" ON public.sales;
CREATE POLICY "Akses Penuh Penjualan" ON public.sales FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh Pengeluaran" ON public.expenses;
CREATE POLICY "Akses Penuh Pengeluaran" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh Konversi Modal" ON public.capital_conversions;
CREATE POLICY "Akses Penuh Konversi Modal" ON public.capital_conversions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Penuh Settings" ON public.settings;
CREATE POLICY "Akses Penuh Settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);
`;
};

export const generateSeedOnlySql = (farmName: string = 'Peternakan Ayam Petelur Sejahtera', dailyTargetKg: number = 30): string => {
  return `-- =========================================================
-- DATA AWAL (SEED DATA DEFAULT)
-- =========================================================

INSERT INTO public.users (name, username, password, role, status)
VALUES 
  ('Pemilik Farm (Owner)', 'admin', 'admin123', 'Admin', 'Aktif'),
  ('Operator Kandang', 'operator', '123456', 'Pengelola', 'Aktif'),
  ('Kasir Toko', 'kasir', '123456', 'Kasir', 'Aktif')
ON CONFLICT (username) DO NOTHING;

INSERT INTO public.settings (farm_name, price_per_kg, daily_target_kg)
VALUES ('${farmName.replace(/'/g, "''")}', 28000, ${dailyTargetKg})
ON CONFLICT DO NOTHING;
`;
};
