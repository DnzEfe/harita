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

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.Entity<Tesis>().ToTable("tesisler");
        }
    }
}