using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

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
        public double KuruluGuc { get; set; } // MW cinsinden kurulu güç

        [Column("il_adi")]
        public string? IlAdi { get; set; }

        [Column("enlem")]
        public double Enlem { get; set; }

        [Column("boylam")]
        public double Boylam { get; set; }

        [Column("kayit_tarihi")]
        public DateTime KayitTarihi { get; set; } = DateTime.UtcNow;
    }
}