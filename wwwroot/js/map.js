require([
    "esri/Map",
    "esri/views/MapView",
    "esri/Graphic",
    "esri/layers/GraphicsLayer",
    "esri/widgets/Fullscreen",
    "esri/widgets/BasemapGallery",
    "esri/widgets/Expand",
    "esri/widgets/Search" // 1. Arama modülü eklendi
], function (Map, MapView, Graphic, GraphicsLayer, Fullscreen, BasemapGallery, Expand, Search) {

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
    // SOL ÜST KÖŞE: TAM EKRAN VE ALTLIK GALERİSİ
    // =========================================================

    // Tam Ekran Butonu
    const fullscreen = new Fullscreen({
        view: view
    });
    view.ui.add(fullscreen, "top-left");

    // Altlık Harita Galerisi
    const basemapGallery = new BasemapGallery({
        view: view
    });

    const bgExpand = new Expand({
        view: view,
        content: basemapGallery,
        expandIconClass: "esri-icon-basemap",
        expandTooltip: "Harita Türünü Değiştir"
    });
    view.ui.add(bgExpand, "top-left");

    // =========================================================
    // SAĞ ÜST KÖŞE: ARAMA ÇUBUĞU (SEARCH)
    // =========================================================

    // 2. Arama bileşeni oluşturuldu
    const searchWidget = new Search({
        view: view
    });

    // Arama kutusu haritanın sağ üst alanına yerleştirildi
    view.ui.add(searchWidget, "top-right");

});