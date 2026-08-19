using Microsoft.EntityFrameworkCore;
using turkiye_haritası.Models;

namespace turkiye_haritası.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Tesis> Tesisler { get; set; }
        public DbSet<Parsel> Parseller { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Tesis>(entity =>
            {
                entity.ToTable("tesisler");

                entity.Property(t => t.Konum)
                      .HasColumnType("geometry (point, 4326)");
            });

            modelBuilder.Entity<Parsel>(entity =>
            {
                entity.ToTable("parseller");

                entity.Property(p => p.Geom)
                      .HasColumnType("geometry (geometry, 4326)");
            });
        }
    }
}