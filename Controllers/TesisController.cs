using Microsoft.AspNetCore.Mvc;
using turkiye_haritası.Models;
using turkiye_haritası;
using turkiye_haritası.Models;

namespace turkiye_haritası.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TesisController : ControllerBase
    {
        private readonly AppDbContext _context;

        // Dependency Injection ile DbContext bağlandı
        public TesisController(AppDbContext context)
        {
            _context = context;
        }

        // 1. VERİTABANINA TESİS KAYDETME (POST)
        [HttpPost]
        public IActionResult TesisEkle([FromBody] Tesis yeniTesis)
        {
            if (yeniTesis == null)
            {
                return BadRequest("Geçersiz tesis verisi.");
            }

            // Veritabanı ve "Tesisler" tablosu yoksa PostgreSQL'de otomatik açar
            _context.Database.EnsureCreated();

            _context.Tesisler.Add(yeniTesis); // Tabloya ekle
            _context.SaveChanges();           // PostgreSQL'e işle

            return Ok(new { mesaj = "Tesis veritabanına kaydedildi!", data = yeniTesis });
        }

        // 2. SAYFA YENİLENDİĞİNDE VERİTABANINDAKİ TESİSLERİ HARİTAYA ÇEKME (GET)
        [HttpGet]
        public IActionResult TesisleriGetir()
        {
            _context.Database.EnsureCreated();
            var tesisListesi = _context.Tesisler.ToList();
            return Ok(tesisListesi);
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
    }
}