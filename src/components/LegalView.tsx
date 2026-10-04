import { Icon } from './icons'

export type LegalPage = 'privacy' | 'terms'

interface Section {
  title: string
  body: string[]
}

const TERMS: Section[] = [
  {
    title: '1. Kabul',
    body: [
      'MWnotes. (bundan sonra "Site"), ders notlarını hesabınla ilişkili şekilde saklaman için hazırlanmış kişisel bir araçtır. Siteyi kullanarak bu kullanım koşullarını okuduğunu, anladığını ve kabul ettiğini beyan etmiş olursun.',
    ],
  },
  {
    title: '2. Hizmetin Niteliği',
    body: [
      'Site "olduğu gibi" sunulmaktadır. Hizmetin kesintisiz, hatasız veya güvenli olacağına ilişkin açık ya da zımni hiçbir garanti verilmez.',
    ],
  },
  {
    title: '3. Sorumluluk Reddi',
    body: [
      'Site sahibi (MW), sitenin kullanımından veya kullanılamamasından doğabilecek her türlü doğrudan, dolaylı, arızi veya sonuçsal zarar için — veri kaybı, notlara erişilememesi, kâr kaybı ve hizmet kesintileri dahil olmak üzere — hiçbir sorumluluk kabul etmez.',
      'Siteyi kullanım riski tamamen sana aittir. Notlarının yedeğini almak da dahil olmak üzere verilerinin güvenliğinden sen sorumlusun.',
    ],
  },
  {
    title: '4. Kullanıcı İçeriği',
    body: [
      'Yazdığın notların içeriğinden ve doğruluğundan tamamen sen sorumlusun. Hesap bilgilerini (şifreni) güvende tutmak senin sorumluluğundadır.',
      'Hesabını yasadışı, zararlı veya başkalarının haklarını ihlal eden içerik paylaşmak için kullanamazsın.',
    ],
  },
  {
    title: '5. Üçüncü Taraf Hizmetler',
    body: [
      'Veriler üçüncü taraf bir altyapı (Supabase) üzerinde saklanır. Bu hizmette yaşanacak kesinti, kısıtlama, fiyat/politika değişikliği veya veri kaybından Site sorumlu tutulamaz.',
    ],
  },
  {
    title: '6. Değişiklikler',
    body: [
      'Bu koşullar önceden bildirim yapılmaksızın güncellenebilir. Güncel sürüm her zaman bu sayfada yayınlanır; Siteyi kullanmaya devam etmen güncel koşulları kabul ettiğin anlamına gelir.',
    ],
  },
  {
    title: '7. İletişim',
    body: ['Soruların için mustafawiped.me adresinden iletişime geçebilirsin.'],
  },
]

const PRIVACY: Section[] = [
  {
    title: '1. Toplanan Veriler',
    body: [
      'Hesap oluşturmak için e-posta adresin ve belirlediğin şifre; notlarını saklamak için yazdığın ders, konu ve not içerikleri toplanır. Başka hiçbir veri istenmez veya zorunlu tutulmaz.',
    ],
  },
  {
    title: '2. Verilerin Kullanımı',
    body: [
      'Verilerin yalnızca hizmetin çalışması için kullanılır. Verilerin üçüncü taraflara satılmaz, reklam veya pazarlama amacıyla paylaşılmaz.',
    ],
  },
  {
    title: '3. Saklama ve Erişim',
    body: [
      'Notların Supabase veri tabanında hesabınla ilişkili olarak saklanır ve yalnızca senin hesabın erişebilir; erişim hesap bazlı güvenlik kurallarıyla (Row Level Security) sınırlıdır.',
    ],
  },
  {
    title: '4. Yerel Depolama',
    body: [
      'Tema tercihi gibi küçük ayarlar tarayıcının yerel deposunda (localStorage) tutulur. Bu veriler cihazında kalır, dışarı gönderilmez.',
    ],
  },
  {
    title: '5. Hesap Silme',
    body: [
      'Hesabını silersen, ona bağlı tüm ders, konu ve notlar veri tabanından kalıcı olarak kaldırılır.',
    ],
  },
  {
    title: '6. Değişiklikler',
    body: [
      'Bu politika önceden bildirim yapılmaksızın güncellenebilir; güncel sürüm her zaman bu sayfada yayınlanır.',
    ],
  },
  {
    title: '7. İletişim',
    body: ['Gizlilikle ilgili soruların için mustafawiped.me adresinden ulaşabilirsin.'],
  },
]

export function LegalView({ page, onBack }: { page: LegalPage; onBack: () => void }) {
  const sections = page === 'terms' ? TERMS : PRIVACY
  const title = page === 'terms' ? 'Kullanım Koşulları' : 'Gizlilik Politikası'

  return (
    <article className="legal">
      <button className="icon-btn" onClick={onBack} aria-label="Geri dön" title="Geri dön">
        <Icon name="arrowLeft" size={16} />
      </button>
      <h1>{title}</h1>
      <p className="legal-updated">Son güncelleme: Ekim 2026</p>
      {sections.map((s) => (
        <section key={s.title}>
          <h2>{s.title}</h2>
          {s.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>
      ))}
    </article>
  )
}
