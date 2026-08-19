using NetTopologySuite.Geometries;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProjeninAdAlaniniYaz // Kendi namespace'in neyse o kalsın
{
    [Table("parseller")] // Veritabanındaki tablonun tam adı
    public class Parsel
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("ada_no")]
        public int AdaNo { get; set; }

        [Column("parselno")]
        public int ParselNo { get; set; }

        [Column("il")]
        public string Il { get; set; }

        [Column("ilçe")]
        public string Ilce { get; set; }

        // Geometri (Poligon) Sütunu. QGIS'ten aktarırken 'konum' demiştik
        [Column("konum")]
        public Geometry Konum { get; set; }
    }
}