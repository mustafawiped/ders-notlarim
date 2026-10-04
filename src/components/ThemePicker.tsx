import { useState, useEffect, useRef } from 'react'
import { Icon } from './icons'

export interface AccentOption {
  name: string
  accent: string
  hover: string
  soft: string
  softDark: string
}

export const ACCENT_PRESETS: AccentOption[] = [
  {
    name: 'İndigo',
    accent: '#6366f1',
    hover: '#4f46e5',
    soft: '#eef0ff',
    softDark: '#232741',
  },
  {
    name: 'Mor',
    accent: '#8b5cf6',
    hover: '#7c3aed',
    soft: '#f3e8ff',
    softDark: '#2e1b4d',
  },
  {
    name: 'Zümrüt',
    accent: '#10b981',
    hover: '#059669',
    soft: '#d1fae5',
    softDark: '#133527',
  },
  {
    name: 'Pembe',
    accent: '#f43f5e',
    hover: '#e11d48',
    soft: '#ffe4e6',
    softDark: '#3e1721',
  },
  {
    name: 'Kehribar',
    accent: '#f59e0b',
    hover: '#d97706',
    soft: '#fef3c7',
    softDark: '#3b2a0c',
  },
  {
    name: 'Camgöbeği',
    accent: '#06b6d4',
    hover: '#0891b2',
    soft: '#cffafe',
    softDark: '#0e313b',
  },
]

export function applyAccent(preset: AccentOption) {
  const root = document.documentElement
  root.style.setProperty('--accent', preset.accent)
  root.style.setProperty('--accent-hover', preset.hover)
  root.style.setProperty('--accent-soft', preset.soft)
  // For dark mode override
  const isDark = root.dataset.theme === 'dark'
  if (isDark) {
    root.style.setProperty('--accent-soft', preset.softDark)
  }
}

export function ThemePicker() {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<string>(() => {
    return localStorage.getItem('dn.accent') ?? ACCENT_PRESETS[0].name
  })
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const found = ACCENT_PRESETS.find((p) => p.name === current) ?? ACCENT_PRESETS[0]
    applyAccent(found)
    localStorage.setItem('dn.accent', current)
  }, [current])

  // Watch theme change to update soft accent
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const found = ACCENT_PRESETS.find((p) => p.name === current) ?? ACCENT_PRESETS[0]
      applyAccent(found)
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [current])

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="theme-picker-wrap" ref={menuRef}>
      <button
        className="icon-btn"
        onClick={() => setOpen(!open)}
        title="Vurgu Rengini Değiştir"
        aria-label="Vurgu rengi seç"
        type="button"
      >
        <Icon name="palette" size={16} />
      </button>

      {open && (
        <div className="theme-picker-menu">
          <span className="theme-picker-title">Vurgu Rengi</span>
          <div className="theme-picker-grid">
            {ACCENT_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                className={`theme-color-dot ${current === p.name ? 'selected' : ''}`}
                style={{ background: p.accent }}
                onClick={() => {
                  setCurrent(p.name)
                  setOpen(false)
                }}
                title={p.name}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
