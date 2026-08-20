using System.Collections.Generic;

namespace TurkiyeHaritasi.Models
{
    // Kullanıcının form'dan gönderdiği sorgu parametreleri
    public class AdaParselSorguRequestDto
    {
        public string Il { get; set; }
        public string Ilce { get; set; }
        public string AdaNo { get; set; }
        public string ParselNo { get; set; }
    }

    // Backend'in frontend'e döndüğü sonuç
    public class AdaParselSorguResultDto
    {
        public int Id { get; set; }
        public string Il { get; set; }
        public string Ilce { get; set; }
        public string AdaNo { get; set; }
        public string ParselNo { get; set; }

        // Highlight + zoom için GeoJSON geometry (polygon)
        public string GeometryGeoJson { get; set; }

        // Frontend'te extent hesaplamayı kolaylaştırmak için bbox
        public double MinX { get; set; }
        public double MinY { get; set; }
        public double MaxX { get; set; }
        public double MaxY { get; set; }

        public List<TesisOzetDto> Tesisler { get; set; } = new List<TesisOzetDto>();
    }

    public class TesisOzetDto
    {
        public int Id { get; set; }
        public string Ad { get; set; }
        public double Enlem { get; set; }
        public double Boylam { get; set; }
    }
}