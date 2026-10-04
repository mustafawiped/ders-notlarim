import { useState } from 'react'
import schemaSql from '../../supabase/schema.sql?raw'
import { Icon } from './icons'

/**
 * Supabase bağlantısı yokken gösterilen demo modu bildirimi ve
 * adım adım kurulum rehberi.
 */
export function SetupNotice() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(schemaSql)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Pano erişimi yoksa sessizce geç.
    }
  }

  return (
    <div className="setup-notice">
      <button className="setup-head" onClick={() => setOpen(!open)} type="button">
        <Icon name="alert" size={15} />
        <span>
          <strong>Demo modu.</strong> Supabase bağlı değil; notların yalnızca bu tarayıcıda
          saklanıyor. Kurulum için tıkla.
        </span>
        <Icon name={open ? 'x' : 'chevronRight'} size={14} className="setup-caret" />
      </button>

      {open && (
        <div className="setup-body">
          <p>Notlarını kalıcı olarak saklamak için Supabase'i bağla:</p>
          <ol>
            <li>
              <a href="https://supabase.com" target="_blank" rel="noreferrer">
                supabase.com
              </a>{' '}
              üzerinde ücretsiz bir proje oluştur.
            </li>
            <li>
              Dashboard → <strong>SQL Editor</strong> → New query yolunu izle ve aşağıdaki şemayı
              çalıştır.
            </li>
            <li>
              Proje kökünde <code>.env</code> dosyası oluştur (<code>.env.example</code> kopyası) ve
              API bilgilerini gir.
            </li>
            <li>
              <code>npm run dev</code> komutunu yeniden çalıştır.
            </li>
          </ol>
          <div className="sql-box">
            <div className="sql-box-head">
              <span>supabase/schema.sql</span>
              <button className="btn btn-small" onClick={copySql} type="button">
                <Icon name={copied ? 'check' : 'copy'} size={13} />
                {copied ? 'Kopyalandı' : 'Kopyala'}
              </button>
            </div>
            <pre>{schemaSql}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
