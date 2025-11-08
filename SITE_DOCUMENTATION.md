# Site Dokümantasyonu - Yeniden Refah Partisi Elazığ Merkez İlçe Sekreteri

## Genel Bakış

Bu site, Yeniden Refah Partisi Elazığ Merkez İlçe Sekreterliği için geliştirilmiş kapsamlı bir yönetim sistemidir. Site, üye yönetimi, toplantı ve etkinlik takibi, seçim hazırlıkları, belde/ilçe yönetimi ve daha birçok özellik sunmaktadır.

## Teknik Altyapı

- **Frontend**: React.js (Vite)
- **Backend**: Node.js (Express) - Geliştirme ortamı için
- **Database**: Firebase Firestore (Production) / SQLite (Development)
- **Authentication**: Firebase Authentication
- **Deployment**: Render.com
- **Version Control**: Git/GitHub

## Kullanıcı Rolleri

### 1. Admin (Yönetici)
- Tüm sayfalara ve işlevlere erişim
- Sistem yapılandırması
- Kullanıcı yönetimi
- Veri yönetimi

### 2. Member (Üye)
- Kendi bilgilerini görüntüleme
- Toplantı ve etkinliklere katılım
- Yetkisi dahilindeki sayfalara erişim

### 3. District President (İlçe Başkanı)
- İlçe yönetimi
- İlçe üyeleri yönetimi
- İlçe toplantı ve etkinlikleri

### 4. Town President (Belde Başkanı)
- Belde yönetimi
- Belde üyeleri yönetimi
- Belde toplantı ve etkinlikleri

## Ana Sayfalar ve İşlevler

### 1. Giriş Sayfası (`/login`)
**Açıklama**: Kullanıcıların sisteme giriş yaptığı sayfa.

**Özellikler**:
- Kullanıcı adı (TC kimlik numarası veya email) ve şifre ile giriş
- Admin, üye, ilçe başkanı ve belde başkanı için farklı giriş akışları
- Firebase Authentication entegrasyonu
- Otomatik yönlendirme (rol bazlı)

**Kullanıcı Tipleri**:
- **Admin**: `admin@ilsekreterlik.local` veya `admin` kullanıcı adı
- **Üye**: TC kimlik numarası (username), telefon numarası (password)
- **İlçe Başkanı**: Belde adı (username), başkan telefon numarası (password)
- **Belde Başkanı**: Belde adı (username), başkan telefon numarası (password)

### 2. Ana Sayfa / Dashboard (`/`)
**Açıklama**: Admin kullanıcıları için ana kontrol paneli.

**Özellikler**:
- Genel istatistikler (üye sayısı, toplantı sayısı, etkinlik sayısı)
- Son eklenen üyeler
- Yaklaşan toplantılar ve etkinlikler
- Katılım istatistikleri
- En çok katılan üyeler
- En çok üye kaydeden üyeler

**İstatistikler**:
- Toplam üye sayısı
- Aktif üye sayısı
- Toplam toplantı sayısı
- Toplam etkinlik sayısı
- Ortalama katılım oranı

### 3. Üyeler Sayfası (`/members`)
**Açıklama**: Tüm üyelerin listelendiği ve yönetildiği sayfa.

**Özellikler**:
- Üye listesi (tablo ve grid görünümü)
- Üye arama (isim, TC, telefon)
- Bölge ve görev bazlı filtreleme
- Üye ekleme, düzenleme, silme
- Excel'den üye içe aktarma
- Excel'e üye dışa aktarma
- Üye detayları görüntüleme
- Üye arşivleme ve geri yükleme
- Kişisel belgeler yönetimi
- Üye kayıtları (hangi üye hangi üyeleri kaydetmiş)

**Üye Bilgileri**:
- TC Kimlik Numarası
- İsim Soyisim
- Telefon
- Görev (Pozisyon)
- Bölge
- Toplantı katılım istatistikleri
- Kişisel belgeler

**İşlemler**:
- **Kayıt Ekle**: Üye tarafından kaydedilen üyeleri ekleme
- **Düzenle**: Üye bilgilerini güncelleme
- **Arşivle**: Üyeyi arşive gönderme
- **Sil**: Üyeyi kalıcı olarak silme
- **Belgeler**: Kişisel belgeleri yönetme
- **Detaylar**: Üye detaylarını görüntüleme

### 4. Toplantılar Sayfası (`/meetings`)
**Açıklama**: Tüm toplantıların listelendiği ve yönetildiği sayfa.

**Özellikler**:
- Toplantı listesi
- Toplantı ekleme, düzenleme, silme
- Toplantı detayları görüntüleme
- Katılımcı yönetimi
- Katılım durumu takibi
- Toplantı arşivleme
- Toplantı notları (description)

**Toplantı Bilgileri**:
- Toplantı tarihi
- Toplantı yeri
- Katılımcılar
- Katılım durumu (katıldı, katılmadı, mazeretli)
- Toplantı notları

**Filtreleme**:
- Tarih aralığı
- Yer
- Katılım durumu

### 5. Etkinlikler Sayfası (`/events`)
**Açıklama**: Tüm etkinliklerin listelendiği ve yönetildiği sayfa.

**Özellikler**:
- Etkinlik listesi
- Etkinlik ekleme, düzenleme, silme
- Etkinlik detayları görüntüleme
- Katılımcı yönetimi
- Etkinlik kategorileri
- Etkinlik arşivleme
- Etkinlik notları (description)

**Etkinlik Bilgileri**:
- Etkinlik adı (kategori adı)
- Etkinlik tarihi
- Etkinlik yeri (ilçe, belde, mahalle, köy, STK, cami)
- Katılımcılar
- Etkinlik kategorisi
- Etkinlik notları

**Etkinlik Kategorileri**:
- Ziyaret
- Toplantı
- Etkinlik
- Diğer

### 6. Arşiv Sayfası (`/archive`)
**Açıklama**: Arşivlenmiş üyeler, toplantılar ve etkinliklerin yönetildiği sayfa.

**Özellikler**:
- Arşivlenmiş üyeler
- Arşivlenmiş toplantılar
- Arşivlenmiş etkinlikler
- Arşivlenmiş belgeler
- Geri yükleme işlemleri
- Kalıcı silme işlemleri

**Sekmeler**:
- Üyeler
- Toplantılar
- Etkinlikler
- Belgeler

### 7. İlçeler Sayfası (`/districts`)
**Açıklama**: Tüm ilçelerin listelendiği ve yönetildiği sayfa.

**Özellikler**:
- İlçe listesi
- İlçe ekleme, düzenleme, silme
- İlçe detayları görüntüleme
- İlçe başkanı ve müfettiş yönetimi
- İlçe üyeleri görüntüleme
- İlçe ziyaret sayısı takibi

**İlçe Bilgileri**:
- İlçe adı
- İlçe başkanı (ad, telefon, üye seçimi)
- İlçe müfettişi (ad, telefon, üye seçimi)
- Müfettiş yardımcıları
- İlçe yönetim kurulu üyeleri
- Ziyaret sayısı

### 8. Beldeler Sayfası (`/towns`)
**Açıklama**: Tüm beldelerin listelendiği ve yönetildiği sayfa.

**Özellikler**:
- Belde listesi
- Belde ekleme, düzenleme, silme
- Belde detayları görüntüleme
- Belde başkanı ve müfettiş yönetimi
- Belde üyeleri görüntüleme
- Belde ziyaret sayısı takibi
- Belde içindeki mahalle, köy, cami ve STK'lar

**Belde Bilgileri**:
- Belde adı
- İlçe bilgisi
- Belde başkanı (ad, telefon, üye seçimi)
- Belde müfettişi (ad, telefon, üye seçimi)
- Müfettiş yardımcıları
- Belde yönetim kurulu üyeleri
- Ziyaret sayısı
- Belde içindeki mahalleler
- Belde içindeki köyler
- Belde içindeki camiler
- Belde içindeki STK'lar

### 9. Seçime Hazırlık Sayfası (`/election-preparation`)
**Açıklama**: Seçim hazırlık işlemlerinin yönetildiği ana sayfa.

**Alt Sayfalar**:
- **Sandıklar** (`/election-preparation/ballot-boxes`)
- **Müşahitler** (`/election-preparation/observers`)
- **Temsilciler** (`/election-preparation/representatives`)
- **Mahalleler** (`/election-preparation/neighborhoods`)
- **Köyler** (`/election-preparation/villages`)
- **Gruplar** (`/election-preparation/groups`)

### 10. Sandıklar Sayfası (`/election-preparation/ballot-boxes`)
**Açıklama**: Seçim sandıklarının yönetildiği sayfa.

**Özellikler**:
- Sandık listesi
- Sandık ekleme, düzenleme, silme
- Sandık detayları görüntüleme
- Sandık atama (ilçe, belde, mahalle/köy)
- Başmüşahit atama
- Müşahit atama
- Sandık durumu takibi (tamamlanmış/eksik)

**Sandık Bilgileri**:
- Sandık numarası
- İlçe
- Belde
- Mahalle/Köy
- Başmüşahit
- Müşahitler
- Durum (tamamlanmış/eksik)

**Durum Göstergeleri**:
- İlçe atanmış mı? (yeşil/kırmızı)
- Mahalle/Köy atanmış mı? (yeşil/kırmızı)
- Başmüşahit atanmış mı? (yeşil/kırmızı)
- Müşahitler atanmış mı? (yeşil/kırmızı)

### 11. Müşahitler Sayfası (`/election-preparation/observers`)
**Açıklama**: Seçim müşahitlerinin yönetildiği sayfa.

**Özellikler**:
- Müşahit listesi
- Müşahit ekleme, düzenleme, silme
- Müşahit detayları görüntüleme
- Sandık atama
- Müşahit türü (başmüşahit/müşahit)

**Müşahit Bilgileri**:
- Ad Soyad
- TC Kimlik Numarası
- Telefon
- Sandık numarası
- İlçe, Belde, Mahalle/Köy (sandık bilgilerinden otomatik)
- Müşahit türü

### 12. Temsilciler Sayfası (`/election-preparation/representatives`)
**Açıklama**: Mahalle ve köy temsilcilerinin yönetildiği sayfa.

**Özellikler**:
- Temsilci listesi
- Temsilci ekleme, düzenleme, silme
- Temsilci detayları görüntüleme
- Mahalle/Köy atama
- Excel'e dışa aktarma

**Temsilci Bilgileri**:
- Ad Soyad
- TC Kimlik Numarası
- Telefon
- Mahalle/Köy
- İlçe
- Belde

### 13. Mahalleler Sayfası (`/election-preparation/neighborhoods`)
**Açıklama**: Mahallelerin yönetildiği sayfa.

**Özellikler**:
- Mahalle listesi (grup numarasına göre sıralı)
- Mahalle ekleme, düzenleme, silme
- Mahalle detayları görüntüleme
- Temsilci atama
- Müfettiş atama
- Grup atama
- Grup numarasına göre filtreleme
- Excel'e dışa aktarma

**Mahalle Bilgileri**:
- Mahalle adı
- İlçe
- Belde
- Temsilci (ad, telefon)
- Müfettiş (ad, telefon)
- Grup numarası
- Grup lideri

### 14. Köyler Sayfası (`/election-preparation/villages`)
**Açıklama**: Köylerin yönetildiği sayfa.

**Özellikler**:
- Köy listesi (grup numarasına göre sıralı)
- Köy ekleme, düzenleme, silme
- Köy detayları görüntüleme
- Temsilci atama
- Müfettiş atama
- Grup atama
- Grup numarasına göre filtreleme
- Excel'e dışa aktarma

**Köy Bilgileri**:
- Köy adı
- İlçe
- Belde
- Temsilci (ad, telefon)
- Müfettiş (ad, telefon)
- Grup numarası
- Grup lideri

### 15. Gruplar Sayfası (`/election-preparation/groups`)
**Açıklama**: Mahalle ve köy gruplarının yönetildiği sayfa.

**Özellikler**:
- Grup listesi
- Grup detayları görüntüleme
- Grup lideri atama
- Grup içindeki mahalle ve köylerin listelenmesi
- Grup bazlı filtreleme

**Grup Bilgileri**:
- Grup numarası
- Grup lideri (üye seçimi)
- Grup içindeki mahalleler
- Grup içindeki köyler
- Her mahalle/köy için:
  - Temsilci bilgileri
  - Müfettiş bilgileri
  - Telefon numaraları
  - İlçe ve belde bilgileri

### 16. Takvim Sayfası (`/calendar`)
**Açıklama**: Toplantı ve etkinliklerin takvim görünümünde gösterildiği sayfa.

**Özellikler**:
- Aylık takvim görünümü
- Toplantıların işaretlenmesi
- Etkinliklerin işaretlenmesi
- Tarih seçerek toplantı/etkinlik ekleme
- Günlük, haftalık, aylık görünüm

### 17. Yönetim Şeması Sayfası (`/management-chart`)
**Açıklama**: Parti yönetim şemasının görselleştirildiği sayfa.

**Özellikler**:
- Hiyerarşik yönetim yapısı
- İlçe başkanı
- İlçe müfettişi
- Belde başkanları
- Belde müfettişleri
- Yönetim kurulu üyeleri
- İnteraktif görselleştirme

### 18. Ayarlar Sayfası (`/settings`)
**Açıklama**: Sistem yapılandırması ve ayarların yönetildiği sayfa.

**Alt Sekmeler**:

#### 18.1. Admin Ayarları
- Admin kullanıcı adı ve şifre güncelleme
- Mevcut admin bilgileri görüntüleme

#### 18.2. Bölgeler
- Bölge ekleme, düzenleme, silme
- Bölge listesi

#### 18.3. Görevler (Pozisyonlar)
- Görev ekleme, düzenleme, silme
- Görev listesi

#### 18.4. Üye Kullanıcıları
- Üye kullanıcı listesi
- Üye kullanıcı ekleme, düzenleme, silme
- Kullanıcı durumu (aktif/pasif)
- Tüm kullanıcı kimlik bilgilerini güncelleme

#### 18.5. İlçeler
- İlçe ekleme, düzenleme, silme
- İlçe başkanı ve müfettiş yönetimi
- İlçe yönetim kurulu üyeleri

#### 18.6. Beldeler
- Belde ekleme, düzenleme, silme
- Belde başkanı ve müfettiş yönetimi
- Belde yönetim kurulu üyeleri

#### 18.7. Mahalleler
- Mahalle ekleme, düzenleme, silme
- Temsilci ve müfettiş atama
- Grup atama

#### 18.8. Köyler
- Köy ekleme, düzenleme, silme
- Temsilci ve müfettiş atama
- Grup atama

#### 18.9. STK'lar
- STK ekleme, düzenleme, silme
- STK listesi
- STK ziyaret sayısı takibi

#### 18.10. Camiler
- Cami ekleme, düzenleme, silme
- Cami listesi
- Cami ziyaret sayısı takibi

#### 18.11. Etkinlik Kategorileri
- Etkinlik kategorisi ekleme, düzenleme, silme
- Kategori listesi

#### 18.12. Yetkilendirme
- Görev bazlı yetkilendirme
- Sayfa erişim izinleri
- Pozisyon bazlı izin yönetimi

#### 18.13. Tüzük
- Parti tüzüğü yönetimi
- Tüzük metni ekleme, düzenleme
- Tüzük URL'si ekleme

#### 18.14. Chatbot API
- AI chatbot API anahtarı yönetimi
- AI servis seçimi (Groq, Gemini, ChatGPT, DeepSeek)
- API anahtarı test etme

#### 18.15. Firebase Yapılandırması
- Firebase API Key
- Firebase Auth Domain
- Firebase Project ID
- Firebase Storage Bucket
- Firebase Messaging Sender ID
- Firebase App ID
- Firebase Measurement ID
- Admin şifresi ile kaydetme

#### 18.16. Deployment Yapılandırması
- Render.com API Key
- Render.com Service ID
- GitHub Personal Access Token
- GitHub Repository
- Admin şifresi ile kaydetme

## Özel Dashboard Sayfaları

### 19. Üye Dashboard Sayfası (`/member-dashboard`)
**Açıklama**: Üye kullanıcıları için özel dashboard.

**Özellikler**:
- Yetki bazlı sayfa erişimi
- Kişisel bilgiler
- Katıldığı toplantılar
- Katıldığı etkinlikler
- Yetkisi dahilindeki işlemler

### 20. İlçe Başkanı Dashboard Sayfası (`/district-president-dashboard`)
**Açıklama**: İlçe başkanı için özel dashboard.

**Özellikler**:
- İlçe bilgileri
- İlçe üyeleri
- İlçe toplantıları
- İlçe etkinlikleri
- İlçe istatistikleri

### 21. Belde Başkanı Dashboard Sayfası (`/town-president-dashboard`)
**Açıklama**: Belde başkanı için özel dashboard.

**Özellikler**:
- Belde bilgileri
- Belde üyeleri
- Belde toplantıları
- Belde etkinlikleri
- Belde istatistikleri

## Özel Özellikler

### 1. AI Chatbot
**Açıklama**: Site içi AI chatbot özelliği.

**Özellikler**:
- Tüm site verilerine erişim
- Üye bilgileri sorgulama
- Toplantı ve etkinlik bilgileri
- İstatistik sorgulama
- Parti tüzüğü bilgileri
- Çoklu AI servis desteği (Groq, Gemini, ChatGPT, DeepSeek)

**Kullanım**:
- Sağ alt köşedeki chatbot butonuna tıklayarak açılır
- Sorular sorulabilir
- Site verilerine dayalı cevaplar alınır

### 2. Excel İçe/Dışa Aktarma
**Açıklama**: Verilerin Excel formatında içe ve dışa aktarılması.

**Desteklenen Sayfalar**:
- Üyeler
- Mahalleler
- Köyler
- Temsilciler
- Diğer seçime hazırlık sayfaları

**Excel Formatı**:
- Üyeler: TC, İsim Soyisim, Telefon, Görev, Bölge
- Diğer sayfalar: İlgili sütunlar

### 3. Karanlık Mod (Dark Mode)
**Açıklama**: Site genelinde karanlık mod desteği.

**Özellikler**:
- Otomatik tema algılama
- Manuel tema değiştirme
- Kullanıcı tercihi kaydetme
- Tüm sayfalarda uyumlu görünüm

### 4. PWA (Progressive Web App)
**Açıklama**: Site mobil cihazlara yüklenebilir uygulama olarak kullanılabilir.

**Özellikler**:
- Offline çalışma desteği
- Mobil cihazlara yükleme
- Push notification desteği (gelecek özellik)

### 5. Güvenlik ve Şifreleme
**Açıklama**: Hassas verilerin şifrelenmesi.

**Şifrelenen Veriler**:
- TC Kimlik Numarası
- Telefon numaraları
- Email adresleri
- Diğer kişisel bilgiler

**Şifreleme Yöntemi**:
- AES-256 şifreleme
- CryptoJS kütüphanesi
- Otomatik şifreleme/çözme

## Veri Yapısı

### Collections (Firestore)
- `members`: Üyeler
- `meetings`: Toplantılar
- `events`: Etkinlikler
- `districts`: İlçeler
- `towns`: Beldeler
- `neighborhoods`: Mahalleler
- `villages`: Köyler
- `ballot_boxes`: Sandıklar
- `observers`: Müşahitler
- `neighborhood_representatives`: Mahalle temsilcileri
- `village_representatives`: Köy temsilcileri
- `neighborhood_supervisors`: Mahalle müfettişleri
- `village_supervisors`: Köy müfettişleri
- `groups`: Gruplar
- `district_officials`: İlçe yetkilileri
- `town_officials`: Belde yetkilileri
- `member_users`: Üye kullanıcıları
- `admin`: Admin bilgileri
- `regions`: Bölgeler
- `positions`: Görevler
- `stks`: STK'lar
- `mosques`: Camiler
- `event_categories`: Etkinlik kategorileri
- `member_registrations`: Üye kayıtları
- `personal_documents`: Kişisel belgeler
- `visit_counts`: Ziyaret sayıları
- `bylaws`: Parti tüzüğü
- `ai_provider_config`: AI servis yapılandırması
- `firebase_config`: Firebase yapılandırması
- `deployment_config`: Deployment yapılandırması

## API Servisleri

### FirebaseApiService
- Firebase Firestore işlemleri
- Firebase Authentication işlemleri
- Veri şifreleme/çözme
- CRUD işlemleri

### ApiService
- Backend API işlemleri (geliştirme ortamı)
- Firebase delegasyonu
- API endpoint'leri

## Güvenlik

### Authentication
- Firebase Authentication
- Rol bazlı erişim kontrolü
- Oturum yönetimi

### Authorization
- Sayfa bazlı yetkilendirme
- Görev bazlı yetkilendirme
- Pozisyon bazlı izinler

### Data Encryption
- Hassas verilerin şifrelenmesi
- Otomatik şifreleme/çözme
- Güvenli veri saklama

## Deployment

### Render.com
- Static site deployment
- Otomatik build
- Environment variables
- Custom domain

### GitHub
- Version control
- Branch management
- Automatic deployment

## Geliştirme Notları

### Environment Variables
- `VITE_USE_FIREBASE`: Firebase kullanımı (true/false)
- `VITE_FIREBASE_API_KEY`: Firebase API Key
- `VITE_FIREBASE_AUTH_DOMAIN`: Firebase Auth Domain
- `VITE_FIREBASE_PROJECT_ID`: Firebase Project ID
- `VITE_FIREBASE_STORAGE_BUCKET`: Firebase Storage Bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: Firebase Messaging Sender ID
- `VITE_FIREBASE_APP_ID`: Firebase App ID
- `VITE_FIREBASE_MEASUREMENT_ID`: Firebase Measurement ID

### Build Commands
- `npm run build`: Production build
- `npm run dev`: Development server
- `npm run preview`: Preview production build

## Sorun Giderme

### Login Sorunları
- Firebase Auth şifre uyumsuzluğu
- Kullanıcı bulunamadı hatası
- Email zaten kullanılıyor hatası

### Veri Sorunları
- Şifreleme/çözme hataları
- Veri senkronizasyonu
- Firestore bağlantı sorunları

### Deployment Sorunları
- Build hataları
- Environment variable sorunları
- Render.com deployment sorunları

## Gelecek Özellikler

- Push notification desteği
- SMS bildirimleri
- Email bildirimleri
- Gelişmiş raporlama
- Grafik ve görselleştirmeler
- Mobil uygulama

## İletişim ve Destek

- **Site**: https://yrpmerkezilce.onrender.com
- **GitHub**: https://github.com/xawiar/ilce-sekreterlik
- **Branch**: version1

---

**Son Güncelleme**: 2024
**Versiyon**: 1.0
**Geliştirici**: Yeniden Refah Partisi Elazığ Merkez İlçe Sekreterliği

