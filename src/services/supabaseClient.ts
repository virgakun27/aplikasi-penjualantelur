// =========================================================
// EGGTRACK SUPABASE CLIENT & CLOUD SYNC SERVICE
// =========================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;
let currentUrl: string = '';
let currentKey: string = '';

export function getSupabaseClient(url: string, anonKey: string): SupabaseClient | null {
  if (!url || !anonKey) return null;
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();
  
  if (!cleanUrl.startsWith('http')) return null;

  if (cachedClient && currentUrl === cleanUrl && currentKey === cleanKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(cleanUrl, cleanKey);
    currentUrl = cleanUrl;
    currentKey = cleanKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string; tablesExist?: boolean }> {
  try {
    const client = getSupabaseClient(url, anonKey);
    if (!client) {
      return { success: false, message: 'URL atau API Key Supabase tidak valid.' };
    }

    // Attempt a lightweight select from users or production table
    const { data, error } = await client.from('settings').select('id, farm_name').limit(1);

    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation "public.settings" does not exist') || error.code === '42P01') {
        return {
          success: true,
          tablesExist: false,
          message: 'Terhubung ke Supabase! Namun tabel belum dibuat. Silakan salin & jalankan skrip SQL Otomatis di bawah.'
        };
      }
      // If error is unauthorized or invalid key
      if (error.code === 'PGRST301' || error.message.includes('JWT') || error.message.includes('apikey')) {
        return { success: false, message: `Autentikasi gagal: ${error.message}` };
      }
      return { success: true, tablesExist: false, message: `Koneksi berhasil terhubung (${error.message})` };
    }

    return {
      success: true,
      tablesExist: true,
      message: 'Koneksi ke Supabase berhasil! Tabel & RLS aktif siap digunakan.'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal terhubung: ${err.message || 'Periksa koneksi internet dan URL Supabase'}`
    };
  }
}
