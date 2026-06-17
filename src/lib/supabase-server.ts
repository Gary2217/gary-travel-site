/**
 * API Route 共用 Supabase 客戶端工廠
 * 每次呼叫都建立新 instance（符合 CLAUDE.md 規則：不共用 instance）
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** 建立 anon key 客戶端（公開讀取） */
export function createAnonClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

/** 建立 service role 客戶端（管理寫入） */
export function createServiceClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

/** 建立不快取的 anon 客戶端（edge runtime 用） */
export function createAnonClientNoCache() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: (url: RequestInfo | URL, init?: RequestInit) =>
        fetch(url, { ...init, cache: 'no-store' }),
    },
  });
}

/** 環境變數檢查 */
export function hasSupabaseConfig() {
  return !!(supabaseUrl && supabaseAnonKey);
}

export function hasServiceRoleConfig() {
  return !!(supabaseUrl && supabaseServiceRoleKey);
}
