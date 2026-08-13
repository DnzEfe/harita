using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using Point = NetTopologySuite.Geometries.Point;

namespace turkiye_haritası.Models
{
    [Table("tesisler")]
    public class Tesis
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("tesis_adi")]
        public string TesisAdi { get; set; } = string.Empty;

        [Column("tesis_turu")]
        public string TesisTuru { get; set; } = string.Empty;

        [Column("kurulu_guc")]
        public double KuruluGuc { get; set; }

        [Column("il_adi")]
        public string? IlAdi { get; set; }

        // PostGIS native geometry kolonu (SRID 4326 - WGS84)
        // Artık enlem/boylam elle tutulmuyor, tek gerçek kaynak burası.
        [Column("konum", TypeName = "geometry (point, 4326)")]
        [JsonIgnore] // Ham geometry objesini JSON'a basmayalım, gereksiz kalabalık yapar
        public Point Konum { get; set; } = null!;

        [Column("kayit_tarihi")]
        public DateTime KayitTarihi { get; set; } = DateTime.UtcNow;

        // Frontend (map.js) ile geriye dönük uyumluluk için:
        // DB'de kolon DEĞİL, sadece Konum'dan türetilen salt-okunur alanlar.
        // Böylece map.js hiç değişmeden çalışmaya devam eder.
        [NotMapped]
        public double Enlem => Konum?.Y ?? 0;

        [NotMapped]
        public double Boylam => Konum?.X ?? 0;
    }
}