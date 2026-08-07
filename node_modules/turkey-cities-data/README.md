
# 🇹🇷 turkey-cities-data

📍 Türkiye şehirlerine ait **şehir verisi paketi**:  
Plaka, koordinat (lat/lon), nüfus (2024 ADNKS) ve coğrafi bölge bilgilerini içerir.

## 🔧 Kurulum

```bash
npm i turkey-cities-data
```

## 🚀 Kullanım

```ts
import cities from "turkey-cities-data";

const istanbul = cities.get("istanbul");

console.log(istanbul);

/*
{
  id: 77,
  slug: "istanbul",
  label: "İstanbul",
  plate: "34",
  coord: { lat: 41.0082, lon: 28.9784 },
  region: { slug: "marmara", label: "Marmara" },
  population: 15701602
}
*/
```

## 📁 Veri Yapısı

Her şehir nesnesi şu alanları içerir:

| Alan         | Açıklama                                 |
|--------------|--------------------------------------------|
| `id`         | A–Z sırasına göre artan ID                |
| `slug`       | Küçük harfli anahtar (örn: `"ankara"`)    |
| `label`      | Şehir adı                                 |
| `plate`      | 2 haneli plaka kodu (`"01"` - `"81"`)     |
| `coord`      | `{ lat, lon }` koordinat bilgisi          |
| `region`     | `{ slug, label }` → Coğrafi bölge bilgisi |
| `population` | 2024 sonu ADNKS nüfus değeri              |

## 🧠 Ek Özellik

Paket bir dizi (`Array`) olarak çalışır ancak şu ek yöntemi destekler:

```ts
cities.get(slug: string): City | null
```

Bu sayede doğrudan şehre erişmek mümkündür:

```ts
const izmir = cities.get("izmir");
```

## 🗺️ Bölgeler

Şehirler 7 coğrafi bölgeye göre sınıflandırılmıştır:

- 🟠 Akdeniz  
- 🟡 Ege  
- 🔵 Marmara  
- 🟢 Karadeniz  
- ⚪ İç Anadolu  
- 🟣 Doğu Anadolu  
- 🔴 Güneydoğu Anadolu  

## 📦 Yayın

Paket şu platformlarda yayınlanmaktadır:

- [NPM](https://www.npmjs.com/package/turkey-cities-data)
- [GitHub](https://github.com/mevlutcelik/turkey-cities-data)

## 🧩 TypeScript Desteği

Paket tam TypeScript desteği içerir. Autocomplete & tip güvenliği desteklenir.

```ts
interface City {
  id: number;
  slug: string;
  label: string;
  plate: string;
  coord: {
    lat: number;
    lon: number;
  };
  region: {
    slug: string;
    label: string;
  };
  population: number;
}
```

## 📄 Lisans

MIT © 2025 Mevlüt Çelik
