using Microsoft.AspNetCore.Mvc;
using System.Linq;

using turkiye_haritası.Models;

namespace turkiye_haritası.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TesisController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TesisController(AppDbContext context)
        {
            _context = context;
        }

        // 1. VERİTABANINDAN TESİSLERİ ÇEKME (GET)
        [HttpGet]
        public IActionResult TesisleriGetir()
        {
            _context.Database.EnsureCreated();

            var tesisListesi = _context.Tesisler.ToList();
            return Ok(tesisListesi);
        }

        // 2. VERİTABANINA YENİ TESİS EKLEME (POST)
        [HttpPost]
        public IActionResult TesisEkle([FromBody] Tesis yeniTesis)
        {
            _context.Tesisler.Add(yeniTesis);
            _context.SaveChanges();

            return Ok(yeniTesis);
        }

        // 3. VERİTABANINDAN TESİS SİLME (DELETE)
        [HttpDelete("{id}")]
        public IActionResult TesisSil(int id)
        {
            var silinecekTesis = _context.Tesisler.Find(id);
            if (silinecekTesis == null)
            {
                return NotFound("Tesis bulunamadı.");
            }

            _context.Tesisler.Remove(silinecekTesis);
            _context.SaveChanges();

            return Ok(new { mesaj = "Tesis başarıyla silindi." });
        }

        // 4. VERİTABANINDA TESİS GÜNCELLEME (PUT) - İSTEDİĞİN SON DÜZENLEME KISMI
        [HttpPut("{id}")]
        public IActionResult TesisGuncelle(int id, [FromBody] Tesis guncelTesis)
        {
            var mevcutTesis = _context.Tesisler.Find(id);
            if (mevcutTesis == null)
            {
                return NotFound("Tesis bulunamadı.");
            }

            // Gelen yeni verileri mevcut tesisin üzerine yazıyoruz
            mevcutTesis.TesisAdi = guncelTesis.TesisAdi;
            mevcutTesis.TesisTuru = guncelTesis.TesisTuru;
            mevcutTesis.KuruluGuc = guncelTesis.KuruluGuc;
            mevcutTesis.Il = guncelTesis.Il;
            mevcutTesis.Enlem = guncelTesis.Enlem;
            mevcutTesis.Boylam = guncelTesis.Boylam;

            _context.SaveChanges();

            return Ok(new { mesaj = "Tesis başarıyla güncellendi." });
        }
    }
}