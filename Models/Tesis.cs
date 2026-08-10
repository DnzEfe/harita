namespace turkiye_haritası.Models // Kendi proje adını yaz
{
    public class Tesis
    {
        public int Id { get; set; } // Primary Key (Otomatik artan ID)
        public string TesisAdi { get; set; }
        public string TesisTuru { get; set; } // HES, GES, RES, Termik
        public double KuruluGuc { get; set; }
        public string Il { get; set; }
        public double Enlem { get; set; }
        public double Boylam { get; set; }
    }
}