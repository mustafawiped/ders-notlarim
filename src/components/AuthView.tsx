import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { APP_NAME } from '../lib/constants'
import { Icon } from './icons'

type Mode = 'login' | 'signup'

const ERROR_MAP: Array<[RegExp, string]> = [
  [/invalid login credentials/i, 'E-posta veya şifre hatalı.'],
  [/email not confirmed/i, 'E-posta adresin doğrulanmamış. Gelen kutundaki bağlantıya tıkla.'],
  [/user already registered/i, 'Bu e-posta ile kayıtlı bir hesap zaten var.'],
  [/rate limit/i, 'Çok fazla deneme yaptın, kısa bir süre bekleyip tekrar dene.'],
  [/signups? not allowed/i, 'Yeni kayıtlar kapalı görünüyor. Supabase Authentication ayarlarından açılmalı.'],
  [/valid email/i, 'Geçerli bir e-posta adresi gir.'],
]

function trError(message: string): string {
  for (const [re, tr] of ERROR_MAP) if (re.test(message)) return tr
  return message
}

export function AuthView() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setInfo(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase || busy) return
    setError(null)
    setInfo(null)
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalı.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        })
        if (error) throw error
        if (!data.session) {
          setInfo(
            'Hesap oluşturuldu! E-postana gönderilen bağlantıya tıklayarak hesabını doğrula, sonra buradan giriş yap.',
          )
        }
      }
    } catch (err) {
      setError(trError(err instanceof Error ? err.message : String(err)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-brand">
        <span className="brand-icon brand-icon-lg">
          <Icon name="cap" size={22} />
        </span>
        <span className="auth-name">{APP_NAME}</span>
        <p className="auth-tagline">Ders notların, hesabınla güvende.</p>
      </div>

      <div className="auth-tabs">
        <button
          className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
          onClick={() => switchMode('login')}
          type="button"
        >
          Giriş Yap
        </button>
        <button
          className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
          onClick={() => switchMode('signup')}
          type="button"
        >
          Kayıt Ol
        </button>
      </div>

      <form className="auth-form" onSubmit={submit}>
        <input
          className="input"
          type="email"
          required
          placeholder="E-posta"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="input"
          type="password"
          required
          placeholder="Şifre"
          minLength={6}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <div className="auth-error">{error}</div>}
        {info && <div className="auth-info">{info}</div>}
        <button
          className="btn btn-primary"
          disabled={busy || !email.trim() || !password}
          type="submit"
        >
          {busy ? 'Lütfen bekle…' : mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
        </button>
      </form>
    </div>
  )
}
