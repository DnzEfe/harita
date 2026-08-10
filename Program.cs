using Microsoft.EntityFrameworkCore;
using turkiye_haritası; // AppDbContext dosyanın bulunduğu namespace

var builder = WebApplication.CreateBuilder(args);

// --- POSTGRESQL SERVİS KAYDI ---
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
// --------------------------------

builder.Services.AddControllersWithViews();

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