require([
    "esri/Map",
    "esri/views/MapView",
    "esri/Graphic",
    "esri/layers/GraphicsLayer",
    "esri/widgets/Fullscreen",
    "esri/widgets/BasemapGallery",
    "esri/widgets/Expand"
], function (Map, MapView, Graphic, GraphicsLayer, Fullscreen, BasemapGallery, Expand) {

    const map = new Map({
        basemap: "satellite"
    });

    const view = new MapView({
        container: "viewDiv",
        map: map,
        center: [35.2433, 38.9637],
        zoom: 6
    });

    const graphicsLayer = new GraphicsLayer();
    map.add(graphicsLayer);

    const ankaraPoint = {
        type: "point",
        longitude: 32.8597,
        latitude: 39.9334
    };

    const markerSymbol = {
        type: "simple-marker",
        color: [226, 119, 40],
        outline: { color: [255, 255, 255], width: 1 }
    };

    const pointGraphic = new Graphic({
        geometry: ankaraPoint,
        symbol: markerSymbol,
        attributes: { Name: "Ankara" },
        popupTemplate: {
            title: "{Name}",
            content: "Türkiye'nin başkenti"
        }
    });

    graphicsLayer.add(pointGraphic);

    // =========================================================
    // SOL ÜST KÖŞEYE (ZOOM ALTINA) EKLENEN BUTONLAR
    // =========================================================

    // 1. TAM EKRAN (FULLSCREEN) BUTONU
    const fullscreen = new Fullscreen({
        view: view
    });
    // Zoom butonlarının hemen altına yerleşir
    view.ui.add(fullscreen, "top-left");

    // 2. ALTLIK HARİTA GALERİSİ (BASEMAP GALLERY) BUTONU
    const basemapGallery = new BasemapGallery({
        view: view
    });

    // Harita galeri kutusunu küçük bir buton simgesine dönüştürür
    const bgExpand = new Expand({
        view: view,
        content: basemapGallery,
        expandIconClass: "esri-icon-basemap",
        expandTooltip: "Harita Türünü Değiştir"
    });
    // Tam ekran butonunun hemen altına yerleşir
    view.ui.add(bgExpand, "top-left");

});
// Tam ekran değişimlerini dinle ve ekrandan çıkınca haritayı yeniden boyutlandır
document.addEventListener("fullscreenchange", function () {
    if (!document.fullscreenElement) {
        // Tam ekrandan çıkıldığında çalışır
        setTimeout(function () {
            if (view && view.container) {
                // Çizim alanını yeniden hesaplatmak için dikey boyutu tazele
                view.container.style.display = "none";
                view.container.offsetHeight; // Force reflow (yeniden çizim tetikle)
                view.container.style.display = "block";
            }
        }, 100);
    }
});