require([
    "esri/Map",
    "esri/views/MapView",
    "esri/Graphic",
    "esri/layers/GraphicsLayer",
    "esri/widgets/Fullscreen",
    "esri/widgets/BasemapGallery",
    "esri/widgets/Expand",
    "esri/Basemap",
    "esri/widgets/Search",
    "esri/widgets/DistanceMeasurement2D" // YENİ: Basit Mesafe Ölçüm Aracı
], function (Map, MapView, Graphic, GraphicsLayer, Fullscreen, BasemapGallery, Expand, Basemap, Search, DistanceMeasurement2D) {

    // 1. Haritayı oluştur 
    const map = new Map({
        basemap: "satellite"
    });

    // 2. Görünümü oluştur
    const view = new MapView({
        container: "viewDiv",
        map: map,
        center: [35.2433, 38.9637],
        zoom: 6
    });

    // --- ARAYÜZ (UI) ARAÇLARI ---

    // 3.Tam Ekran Butonu
    const fullscreen = new Fullscreen({ view: view });
    view.ui.add(fullscreen, "top-left");

    // 4. Altlık Harita
    const ozelAltliklar = [
        Basemap.fromId("satellite"),
        Basemap.fromId("hybrid"),
        Basemap.fromId("streets-vector"),
        Basemap.fromId("topo-vector")
    ];
    const basemapGallery = new BasemapGallery({ view: view, source: ozelAltliklar });
    const basemapExpand = new Expand({
        view: view,
        content: basemapGallery,
        expandIconClass: "esri-icon-basemap",
        expandTooltip: "Harita Altlığını Değiştir"
    });
    view.ui.add(basemapExpand, "top-left");

    // 5. Arama Butonu
    const searchWidget = new Search({ view: view });
    const searchExpand = new Expand({
        view: view,
        content: searchWidget,
        expandIconClass: "esri-icon-search",
        expandTooltip: "Adres veya Yer Ara"
    });
    view.ui.add(searchExpand, "top-left");

    // 6. YENİ: Mesafe Ölçüm Butonu (API Anahtarı İstemez!)
    const measurementWidget = new DistanceMeasurement2D({
        view: view
    });
    const measureExpand = new Expand({
        view: view,
        content: measurementWidget,
        expandIconClass: "esri-icon-measure-line", // Cetvel/Çizgi ikonu çıkar
        expandTooltip: "Mesafe Ölç"
    });
    view.ui.add(measureExpand, "top-left");


    // --- GRAFİKLER VE KOORDİNAT SİSTEMİ ---

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

    view.on("pointer-move", function (event) {
        const point = view.toMap({ x: event.x, y: event.y });
        if (point) {
            const coordDiv = document.getElementById("coordDiv");
            if (coordDiv) {
                coordDiv.innerText = "Lon: " + point.longitude.toFixed(4) + " | Lat: " + point.latitude.toFixed(4);
            }
        }
    });
});