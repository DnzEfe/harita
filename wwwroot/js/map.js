require([
    "esri/Map",
    "esri/views/MapView",
    "esri/Graphic",
    "esri/layers/GraphicsLayer",
    "esri/layers/GeoJSONLayer", // 1. İl sınırları için eklendi
    "esri/widgets/Fullscreen",
    "esri/widgets/BasemapGallery",
    "esri/widgets/Expand",
    "esri/widgets/Search"
], function (Map, MapView, Graphic, GraphicsLayer, GeoJSONLayer, Fullscreen, BasemapGallery, Expand, Search) {

    const map = new Map({
        basemap: "satellite"
    });

    const view = new MapView({
        container: "viewDiv",
        map: map,
        center: [35.2433, 38.9637],
        zoom: 6
    });

    // =========================================================
    // İL SINIRLARI + İSİMLERİ KATMANI
    // =========================================================
    const ilSinirlariLayer = new GeoJSONLayer({
        url: "https://raw.githubusercontent.com/uyasarkocal/borders-of-turkey/master/lvl1-TR.geojson",
        title: "İl Sınırları",
        renderer: {
            type: "simple",
            symbol: {
                type: "simple-fill",
                color: [255, 255, 255, 0],   // iç dolgu şeffaf
                outline: { color: [255, 165, 0, 0.9], width: 1.2 }
            }
        },
        // 2. İl isimlerini haritada etiket olarak göster
        labelsVisible: true,
        labelingInfo: [{
            labelPlacement: "always-horizontal",
            labelExpressionInfo: {
                expression: "$feature.name" // gerçek alan adını doğrulamak için aşağıdaki notu oku
            },
            symbol: {
                type: "text",
                color: "white",
                haloColor: [0, 0, 0, 0.8],
                haloSize: 1.5,
                font: { size: 9, family: "sans-serif", weight: "bold" }
            }
        }],
        popupTemplate: {
            title: "{name}"
        }
    });

    map.add(ilSinirlariLayer);

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

    const fullscreen = new Fullscreen({
        view: view
    });
    view.ui.add(fullscreen, "top-left");

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

    const searchWidget = new Search({
        view: view
    });
    view.ui.add(searchWidget, "top-right");

});