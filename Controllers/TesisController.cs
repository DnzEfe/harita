using AutoMapper;
using Microsoft.AspNetCore.Mvc;
using NetTopologySuite.Geometries;
using System.Collections.Generic;
using System.Linq;
using turkiye_haritası;
using turkiye_haritası.DTOs;
using turkiye_haritası.Models;

namespace turkiye_haritası.Controllers
{
    [Route("api/tesis")]
    [ApiController]
    public class TesisController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public TesisController(AppDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        // 1. TÜM TESİSLERİ GETİR
        [HttpGet]
        public IActionResult GetTesisler()
        {
            var tesisler = _context.Tesisler.ToList();
            var dtolar = _mapper.Map<List<TesisDTO>>(tesisler);
            return Ok(dtolar);
        }

        // 2. YENİ TESİS EKLE
        [HttpPost]
        public IActionResult TesisEkle([FromBody] TesisDTO tesisDto)
        {
            if (tesisDto == null) return BadRequest("Geçersiz veri.");

            // Manuel mapleme yapıyoruz ki AutoMapper'ın kafası Point dönüşümünde karışmasın
            var yeniTesis = new Tesis
            {
                TesisAdi = tesisDto.TesisAdi,
                TesisTuru = tesisDto.TesisTuru,
                KuruluGuc = tesisDto.KuruluGuc,
                Il = tesisDto.Il,
                // DTO'daki enlem/boylamı alıp, veritabanındaki tek "Konum" sütununa çeviriyoruz
                Konum = new Point(tesisDto.Boylam, tesisDto.Enlem) { SRID = 4326 }
            };

            _context.Tesisler.Add(yeniTesis);
            _context.SaveChanges();

            // Haritanın popup açabilmesi için kaydedilen ID'yi DTO'ya ekleyip geri yolluyoruz
            tesisDto.Id = yeniTesis.Id;
            return Ok(tesisDto);
        }

        // 3. TESİS GÜNCELLE
        [HttpPut("{id}")]
        public IActionResult TesisGuncelle(int id, [FromBody] TesisDTO tesisDto)
        {
            if (id != tesisDto.Id) return BadRequest("ID uyuşmazlığı.");

            var tesis = _context.Tesisler.Find(id);
            if (tesis == null) return NotFound("Tesis bulunamadı.");

            tesis.TesisAdi = tesisDto.TesisAdi;
            tesis.TesisTuru = tesisDto.TesisTuru;
            tesis.KuruluGuc = tesisDto.KuruluGuc;
            tesis.Il = tesisDto.Il;

            // İşte bütün sorun buydu! Senin modelinde Enlem/Boylam yok, sadece Konum var.
            tesis.Konum = new Point(tesisDto.Boylam, tesisDto.Enlem) { SRID = 4326 };

            _context.Tesisler.Update(tesis);
            _context.SaveChanges();

            return Ok();
        }

        // 4. TESİS SİL
        [HttpDelete("{id}")]
        public IActionResult TesisSil(int id)
        {
            var tesis = _context.Tesisler.Find(id);
            if (tesis == null) return NotFound("Tesis bulunamadı.");

            _context.Tesisler.Remove(tesis);
            _context.SaveChanges();

            return Ok();
        }

        // 5. YARIÇAP ANALİZİ
        [HttpGet("analiz/yakindakiler")]
        public IActionResult YakindakileriGetir(double enlem, double boylam, double mesafeKm)
        {
            var merkezNokta = new Point(boylam, enlem) { SRID = 4326 };
            double mesafeDerece = mesafeKm / 111.0;

            // Poligon değil, merkez noktaya olan mesafeyi ölçüyoruz
            var bulunanTesisler = _context.Tesisler
                .Where(t => t.Konum.Distance(merkezNokta) <= mesafeDerece)
                .ToList();

            var dtolar = _mapper.Map<List<TesisDTO>>(bulunanTesisler);
            return Ok(dtolar);
        }
        // 6. POLİGON ANALİZİ
        [HttpPost("analiz/polygon")]
        public IActionResult PolygonIcindekiTesisleriGetir([FromBody] List<KoordinatSorguDTO> koseler)
        {
            if (koseler == null || koseler.Count < 3)
                return BadRequest("Geçerli bir alan çizilmedi.");

            var ilkNokta = koseler.First();
            var sonNokta = koseler.Last();
            if (ilkNokta.Enlem != sonNokta.Enlem || ilkNokta.Boylam != sonNokta.Boylam)
            {
                koseler.Add(new KoordinatSorguDTO { Enlem = ilkNokta.Enlem, Boylam = ilkNokta.Boylam });
            }

            var coordinates = koseler.Select(k => new Coordinate(k.Boylam, k.Enlem)).ToArray();
            var linearRing = new LinearRing(coordinates);
            Geometry polygon = new Polygon(linearRing) { SRID = 4326 };
            // Within yerine Intersects kullanıyoruz ki sınır çizgisindeki tesisleri de kaçırmadan yakalasın
            var bulunanTesisler = _context.Tesisler
                .Where(t => t.Konum.Intersects(polygon))
                .ToList();

            var tesisDtoListesi = _mapper.Map<List<TesisDTO>>(bulunanTesisler);
            return Ok(tesisDtoListesi);
        }
    }

    public class KoordinatSorguDTO
    {
        public double Enlem { get; set; }
        public double Boylam { get; set; }
    }
}