using NetTopologySuite.Geometries; // Bu kütüphaneyi eklemeyi unutma

namespace turkiye_haritası.Models
{
    public class Tesis
    {
        public int Id { get; set; }
        public string TesisAdi { get; set; }
        public string TesisTuru { get; set; }
        public double KuruluGuc { get; set; }
        public string Il { get; set; }

        
        public Point Konum { get; set; }
    }
}