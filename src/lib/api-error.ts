/**
 * API Route 統一錯誤處理
 * 所有錯誤回應使用繁體中文、統一 JSON 格式、附帶 console.error 日誌
 */
import { NextResponse } from 'next/server';

/** 標準錯誤回應（附 log） */
export function apiError(
  message: string,
  status: number = 500,
  originalError?: unknown
): NextResponse {
  if (originalError) {
    const errMsg = originalError instanceof Error ? originalError.message : String(originalError);
    console.error(`[API ${status}] ${message}:`, errMsg);
  }
  return NextResponse.json({ error: message }, { status });
}

/** 常用錯誤回應快捷函式 */
export const API_ERRORS = {
  /** 500 - 伺服器內部錯誤 */
  internal: (err?: unknown) => apiError('伺服器內部錯誤', 500, err),
  /** 500 - 環境設定缺失 */
  missingConfig: () => apiError('伺服器設定缺失', 500),
  /** 400 - 缺少必要參數 */
  missingParam: (param: string) => apiError(`缺少必要參數：${param}`, 400),
  /** 400 - 無效參數 */
  invalidParam: (detail: string) => apiError(`參數無效：${detail}`, 400),
  /** 404 - 找不到資源 */
  notFound: (resource: string) => apiError(`找不到${resource}`, 404),
  /** 500 - 資料庫錯誤 */
  dbError: (err: unknown) => apiError('資料庫操作失敗', 500, err),
} as const;
