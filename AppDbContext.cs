using Microsoft.EntityFrameworkCore;
using turkiye_haritası.Models; // Models klasörünün namespace'i

namespace turkiye_haritası
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // PostgreSQL tarafında "Tesisler" adında bir tablo oluşturacak
        public DbSet<Tesis> Tesisler { get; set; }
    }
}