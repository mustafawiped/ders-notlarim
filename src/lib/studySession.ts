import { supabase } from './supabase'

export interface StudySession {
  id: string
  ownerId: string
  partnerId: string | null
  timerMode: 'focus' | 'shortBreak' | 'longBreak'
  timerRunning: boolean
  timerStartedAt: string | null
  timerRemaining: number // saniye
  sharedCourseIds: string[]
  status: 'active' | 'ended'
  createdAt: string
  updatedAt: string
}

export interface StudyInvite {
  id: string
  fromUserId: string
  fromEmail?: string
  toEmail: string
  toUserId: string | null
  sessionId: string
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  createdAt: string
  expiresAt: string
}

function mapSession(row: Record<string, unknown>): StudySession {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    partnerId: row.partner_id ? String(row.partner_id) : null,
    timerMode: (row.timer_mode as 'focus' | 'shortBreak' | 'longBreak') ?? 'focus',
    timerRunning: Boolean(row.timer_running),
    timerStartedAt: row.timer_started_at ? String(row.timer_started_at) : null,
    timerRemaining: Number(row.timer_remaining ?? 1500),
    sharedCourseIds: (row.shared_course_ids as string[]) ?? [],
    status: (row.status as 'active' | 'ended') ?? 'active',
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

function mapInvite(row: Record<string, unknown>): StudyInvite {
  return {
    id: String(row.id),
    fromUserId: String(row.from_user_id),
    fromEmail: row.from_email ? String(row.from_email) : undefined,
    toEmail: String(row.to_email),
    toUserId: row.to_user_id ? String(row.to_user_id) : null,
    sessionId: String(row.session_id),
    status: (row.status as StudyInvite['status']) ?? 'pending',
    createdAt: String(row.created_at),
    expiresAt: String(row.expires_at),
  }
}

/** Mevcut aktif oturumu döner (sahibi veya ortağı olarak). */
export async function getActiveSession(userId: string): Promise<StudySession | null> {
  const client = supabase!
  const { data, error } = await client
    .from('study_sessions')
    .select('*')
    .eq('status', 'active')
    .or(`owner_id.eq.${userId},partner_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data ? mapSession(data as Record<string, unknown>) : null
}

/** Yeni çalışma oturumu oluşturur. */
export async function createSession(
  userId: string,
  sharedCourseIds: string[] = [],
  focusMins = 25,
): Promise<StudySession> {
  const client = supabase!
  const { data, error } = await client
    .from('study_sessions')
    .insert({
      owner_id: userId,
      shared_course_ids: sharedCourseIds,
      timer_remaining: focusMins * 60,
    })
    .select()
    .single()
  if (error) throw error
  return mapSession(data as Record<string, unknown>)
}

/** Oturumu sona erdirir. */
export async function endSession(sessionId: string): Promise<void> {
  const client = supabase!
  const { error } = await client
    .from('study_sessions')
    .update({ status: 'ended', timer_running: false, updated_at: new Date().toISOString() })
    .eq('id', sessionId)
  if (error) throw error
}

/** Timer state'ini günceller (Realtime üzerinden diğerine sync olur). */
export async function updateTimerState(
  sessionId: string,
  patch: {
    timerRunning?: boolean
    timerStartedAt?: string | null
    timerRemaining?: number
    timerMode?: 'focus' | 'shortBreak' | 'longBreak'
  },
): Promise<void> {
  const client = supabase!
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.timerRunning !== undefined) update.timer_running = patch.timerRunning
  if ('timerStartedAt' in patch) update.timer_started_at = patch.timerStartedAt
  if (patch.timerRemaining !== undefined) update.timer_remaining = patch.timerRemaining
  if (patch.timerMode !== undefined) update.timer_mode = patch.timerMode

  const { error } = await client.from('study_sessions').update(update).eq('id', sessionId)
  if (error) throw error
}

/** Paylaşılan ders listesini günceller. */
export async function updateSharedCourses(
  sessionId: string,
  courseIds: string[],
): Promise<void> {
  const client = supabase!
  const { error } = await client
    .from('study_sessions')
    .update({ shared_course_ids: courseIds, updated_at: new Date().toISOString() })
    .eq('id', sessionId)
  if (error) throw error
}

/** E-posta'ya çalışma daveti gönderir. */
export async function sendInvite(
  fromUserId: string,
  sessionId: string,
  toEmail: string,
): Promise<StudyInvite> {
  const client = supabase!

  // E-posta'ya karşılık gelen kullanıcıyı bul
  const { data: profile } = await client
    .from('profiles')
    .select('id')
    .eq('email', toEmail.trim().toLowerCase())
    .maybeSingle()

  const toUserId = profile ? String((profile as Record<string, unknown>).id) : null

  const { data, error } = await client
    .from('study_invites')
    .insert({
      from_user_id: fromUserId,
      to_email: toEmail.trim().toLowerCase(),
      to_user_id: toUserId,
      session_id: sessionId,
    })
    .select()
    .single()

  if (error) throw error
  return mapInvite(data as Record<string, unknown>)
}

/** Kullanıcının bekleyen davetlerini getirir. */
export async function getPendingInvites(userId: string): Promise<StudyInvite[]> {
  const client = supabase!

  const { data, error } = await client
    .from('study_invites')
    .select(`
      *,
      profiles!study_invites_from_user_id_fkey (email)
    `)
    .eq('to_user_id', userId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) throw error

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    ...mapInvite(row),
    fromEmail: row.profiles
      ? String((row.profiles as Record<string, unknown>).email ?? '')
      : undefined,
  }))
}

/** Daveti kabul eder ve oturuma ortak olarak katılır. */
export async function acceptInvite(
  inviteId: string,
  sessionId: string,
  userId: string,
): Promise<void> {
  const client = supabase!

  // Daveti kabul et
  const { error: inviteErr } = await client
    .from('study_invites')
    .update({ status: 'accepted' })
    .eq('id', inviteId)
  if (inviteErr) throw inviteErr

  // Oturuma ortak olarak ekle
  const { error: sessionErr } = await client
    .from('study_sessions')
    .update({ partner_id: userId, updated_at: new Date().toISOString() })
    .eq('id', sessionId)
  if (sessionErr) throw sessionErr
}

/** Daveti reddeder. */
export async function rejectInvite(inviteId: string): Promise<void> {
  const client = supabase!
  const { error } = await client
    .from('study_invites')
    .update({ status: 'rejected' })
    .eq('id', inviteId)
  if (error) throw error
}

/**
 * Oturum değişikliklerini realtime olarak dinler.
 * Temizleme fonksiyonu döner.
 */
export function subscribeToSession(
  sessionId: string,
  onUpdate: (session: StudySession) => void,
): () => void {
  const client = supabase!
  const channel = client
    .channel(`session-${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'study_sessions',
        filter: `id=eq.${sessionId}`,
      },
      (payload) => {
        onUpdate(mapSession(payload.new as Record<string, unknown>))
      },
    )
    .subscribe()

  return () => {
    void client.removeChannel(channel)
  }
}

/**
 * Kullanıcıya gelen yeni davetleri realtime olarak dinler.
 */
export function subscribeToInvites(
  userId: string,
  onNewInvite: (invite: StudyInvite) => void,
): () => void {
  const client = supabase!
  const channel = client
    .channel(`invites-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'study_invites',
        filter: `to_user_id=eq.${userId}`,
      },
      (payload) => {
        onNewInvite(mapInvite(payload.new as Record<string, unknown>))
      },
    )
    .subscribe()

  return () => {
    void client.removeChannel(channel)
  }
}

/**
 * Anlık kalan süreyi hesaplar.
 * timerStartedAt ve timerRemaining'den türetilir.
 */
export function calcTimeLeft(session: StudySession): number {
  if (!session.timerRunning || !session.timerStartedAt) {
    return session.timerRemaining
  }
  const elapsed = Math.floor(
    (Date.now() - new Date(session.timerStartedAt).getTime()) / 1000,
  )
  return Math.max(0, session.timerRemaining - elapsed)
}
