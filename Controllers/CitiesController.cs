using Microsoft.AspNetCore.Mvc;

namespace turkiye_haritası.Controllers
{
    // DİKKAT: [Route] etiketlerini sildik, dümdüz Controller yaptık.
    public class CitiesController : Controller
    {
        public IActionResult Index()
        {
            var cities = new[]
            {
                new { name = "Adana", plate = "01", latitude = 37.0000, longitude = 35.3213 },
                new { name = "Ankara", plate = "06", latitude = 39.9334, longitude = 32.8597 },
                new { name = "Antalya", plate = "07", latitude = 36.8969, longitude = 30.7133 },
                new { name = "Bursa", plate = "16", latitude = 40.1828, longitude = 29.0667 },
                new { name = "Çanakkale", plate = "17", latitude = 40.1553, longitude = 26.4142 },
                new { name = "Diyarbakır", plate = "21", latitude = 37.9144, longitude = 40.2306 },
                new { name = "Erzurum", plate = "25", latitude = 39.9043, longitude = 41.2679 },
                new { name = "Eskişehir", plate = "26", latitude = 39.7767, longitude = 30.5206 },
                new { name = "Gaziantep", plate = "27", latitude = 37.0662, longitude = 37.3833 },
                new { name = "Hatay", plate = "31", latitude = 36.2000, longitude = 36.1667 },
                new { name = "İstanbul", plate = "34", latitude = 41.0082, longitude = 28.9784 },
                new { name = "İzmir", plate = "35", latitude = 38.4192, longitude = 27.1287 },
                new { name = "Kars", plate = "36", latitude = 40.6013, longitude = 43.0975 },
                new { name = "Kayseri", plate = "38", latitude = 38.7312, longitude = 35.4787 },
                new { name = "Kocaeli", plate = "41", latitude = 40.7654, longitude = 29.9408 },
                new { name = "Konya", plate = "42", latitude = 37.8667, longitude = 32.4833 },
                new { name = "Mersin", plate = "33", latitude = 36.8000, longitude = 34.6333 },
                new { name = "Samsun", plate = "55", latitude = 41.2867, longitude = 36.3300 },
                new { name = "Sivas", plate = "58", latitude = 39.7477, longitude = 37.0179 },
                new { name = "Trabzon", plate = "61", latitude = 41.0015, longitude = 39.7178 },
                new { name = "Van", plate = "65", latitude = 38.4891, longitude = 43.3811 }
            };

            // Veriyi saf JSON olarak dışarı basıyoruz
            return Json(cities);
        }
    }
}