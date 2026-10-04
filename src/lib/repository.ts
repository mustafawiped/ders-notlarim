import { isSupabaseConfigured } from './supabase'
import { LocalRepository } from './localRepo'
import { SupabaseRepository } from './supabaseRepo'
import type { Repository } from './types'

/** Supabase env değişkenleri tanımlı değilse true olur (demo modu). */
export const isDemo = !isSupabaseConfigured

/**
 * Supabase bağlıysa ve kullanıcı oturum açtıysa kullanıcıya özel
 * Supabase deposu; aksi halde tarayıcı içi demo deposu döner.
 */
export function createRepository(userId?: string): Repository {
  return isSupabaseConfigured && userId ? new SupabaseRepository(userId) : new LocalRepository()
}
