using AutoMapper;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Linq;

using turkiye_haritası.DTOs;
using turkiye_haritası.Models;

namespace turkiye_haritası.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TesisController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper; // YENİ: AutoMapper Motoru

        // Constructor'a IMapper'ı dahil ettik
        public TesisController(AppDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        // 1. GET: Dışarıya Model değil, DTO gönderiyoruz
        [HttpGet]
        public IActionResult TesisleriGetir()
        {
            var gercekTesisler = _context.Tesisler.ToList();

            // TEK SATIRDA ÇEVİRİ: Tesis listesini TesisDTO listesine kopyala
            var tesisDtoListesi = _mapper.Map<List<TesisDTO>>(gercekTesisler);

            return Ok(tesisDtoListesi);
        }

        // 2. POST: Dışarıdan Model değil, DTO alıyoruz
        [HttpPost]
        public IActionResult TesisEkle([FromBody] TesisDTO yeniTesisDTO)
        {
            // Gelen DTO'yu veritabanına kaydetmek için Model'e çeviriyoruz
            var eklenecekTesis = _mapper.Map<Tesis>(yeniTesisDTO);

            _context.Tesisler.Add(eklenecekTesis);
            _context.SaveChanges(); // ID burada oluştu

            // Ön yüze cevap dönerken tekrar DTO'ya çeviriyoruz
            var kaydedilenTesisDTO = _mapper.Map<TesisDTO>(eklenecekTesis);
            return Ok(kaydedilenTesisDTO);
        }

        // 3. DELETE (Değişiklik yok)
        [HttpDelete("{id}")]
        public IActionResult TesisSil(int id)
        {
            var silinecekTesis = _context.Tesisler.Find(id);
            if (silinecekTesis == null) return NotFound("Tesis bulunamadı.");

            _context.Tesisler.Remove(silinecekTesis);
            _context.SaveChanges();
            return Ok(new { mesaj = "Tesis silindi." });
        }

        // 4. PUT: Uzun uzun atama yapmak yerine AutoMapper kullanıyoruz
        // TesisController.cs içine eklenecek

        [HttpGet("analiz/yakindakiler")]
        public IActionResult YakindakiTesisleriGetir(double enlem, double boylam, double mesafeKm)
        {
            // GIS Mühendislik Notu: SRID 4326'da 1 derece yaklaşık 111.32 kilometredir.
            double mesafeDerece = mesafeKm / 111.32;

            // Kullanıcının haritadan tıkladığı merkez noktayı oluşturuyoruz
            var merkezNokta = new NetTopologySuite.Geometries.Point(boylam, enlem) { SRID = 4326 };

            // POSTGIS SİHRİ: IsWithinDistance fonksiyonu arka planda ST_DWithin SQL komutuna dönüşür!
            var yakindakiTesisler = _context.Tesisler
                .Where(t => t.Konum.IsWithinDistance(merkezNokta, mesafeDerece))
                .ToList();

            // Bulunan tesisleri güvenli DTO paketimize çevirip ön yüze yolluyoruz
            var tesisDtoListesi = _mapper.Map<List<TesisDTO>>(yakindakiTesisler);

            return Ok(tesisDtoListesi);
        }
    }
}