# Buse’nin Ajansı

Buse için kişisel yapay zekâ ajansı: 273 kaynak uzman, özel personel oluşturma, proje ekipleri, öneri → karşılıklı değerlendirme → ortak sunum.

## Kullanım

1. Panelde **Yapay Zekâ Personelleri** bölümünden hazır uzmanları seç veya personel ekle.
2. **Yeni proje** ile bir isim, ayrıntılı açıklama ve 2–6 personel belirle.
3. OpenAI bağlantısını kurduktan sonra **Ekibi başlat** düğmesine bas.
4. Sekme açıkken çalışma otomatik ilerler. Tamamlanan adımlar D1’e kaydedilir. Daha sonra **Devam et** ile sürdürülebilir.
5. Ortak proje sunumunu Markdown olarak indir.

Bu sürüm metin, içerik ve teknik taslak üretir. Harici araçları kullanmaz, kod çalıştırmaz, internette araştırma yapmaz veya ürün yayınlamaz. Sekme kapalıyken arka plan çalışanı yoktur. Sekme açıkken ajansın diğer bölümlerine geçilebilir. Bir sekmede aynı anda tek proje otomatik ilerletilir.

## Güvenli bağlantı

Hosted Sites sürümü **yalnız sahibinin erişimine açık** olarak yayınlanır. API ve tüm sayfalar Sites erişim kapısının arkasındadır. Uygulama kendi kullanıcı oturum sistemini içermez. Başka bir sunucuda veya herkese açık erişimde çalıştırmadan önce **tüm** sayfa ve API yollarına kimlik doğrulaması ekleyin. Site erişimini herkese açmak, aynı ajansın kayıtlarını ve API kullanımını açar.

`OPENAI_API_KEY` sadece sunucu gizli değişkeni olarak tanımlanmalıdır. `OPENAI_MODEL` isteğe bağlıdır; varsayılan `gpt-4.1-mini`. Sites kurulumu için OpenAI Developers eklentisi kullanılabilir. API anahtarı kaynak koda, GitHub’a, tarayıcı depolamasına, sorgu dizgesine veya istemci paketine girmez. Brief, personel görev tanımı ve ekip mesajları yanıt üretimi sırasında OpenAI’ye iletilir. API kullanım bedeli bağlı hesaba yansır.

Anahtar yokken personel ekleme ve proje kaydetme çalışır. Yapay zekâ çıktıları taklit edilmez. Bağlantı ve eksik kurulum durumu panelde görünür.

## Geliştirme

Node 22.18+ kullanın (testler Node’un yerleşik SQLite modülünü kullanır).

```sh
npm ci
npm run catalog  # Üst agency-agents deposundan kaynak katalog yenileme
npm run db:generate
npm run dev
```

Katalog dosyaları depoya dahil olduğundan yalnız panel kaynaklarıyla kurulum ve derleme de mümkündür. Katalog yenileme komutu üst depodaki `divisions.json` ve uzman dosyalarını gerektirir. İç içe oyun geliştirme uzmanları dahil tüm bölüm dizinlerini okur; YAML çok satırlı açıklamalarını korur. Büyük personel görev tanımları sadece sunucu paketine girer.

Yerel D1 ilk kurulumunda, Vite yapılandırmasındaki `DB` bağlamasını ve aynı `.wrangler/state` yolunu kullanan Wrangler üzerinden `drizzle/*.sql` geçişlerini sırasıyla uygulayın. Sites barındırmada geçişler yayın sırasında uygulanır. Uygulama çalışma anında şema oluşturmaz.

```sh
npm run test
npm run typecheck
npm run build
```

## Çalışma güvenceleri ve sınırlar

- Her adım atomik, süreli bir veritabanı kilidi alır; çift tıklama aynı adımı eşzamanlı başlatmaz.
- Geç kalmış bir çalışan, başka çalışanın devraldığı adımı değiştiremez.
- Personel çıktısı ile ilerleme aynı D1 işleminde kaydedilir.
- Duraklatma mevcut isteğin sonucunu korur; sonraki adımı başlatmaz.
- Hatalar önceki sonuçları korur; kullanıcı yeniden başlatır. Otomatik ücretli yeniden deneme yoktur.
- Sağlayıcı yanıt verdikten sonra ağ veya kayıt kesintisi yaşanırsa tekrar denemek ek API kullanımına yol açabilir; tam bir kez ücretlendirme garantisi yoktur.
- Personel sayısı proje başına 2–6; istek sayısı `2 × personel + 1`.

OpenAI sözleşmesi: [Responses API](https://developers.openai.com/api/reference/responses/create), [model](https://developers.openai.com/api/docs/models/gpt-4.1-mini). Kaynak uzman tanımları mevcut Agency Agents MIT lisansı altında korunur.
