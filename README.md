# 📚 MWnotes.

Derslerine göre konuları düzenleyip her konuya not alabileceğin kişisel bir not
sitesi. Veri tabanı ve kimlik doğrulama altyapısı olarak **Supabase** kullanır.

## Özellikler

- 🔐 **Hesap Sistemi**: Supabase Auth ile güvenli kayıt & giriş, her kullanıcının notları kendi hesabıyla ilişkilendirilir (RLS korumalı)
- 🎨 Renkli **dersler** oluşturma, yeniden adlandırma ve silme
- 📑 Her ders altında **konular** ekleme/düzenleme
- ✍️ Her konuya birden fazla **not** yazma (satır aralıkları korunur), düzenleme ve silme
- 🔍 Konu ve notlarda **arama** (eşleşme vurgulu)
- 🌗 Açık/koyu tema (tercihin hatırlanır)
- 📱 Masaüstü ve mobil uyumlu modern arayüz
- ⚡ Supabase bağlı değilken **demo modu**: veriler tarayıcında saklanır, site yine de tam çalışır
- ⚖️ Gizlilik politikası ve Kullanım koşulları sayfaları

## Hızlı Başlangıç

```bash
npm install
npm run dev
```

Tarayıcıda <http://localhost:5173> adresini aç. Supabase bağlanana kadar site
demo modunda çalışır (veriler yalnızca o tarayıcıda tutulur).

## Supabase'i Bağlama

1. [supabase.com](https://supabase.com) üzerinde ücretsiz bir proje oluştur.
2. Supabase Dashboard → **SQL Editor** → *New query* yolunu izle ve
   [`supabase/schema.sql`](supabase/schema.sql) dosyasının içeriğini çalıştır.
   (Bu şema her kayda `user_id` ekler ve satır düzeyinde güvenlik (RLS) politikalarını ayarlar.)
3. Proje kökündeki `.env` dosyasını kontrol et (veya `.env.example` dosyasından oluştur):

   ```env
   VITE_SUPABASE_URL=https://PROJE-ADIN.supabase.co
   VITE_SUPABASE_ANON_KEY=ANON-ANAHTARIN
   ```

4. `npm run dev` komutunu yeniden başlat. Artık kullanıcılar hesap açabilir ve tüm notlar hesaplarına bağlı olarak saklanır.

## Veri Modeli

```
auth.users (Kullanıcılar)
   │
   ├─► courses (dersler)      topics (konular)          notes (notlar)
   │   ┌──────────────┐       ┌─────────────────┐       ┌──────────────────┐
   │   │ id           │ 1───* │ id              │ 1───* │ id               │
   │   │ user_id (FK) │       │ user_id (FK)    │       │ user_id (FK)     │
   │   │ name         │       │ course_id (FK)  │       │ topic_id (FK)    │
   │   │ color        │       │ title           │       │ content          │
   │   │ created_at   │       │ created_at      │       │ created_at       │
   │   └──────────────┘       └─────────────────┘       │ updated_at       │
   │                                                    └──────────────────┘
```

Ders silindiğinde konuları ve notları, konu silindiğinde notları veri tabanında
otomatik silinir (`on delete cascade`).

## Yayınlama

```bash
npm run build
```

`dist/` klasörünü Vercel, Netlify veya benzeri bir platforma yayınla ve ortam
değişkenleri olarak `VITE_SUPABASE_URL` ile `VITE_SUPABASE_ANON_KEY`
değerlerini tanımla.

## Proje Yapısı

```
ders-notlarim/
├── supabase/schema.sql      # Veri tabanı şeması + RLS politikaları (user_id bazlı)
├── src/
│   ├── App.tsx              # Uygulama durumu, oturum yönetimi ve gezinme
│   ├── components/
│   │   ├── AuthView.tsx     # Giriş yap ve Kayıt ol formu
│   │   ├── Footer.tsx       # Alt bilgi ve MW bağlantısı
│   │   ├── LegalView.tsx    # Gizlilik politikası ve Kullanım koşulları
│   │   ├── Sidebar.tsx      # Ders listesi, profil & çıkış düğmesi
│   │   └── ...
│   └── lib/
│       ├── repository.ts    # Veri katmanı seçimi (Supabase / demo)
│       ├── supabaseRepo.ts  # Supabase sorguları (kullanıcıya özel)
│       ├── localRepo.ts     # Demo modu (localStorage)
│       └── types.ts         # Course / Topic / Note tipleri
└── .env.example             # Ortam değişkeni şablonu
```
