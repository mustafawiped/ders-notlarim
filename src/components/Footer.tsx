import type { LegalPage } from './LegalView'

interface FooterProps {
  onOpenLegal: (page: LegalPage) => void
}

export function Footer({ onOpenLegal }: FooterProps) {
  return (
    <footer className="footer">
      <span>
        <a href="https://mustafawiped.me" target="_blank" rel="noreferrer" title="mustafawiped.me">
          developed by MW
        </a>
      </span>
      <span className="footer-links">
        <button onClick={() => onOpenLegal('privacy')} type="button">
          Gizlilik Politikası
        </button>
        <span aria-hidden="true">·</span>
        <button onClick={() => onOpenLegal('terms')} type="button">
          Kullanım Koşulları
        </button>
      </span>
    </footer>
  )
}
