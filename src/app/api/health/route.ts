import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { status: 'error', message: '環境變數未設定' },
        { status: 503 }
      );
    }

    // 簡單查詢確認 DB 連線正常
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { error } = await supabase
      .from('regions')
      .select('id', { count: 'exact', head: true });

    const latencyMs = Date.now() - start;

    if (error) {
      return NextResponse.json(
        { status: 'error', db: 'unreachable', latency_ms: latencyMs },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { status: 'ok', db: 'connected', latency_ms: latencyMs },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { status: 'error', db: 'unreachable', latency_ms: Date.now() - start },
      { status: 503 }
    );
  }
}
