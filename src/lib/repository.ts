import { isSupabaseConfigured } from './supabase'
import { LocalRepository } from './localRepo'
import { SupabaseRepository } from './supabaseRepo'
import type { Repository } from './types'

/** Supabase env değişkenleri tanımlı değilse true olur (demo modu). */
export const isDemo = !isSupabaseConfigured

export const repo: Repository = isSupabaseConfigured
  ? new SupabaseRepository()
  : new LocalRepository()
