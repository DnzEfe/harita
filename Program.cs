using Microsoft.EntityFrameworkCore;
using turkiye_haritası; // AppDbContext dosyanın bulunduğu namespace

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        x => x.UseNetTopologySuite() // YENİ: GIS (Coğrafi) yeteneğini açıyoruz
    )
);

builder.Services.AddControllersWithViews();

// AutoMapper'ı sisteme tanıtıyoruz
builder.Services.AddAutoMapper(config =>
{
    config.AddProfile<turkiye_haritası.Mappings.TesisProfile>();
});

var app = builder.Build();

// HTTP istek boru hattını yapılandırıyoruz
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();

// Standart statik dosya izni (orijinal hali)
app.UseStaticFiles();

app.UseRouting();

app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();