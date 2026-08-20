using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using turkiye_haritası;
using System.Diagnostics;
using turkiye_haritası.Models;

[Route("api/[controller]")]
[ApiController]
public class ParselController : ControllerBase
{
    private readonly AppDbContext _context;

    public ParselController(AppDbContext context)
    {
        _context = context;
    }


    // 1. Parselleri Haritaya Gönderme (WKT yerine Koordinat Dizisi yapıyoruz)
    [HttpGet]
    public async Task<IActionResult> GetParseller()
    {
        // 1. AŞAMA: Önce veritabanından gerekli bilgileri (geometri ile birlikte) SQL'in anlayacağı basitlikte çekiyoruz.
        var parsellerDb = await _context.Parseller
            .Select(p => new
            {
                p.Id,
                p.AdaNo,
                p.ParselNo,
                p.Il,
                p.Ilce,
                p.Konum // Geometri nesnesini bozmadan ham haliyle alıyoruz
            })
            .ToListAsync(); // Hata veren yer burasıydı, artık SQL'e zor bir şey sormadığımız için sorunsuz çalışacak.

        // 2. AŞAMA: Veritabanından gelen ham veriyi C# tarafında ArcGIS'in istediği dizi formatına çeviriyoruz.
        var parseller = parsellerDb.Select(p => new
        {
            p.Id,
            p.AdaNo,
            p.ParselNo,
            p.Il,
            p.Ilce,
            // Artık veritabanında değil, C# tarafında olduğumuz için bu dizi çevirisi sorunsuz çalışır.
            Koordinatlar = p.Konum.Coordinates.Select(c => new double[] { c.X, c.Y }).ToArray()
        }).ToList();

        return Ok(parseller);
    }

    // 2. YENİ: PostGIS Kesişim Sorgusu (Parselin içindeki tesisleri bulur)
    [HttpGet("{id}/tesisler")]
    public async Task<IActionResult> GetParselIcindekiler(int id)
    {
        var parsel = await _context.Parseller.FindAsync(id);
        if (parsel == null) return NotFound();

        // NetTopologySuite ile Intersects (Kesişim) veya Within (İçinde) sorgusu
        var icindekiTesisler = await _context.Tesisler
            .Where(t => t.Konum.Intersects(parsel.Konum))
            .Select(t => new
            {
                t.Id,
                t.TesisAdi // Tesis modelindeki ad sütununun ismi neyse onu yaz (örn: TesisAdi)
            })
            .ToListAsync();

        return Ok(icindekiTesisler);
    }

    [HttpGet("sorgula")]
    public async Task<IActionResult> Sorgula(int ada, int parsel)
    {
        // 1. Veriyi PostGIS'ten ham geometriyle çekiyoruz
        var dbKayıt = await _context.Parseller
            .Where(p => p.AdaNo == ada && p.ParselNo == parsel)
            .Select(p => new {
                p.Id,
                p.AdaNo,
                p.ParselNo,
                p.Il,
                p.Ilce,
                p.Konum
            })
            .FirstOrDefaultAsync();

        if (dbKayıt == null) return NotFound("Bu ada ve parsele ait kayıt bulunamadı.");

        // 2. ArcGIS'in anlayacağı koordinat dizisine C# (RAM) üzerinde çeviriyoruz
        var sonuc = new
        {
            dbKayıt.Id,
            dbKayıt.AdaNo,
            dbKayıt.ParselNo,
            dbKayıt.Il,
            dbKayıt.Ilce,
            Koordinatlar = dbKayıt.Konum.Coordinates.Select(c => new double[] { c.X, c.Y }).ToArray()
        };

        return Ok(sonuc);
    }
}