/**
 * User profile type from database
 */
export type UserProfile = {
  id: string
  email: string
  full_name: string | null
  phone_number: string | null
  role: 'user' | 'admin'
  subscription_tier: 'free' | 'pro'
  nha_mang_mac_dinh: string
  is_locked: boolean
  created_at: string
  updated_at: string
}

/**
 * Cellfile type
 */
export type Cellfile = {
  id: number
  user_id: string
  site_name: string
  cell_name: string
  latitude: number
  longitude: number
  location: unknown // PostGIS geography type
  rat: '2G' | '3G' | '4G' | '5G'
  band: string | null
  nha_mang: string | null
  azimuth: number | null
  radius: number | null
  source_file: string | null
  created_at: string
  updated_at: string
}

/**
 * Logfile type
 */
export type Logfile = {
  id: number
  user_id: string
  session_name: string
  session_date: string
  device_info: Record<string, unknown> | null
  notes: string | null
  created_at: string
  updated_at: string
}

/**
 * Measurement type
 */
export type Measurement = {
  id: number
  logfile_id: number
  user_id: string
  timestamp: string
  latitude: number | null
  longitude: number | null
  location: unknown // PostGIS geography type
  cell_id: string | null
  cell_name: string | null
  pci: number | null
  rsrp: number | null
  rsrq: number | null
  sinr: number | null
  rat: '2G' | '3G' | '4G' | '5G' | null
  band: string | null
  mcc: number | null
  mnc: number | null
  nha_mang: string | null
  download_speed_mbps: number | null
  upload_speed_mbps: number | null
  latitude_accuracy: number | null
  created_at: string
}

/**
 * Report type
 */
export type Report = {
  id: number
  user_id: string
  logfile_id: number
  report_type: 'word' | 'excel' | 'kml' | 'png'
  file_url: string
  file_size: number | null
  created_at: string
}

/**
 * Subscription type
 */
export type Subscription = {
  id: number
  user_id: string
  subscription_tier: 'free' | 'pro'
  payment_method: 'momo' | 'vnpay' | 'stripe' | 'none' | null
  payment_status: 'pending' | 'completed' | 'failed' | 'cancelled'
  transaction_id: string | null
  billing_cycle_start: string | null
  billing_cycle_end: string | null
  amount_paid: number | null
  created_at: string
  updated_at: string
}

/**
 * Chat session type
 */
export type ChatSession = {
  id: string
  user_id: string
  session_start: string
  session_end: string | null
  created_at: string
}

/**
 * Chat message type
 */
export type ChatMessage = {
  id: string
  session_id: string
  user_id: string
  message_text: string
  message_role: 'user' | 'assistant'
  sources: Record<string, unknown> | null
  created_at: string
}

/**
 * Benchmark aggregate type (admin-only)
 */
export type BenchmarkAggregate = {
  id: number
  geohash: string
  latitude: number
  longitude: number
  nha_mang: string
  rat: '2G' | '3G' | '4G' | '5G' | null
  band: string | null
  sample_count: number
  avg_rsrp: number | null
  median_rsrp: number | null
  avg_rsrq: number | null
  median_rsrq: number | null
  avg_sinr: number | null
  median_sinr: number | null
  avg_download_mbps: number | null
  median_download_mbps: number | null
  timestamp_start: string | null
  timestamp_end: string | null
  created_at: string
  updated_at: string
}

/**
 * Audit log type
 */
export type AuditLog = {
  id: number
  admin_id: string
  action: string
  target_table: string | null
  target_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

/**
 * App ping type (Phase 0.5 usage stats)
 */
export type AppPing = {
  id: number
  device_id: string
  event: 'open' | 'login_success' | 'heartbeat'
  app_version: string | null
  user_id: string | null
  created_at: string
}

/**
 * Auth response types
 */
export type AuthResponse<T> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Pagination type
 */
export type PaginationParams = {
  page: number
  limit: number
}

/**
 * API response type
 */
export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
  message?: string
}
