# Local MD

Kurulum gerektirmeyen, dosyaları tarayıcıdan dışarı göndermeyen, çoklu sekmeli yerel Markdown görüntüleyici.

## Docker olmadan çalıştırma

Yayınlanan paketler Node.js, Docker veya ayrı bir kurulum gerektirmez. İndirdiğiniz tek dosyayı çalıştırın; uygulama varsayılan tarayıcıda açılır.

| Bilgisayar | Dosya |
| --- | --- |
| Apple Silicon Mac | `local-md-macos-arm64` |
| Intel Mac | `local-md-macos-intel` |
| Windows 64-bit | `Local-MD.exe` |
| Linux 64-bit | `local-md-linux` |

Mac ve Linux'ta ilk kez çalıştırmadan önce Terminal'de dosyaya çalıştırma izni verin:

```bash
chmod +x local-md-macos-arm64 # veya ilgili Mac/Linux dosyası
```

İşletim sistemi güvenlik uyarısı gösterirse dosyanın güvenilir kaynaktan geldiğini doğrulayarak çalıştırmaya izin verin. Açılan terminal penceresi uygulamanın yerel sunucusudur; uygulamayı kapatmak için bu pencereyi kapatın. Kaydedilen Markdown belgeleri, çalıştırılabilir dosyanın yanındaki `documents/markdown_viewer/` klasöründe tutulur.

### Kaynaktan başlatma

Node.js kuruluysa Mac'te `Local MD.command` dosyasına çift tıklayın; Windows'ta `Local MD.bat` dosyasını açın; Linux'ta şunu çalıştırın:

```bash
chmod +x local-md.sh
./local-md.sh
```

Başlatıcı açık kaldığı sürece uygulama çalışır. `index.html` dosyasını doğrudan açmayın; proje içine kayıt için yerel sunucunun çalışması gerekir.

### Taşınabilir paket üretme

Geliştirme makinesinde bir kez:

```bash
npm install
npm run package:all
```

Dosyalar `dist/` içine oluşur. GitHub Actions içindeki **Portable packages** iş akışı, `v` ile başlayan bir etiket gönderildiğinde ya da elle başlatıldığında Mac, Windows ve Linux paketlerini bağımsız olarak üretir ve indirilebilir artefakt olarak ekler. Böylece hedef bilgisayarda Docker ya da Node.js bulunması gerekmez.

## Docker ile arka planda çalıştırma

Docker Desktop açıkken proje klasöründe bir kez çalıştırın:

```bash
docker compose up -d --build
```

Uygulama <http://127.0.0.1:4173> adresinde açılır. Container, Docker yeniden başladığında otomatik olarak yeniden çalışır. Markdown dosyaları container içinde kalmaz; `./documents` klasörüne yazılır.

Durumu görmek için:

```bash
docker compose ps
docker compose logs -f
```

Durdurmak ve tekrar başlatmak için:

```bash
docker compose stop
docker compose start
```

Container'ı kaldırmak için `docker compose down` kullanılabilir. Bu işlem `documents/markdown_viewer/` klasöründeki dosyaları silmez.

## Özellikler

- `.md`, `.markdown`, `.mdown`, `.mkd` açma ve sürükle-bırak
- Chrome benzeri çoklu dosya sekmeleri
- Açık sekmeler arasında `⌘/Ctrl + Tab` ile geçiş
- `⌘/Ctrl + S` ile proje içindeki `documents/markdown_viewer/` klasörüne kayıt
- Uygulama içinden kayıtlı proje dosyalarını yeniden açma
- Canlı bölünmüş düzenleyici / okuma modu
- Başlıklardan otomatik içerik ağacı
- Koyu ve açık tema
- Önizlemede arama
- Kelime, karakter ve okuma süresi istatistikleri
- Markdown, tek dosyalık HTML ve doğrudan indirilen çok sayfalı PDF çıktısı
- Tablolar, görev listeleri, kod blokları, alıntılar, görseller ve bağlantılar
- Klavye kısayolları

Tüm işlemler yerel olarak gerçekleşir; dosya içeriği bir sunucuya yüklenmez.
