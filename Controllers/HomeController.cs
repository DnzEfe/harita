using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Point = NetTopologySuite.Geometries.Point;
using System;
using System.Diagnostics;
using System.Globalization;
using System.Linq;
using turkiye_haritası.Data;
using turkiye_haritası.Models;

namespace turkiye_haritası.Controllers
{
    public class HomeController : Controller
    {
        private readonly AppDbContext _context;

        public HomeController(AppDbContext context)
        {
            _context = context;
        }

        public IActionResult Index() => View();
        public IActionResult Privacy() => View();

        // 1. Tüm Tesisleri PostgreSQL/PostGIS'ten Getiren Endpoint
        [HttpGet]
        public IActionResult Tesisler()
        {
            var liste = _context.Tesisler.ToList();
            return Json(liste);
        }

        // 2. Yeni Tesisi PostGIS geometry olarak kaydeden Endpoint
        [HttpPost]
        public IActionResult TesisEkle([FromBody] TesisInputDto girdi)
        {
            if (girdi == null)
            {
                return BadRequest("Geçersiz veri.");
            }

            var yeniTesis = new Tesis
            {
                TesisAdi = girdi.TesisAdi,
                TesisTuru = girdi.TesisTuru,
                KuruluGuc = girdi.KuruluGuc,
                IlAdi = girdi.IlAdi,
                Konum = new Point(girdi.Boylam, girdi.Enlem) { SRID = 4326 },
                KayitTarihi = DateTime.UtcNow
            };

            _context.Tesisler.Add(yeniTesis);
            _context.SaveChanges();

            return Ok(yeniTesis);
        }

        // 3. Tesisi Silen Endpoint
        [HttpPost]
        public IActionResult TesisSil([FromBody] int id)
        {
            var tesis = _context.Tesisler.Find(id);
            if (tesis == null)
            {
                return NotFound("Silinecek tesis bulunamadı.");
            }

            _context.Tesisler.Remove(tesis);
            _context.SaveChanges();

            return Ok(new { success = true, id = id });
        }

        // 4. Tesisi PostGIS geometry olarak güncelleyen Endpoint
        [HttpPost]
        public IActionResult TesisGuncelle([FromBody] TesisInputDto girdi)
        {
            if (girdi == null || girdi.Id <= 0)
            {
                return BadRequest("Geçersiz tesis bilgisi.");
            }

            var mevcutTesis = _context.Tesisler.Find(girdi.Id);
            if (mevcutTesis == null)
            {
                return NotFound("Güncellenecek tesis bulunamadı.");
            }

            mevcutTesis.TesisAdi = girdi.TesisAdi;
            mevcutTesis.TesisTuru = girdi.TesisTuru;
            mevcutTesis.KuruluGuc = girdi.KuruluGuc;
            mevcutTesis.IlAdi = girdi.IlAdi;
            mevcutTesis.Konum = new Point(girdi.Boylam, girdi.Enlem) { SRID = 4326 };

            _context.SaveChanges();

            return Ok(mevcutTesis);
        }

        // 5. Parselleri GeoJSON Olarak Dönen Endpoint (ArcGIS GeoJSONLayer için)
        [HttpGet]
        public IActionResult ParsellerGeoJson()
        {
            var connection = _context.Database.GetDbConnection();
            try
            {
                if (connection.State != System.Data.ConnectionState.Open)
                    connection.Open();

                using var cmd = connection.CreateCommand();
                cmd.CommandText = @"
                    SELECT json_build_object(
                        'type', 'FeatureCollection',
                        'features', COALESCE(json_agg(
                            json_build_object(
                                'type', 'Feature',
                                'id', id,
                                'geometry', ST_AsGeoJSON(geom)::json,
                                'properties', json_build_object(
                                    'id', id,
                                    'ada_no', ada_no,
                                    'parsel_no', parsel_no,
                                    'il', il,
                                    'ilce', ilce
                                )
                            )
                        ), '[]'::json)
                    )::text
                    FROM parseller;";

                var result = cmd.ExecuteScalar()?.ToString() ?? "{\"type\":\"FeatureCollection\",\"features\":[]}";
                return Content(result, "application/json");
            }
            finally
            {
                if (connection.State == System.Data.ConnectionState.Open)
                    connection.Close();
            }
        }

        // 6. Parsele Tıklandığında Parsel Bilgisi ve İçindeki Tesisleri Getiren Endpoint
        [HttpGet]
        public IActionResult ParselDetay(int id)
        {
            var parsel = _context.Parseller.FirstOrDefault(p => p.Id == id);
            if (parsel == null)
            {
                return NotFound("Parsel bulunamadı.");
            }

            // PostGIS Mekânsal Kesişim: Parsel poligonu içinde kalan tesisleri çeker
            var sql = @"
                SELECT t.* 
                FROM tesisler t
                INNER JOIN parseller p ON ST_Intersects(p.geom, t.konum)
                WHERE p.id = {0}";

            var icindekiTesisler = _context.Tesisler
                .FromSqlRaw(sql, id)
                .AsNoTracking()
                .ToList();

            return Json(new
            {
                id = parsel.Id,
                adaNo = parsel.AdaNo,
                parselNo = parsel.ParselNo,
                il = parsel.Il,
                ilce = parsel.Ilce,
                tesisler = icindekiTesisler
            });
        }

        // 7. Mevcut İller Listesi
        [HttpGet]
        public IActionResult Iller()
        {
            var illerListesi = new[]
            {
                new { plaka = 1, ad = "Adana", lat = 37.000000, lon = 35.321333 },
                new { plaka = 2, ad = "Adıyaman", lat = 37.764167, lon = 38.276167 },
                new { plaka = 3, ad = "Afyonkarahisar", lat = 38.750700, lon = 30.556700 },
                new { plaka = 4, ad = "Ağrı", lat = 39.719100, lon = 43.050300 },
                new { plaka = 5, ad = "Amasya", lat = 40.649900, lon = 35.835300 },
                new { plaka = 6, ad = "Ankara", lat = 39.933400, lon = 32.859700 },
                new { plaka = 7, ad = "Antalya", lat = 36.896900, lon = 30.713300 },
                new { plaka = 8, ad = "Artvin", lat = 41.182800, lon = 41.818300 },
                new { plaka = 9, ad = "Aydın", lat = 37.856000, lon = 27.841600 },
                new { plaka = 10, ad = "Balıkesir", lat = 39.648400, lon = 27.882600 },
                new { plaka = 11, ad = "Bilecik", lat = 40.150600, lon = 29.979200 },
                new { plaka = 12, ad = "Bingöl", lat = 38.885300, lon = 40.498000 },
                new { plaka = 13, ad = "Bitlis", lat = 38.400600, lon = 42.109500 },
                new { plaka = 14, ad = "Bolu", lat = 40.739200, lon = 31.608900 },
                new { plaka = 15, ad = "Burdur", lat = 37.720400, lon = 30.290800 },
                new { plaka = 16, ad = "Bursa", lat = 40.188500, lon = 29.061000 },
                new { plaka = 17, ad = "Çanakkale", lat = 40.155300, lon = 26.414200 },
                new { plaka = 18, ad = "Çankırı", lat = 40.601300, lon = 33.613400 },
                new { plaka = 19, ad = "Çorum", lat = 40.550600, lon = 34.955600 },
                new { plaka = 20, ad = "Denizli", lat = 37.776500, lon = 29.086400 },
                new { plaka = 21, ad = "Diyarbakır", lat = 37.914400, lon = 40.230600 },
                new { plaka = 22, ad = "Edirne", lat = 41.677200, lon = 26.555700 },
                new { plaka = 23, ad = "Elazığ", lat = 38.681000, lon = 39.226400 },
                new { plaka = 24, ad = "Erzincan", lat = 39.750000, lon = 39.500000 },
                new { plaka = 25, ad = "Erzurum", lat = 39.904300, lon = 41.267900 },
                new { plaka = 26, ad = "Eskişehir", lat = 39.776700, lon = 30.520600 },
                new { plaka = 27, ad = "Gaziantep", lat = 37.066200, lon = 37.383300 },
                new { plaka = 28, ad = "Giresun", lat = 40.912800, lon = 38.389500 },
                new { plaka = 29, ad = "Gümüşhane", lat = 40.460200, lon = 39.481400 },
                new { plaka = 30, ad = "Hakkari", lat = 37.583300, lon = 43.733300 },
                new { plaka = 31, ad = "Hatay", lat = 36.401800, lon = 36.349800 },
                new { plaka = 32, ad = "Isparta", lat = 37.764800, lon = 30.556600 },
                new { plaka = 33, ad = "Mersin", lat = 36.800000, lon = 34.633300 },
                new { plaka = 34, ad = "İstanbul", lat = 41.008200, lon = 28.978400 },
                new { plaka = 35, ad = "İzmir", lat = 38.423700, lon = 27.142800 },
                new { plaka = 36, ad = "Kars", lat = 40.617200, lon = 43.087500 },
                new { plaka = 37, ad = "Kastamonu", lat = 41.388700, lon = 33.782700 },
                new { plaka = 38, ad = "Kayseri", lat = 38.731200, lon = 35.478700 },
                new { plaka = 39, ad = "Kırklareli", lat = 41.733300, lon = 27.216700 },
                new { plaka = 40, ad = "Kırşehir", lat = 39.142500, lon = 34.170900 },
                new { plaka = 41, ad = "Kocaeli", lat = 40.853300, lon = 29.881500 },
                new { plaka = 42, ad = "Konya", lat = 37.874600, lon = 32.493200 },
                new { plaka = 43, ad = "Kütahya", lat = 39.416700, lon = 29.983300 },
                new { plaka = 44, ad = "Malatya", lat = 38.355200, lon = 38.309500 },
                new { plaka = 45, ad = "Manisa", lat = 38.619100, lon = 27.428900 },
                new { plaka = 46, ad = "Kahramanmaraş", lat = 37.585800, lon = 36.937100 },
                new { plaka = 47, ad = "Mardin", lat = 37.321200, lon = 40.724500 },
                new { plaka = 48, ad = "Muğla", lat = 37.215300, lon = 28.363600 },
                new { plaka = 49, ad = "Muş", lat = 38.743200, lon = 41.506400 },
                new { plaka = 50, ad = "Nevşehir", lat = 38.624400, lon = 34.714400 },
                new { plaka = 51, ad = "Niğde", lat = 37.966700, lon = 34.683300 },
                new { plaka = 52, ad = "Ordu", lat = 40.983900, lon = 37.876400 },
                new { plaka = 53, ad = "Rize", lat = 41.020100, lon = 40.523400 },
                new { plaka = 54, ad = "Sakarya", lat = 40.756900, lon = 30.378300 },
                new { plaka = 55, ad = "Samsun", lat = 41.292800, lon = 36.331300 },
                new { plaka = 56, ad = "Siirt", lat = 37.933300, lon = 41.950000 },
                new { plaka = 57, ad = "Sinop", lat = 42.023100, lon = 35.153100 },
                new { plaka = 58, ad = "Sivas", lat = 39.747700, lon = 37.017900 },
                new { plaka = 59, ad = "Tekirdağ", lat = 40.983300, lon = 27.516700 },
                new { plaka = 60, ad = "Tokat", lat = 40.316700, lon = 36.550000 },
                new { plaka = 61, ad = "Trabzon", lat = 41.002700, lon = 39.716700 },
                new { plaka = 62, ad = "Tunceli", lat = 39.107900, lon = 39.540100 },
                new { plaka = 63, ad = "Şanlıurfa", lat = 37.159100, lon = 38.796900 },
                new { plaka = 64, ad = "Uşak", lat = 38.682300, lon = 29.408200 },
                new { plaka = 65, ad = "Van", lat = 38.489100, lon = 43.408900 },
                new { plaka = 66, ad = "Yozgat", lat = 39.818100, lon = 34.814700 },
                new { plaka = 67, ad = "Zonguldak", lat = 41.456400, lon = 31.798700 },
                new { plaka = 68, ad = "Aksaray", lat = 38.368700, lon = 34.037000 },
                new { plaka = 69, ad = "Bayburt", lat = 40.255200, lon = 40.224900 },
                new { plaka = 70, ad = "Karaman", lat = 37.175900, lon = 33.228700 },
                new { plaka = 71, ad = "Kırıkkale", lat = 39.846800, lon = 33.515300 },
                new { plaka = 72, ad = "Batman", lat = 37.881200, lon = 41.135100 },
                new { plaka = 73, ad = "Şırnak", lat = 37.516400, lon = 42.461100 },
                new { plaka = 74, ad = "Bartın", lat = 41.635800, lon = 32.337500 },
                new { plaka = 75, ad = "Ardahan", lat = 41.110500, lon = 42.702200 },
                new { plaka = 76, ad = "Iğdır", lat = 39.918000, lon = 44.045700 },
                new { plaka = 77, ad = "Yalova", lat = 40.650000, lon = 29.266700 },
                new { plaka = 78, ad = "Karabük", lat = 41.206100, lon = 32.620400 },
                new { plaka = 79, ad = "Kilis", lat = 36.718400, lon = 37.121200 },
                new { plaka = 80, ad = "Osmaniye", lat = 37.074200, lon = 36.247800 },
                new { plaka = 81, ad = "Düzce", lat = 40.843800, lon = 31.156500 }
            };

            return Json(illerListesi);
        }

        // 8. Nokta ve yarıçap (km) içindeki tesisleri bulan Endpoint
        [HttpGet]
        public IActionResult YakinTesisler(double lat, double lon, double radiusKm = 50)
        {
            if (radiusKm < 1) radiusKm = 1;
            if (radiusKm > 300) radiusKm = 300;

            double radiusMetre = radiusKm * 1000.0;

            var sql = @"
                SELECT * FROM tesisler
                WHERE ST_DWithin(
                    konum::geography,
                    ST_SetSRID(ST_MakePoint({0}, {1}), 4326)::geography,
                    {2}
                )";

            var sonuc = _context.Tesisler
                .FromSqlRaw(sql, lon, lat, radiusMetre)
                .AsNoTracking()
                .ToList();

            return Json(sonuc);
        }

        // 9. Çizilen polygon içindeki tesisleri bulan Endpoint
        [HttpPost]
        public IActionResult TesislerPolygonIcinde([FromBody] PolygonSorguDto girdi)
        {
            if (girdi == null || girdi.Noktalar == null || girdi.Noktalar.Count < 3)
            {
                return BadRequest("Geçerli bir alan için en az 3 nokta gerekli.");
            }

            var noktalar = girdi.Noktalar.ToList();

            var ilk = noktalar[0];
            var son = noktalar[^1];
            if (ilk.Lat != son.Lat || ilk.Lon != son.Lon)
            {
                noktalar.Add(ilk);
            }

            var wktNoktalar = string.Join(", ", noktalar.Select(n =>
                n.Lon.ToString(CultureInfo.InvariantCulture) + " " +
                n.Lat.ToString(CultureInfo.InvariantCulture)));

            var polygonWkt = $"POLYGON(({wktNoktalar}))";

            var sql = @"
                SELECT * FROM tesisler
                WHERE ST_Contains(
                    ST_SetSRID(ST_GeomFromText({0}), 4326),
                    konum
                )";

            var sonuc = _context.Tesisler
                .FromSqlRaw(sql, polygonWkt)
                .AsNoTracking()
                .ToList();

            return Json(sonuc);
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}