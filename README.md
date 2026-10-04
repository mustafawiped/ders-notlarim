# 📚 Ders Notlarım

Derslerine göre konuları düzenleyip her konuya not alabileceğin kişisel bir not
sitesi. Veri tabanı olarak **Supabase** kullanır.

## Özellikler

- 🎨 Renkli **dersler** oluşturma, yeniden adlandırma ve silme
- 📑 Her ders altında **konular** ekleme/düzenleme
- ✍️ Her konuya birden fazla **not** yazma (satır aralıkları korunur), düzenleme ve silme
- 🔍 Konu ve notlarda **arama** (eşleşme vurgulu)
- 🌗 Açık/koyu tema (tercihin hatırlanır)
- 📱 Masaüstü ve mobil uyumlu arayüz
- ⚡ Supabase bağlı değilken **demo modu**: veriler tarayıcında saklanır, site yine de tam çalışır

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
   (Uygulama içindeki sarı "Demo modu" bildiriminde de aynı şema kopyalanabilir.)
3. Proje kökünde `.env` dosyası oluştur:

   ```bash
   cp .env.example .env
   ```

   Supabase Dashboard → **Project Settings → API** sayfasından **Project URL**
   ve **anon public** anahtarını `.env` içine yaz:

   ```env
   VITE_SUPABASE_URL=https://PROJE-ADIN.supabase.co
   VITE_SUPABASE_ANON_KEY=ANON-ANAHTARIN
   ```

4. `npm run dev` komutunu yeniden başlat. Artık tüm veriler Supabase'de saklanır.

## Veri Modeli

```
courses (dersler)      topics (konular)          notes (notlar)
┌──────────────┐       ┌─────────────────┐       ┌──────────────────┐
│ id           │ 1───* │ id              │ 1───* │ id               │
│ name         │       │ course_id (FK)  │       │ topic_id (FK)    │
│ color        │       │ title           │       │ content          │
│ created_at   │       │ created_at      │       │ created_at       │
└──────────────┘       └─────────────────┘       │ updated_at       │
                                                 └──────────────────┘
```

Ders silindiğinde konuları ve notları, konu silindiğinde notları veri tabanında
otomatik silinir (`on delete cascade`).

## Güvenlik Notu

`schema.sql` içindeki RLS politikaları, giriş yapılmadan (anon anahtar ile)
kullanım için **tam erişim** verir. Siteyi herkese açık bir adrese
yayınlamadan önce Supabase Auth ekleyip politikaları kullanıcı bazlı
kısıtlamanız önerilir; kişisel yerel kullanım için bu ayar yeterlidir.

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
├── supabase/schema.sql      # Veri tabanı şeması + RLS politikaları
├── src/
│   ├── App.tsx              # Uygulama durumu ve gezinme
│   ├── components/          # Sidebar, CourseView, TopicView, SearchView, ...
│   └── lib/
│       ├── repository.ts    # Veri katmanı seçimi (Supabase / demo)
│       ├── supabaseRepo.ts  # Supabase sorguları
│       ├── localRepo.ts     # Demo modu (localStorage)
│       └── types.ts         # Course / Topic / Note tipleri
└── .env.example             # Ortam değişkeni şablonu
```
