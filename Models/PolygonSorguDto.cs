using System.Collections.Generic;

namespace turkiye_haritası.Models
{
    // Polygon çizerken kullanıcının işaretlediği tek bir köşe noktası
    public class PolygonNoktaDto
    {
        public double Lat { get; set; }
        public double Lon { get; set; }
    }

    // Frontend'den (map.js) gelen, kullanıcının çizdiği polygonun
    // tüm köşe noktalarını taşıyan istek gövdesi
    public class PolygonSorguDto
    {
        public List<PolygonNoktaDto> Noktalar { get; set; } = new();
    }
}