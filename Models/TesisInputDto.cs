namespace turkiye_haritası.Models
{
    public class TesisInputDto
    {
        public int Id { get; set; }
        public string TesisAdi { get; set; } = string.Empty;
        public string TesisTuru { get; set; } = string.Empty;
        public double KuruluGuc { get; set; }
        public string? IlAdi { get; set; }
        public double Enlem { get; set; }
        public double Boylam { get; set; }
    }
}