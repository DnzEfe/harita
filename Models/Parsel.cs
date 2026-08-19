using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using NetTopologySuite.Geometries;

namespace turkiye_haritası.Models
{
    [Table("parseller")]
    public class Parsel
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("il")]
        public string? Il { get; set; }

        [Column("ilce")]
        public string? Ilce { get; set; }

        // string yerine int? yapıldı
        [Column("ada_no")]
        public int? AdaNo { get; set; }

        // string yerine int? yapıldı
        [Column("parsel_no")]
        public int? ParselNo { get; set; }

        [Column("geom", TypeName = "geometry (geometry, 4326)")]
        [JsonIgnore]
        public Geometry? Geom { get; set; }
    }
}