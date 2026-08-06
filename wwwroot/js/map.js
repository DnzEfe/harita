require([
    "esri/Map",
    "esri/views/MapView",
    "esri/Graphic",
    "esri/layers/GraphicsLayer",
    "esri/layers/GeoJSONLayer",
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
    // İL SINIRLARI KATMANI
    // =========================================================
    const ilSinirlariLayer = new GeoJSONLayer({
        url: "https://raw.githubusercontent.com/uyasarkocal/borders-of-turkey/master/lvl1-TR.geojson",
        title: "İl Sınırları",
        outFields: ["*"],
        renderer: {
            type: "simple",
            symbol: {
                type: "simple-fill",
                color: [255, 255, 255, 0],
                outline: { color: [255, 221, 0, 0.95], width: 1.6 }
            }
        },
        labelsVisible: true,
        labelingInfo: [{
            labelPlacement: "always-horizontal",
            labelExpressionInfo: { expression: "$feature.name" },
            symbol: {
                type: "text",
                color: "white",
                haloColor: [0, 0, 0, 0.85],
                haloSize: 1.5,
                font: { size: 9, family: "sans-serif", weight: "bold" }
            }
        }],
        popupTemplate: { title: "{name}" }
    });
    map.add(ilSinirlariLayer);

    // =========================================================
    // İLÇE SINIRLARI KATMANI
    // =========================================================
    const ilceSinirlariLayer = new GeoJSONLayer({
        url: "https://raw.githubusercontent.com/uyasarkocal/borders-of-turkey/master/lvl2-TR.geojson",
        title: "İlçe Sınırları",
        minScale: 1500000,
        maxScale: 0,
        renderer: {
            type: "simple",
            symbol: {
                type: "simple-fill",
                color: [255, 255, 255, 0],
                outline: { color: [140, 190, 255, 0.55], width: 0.5 }
            }
        },
        labelsVisible: true,
        labelingInfo: [{
            labelPlacement: "always-horizontal",
            labelExpressionInfo: { expression: "$feature.name" },
            symbol: {
                type: "text",
                color: [255, 255, 255, 0.95],
                haloColor: [0, 0, 0, 0.85],
                haloSize: 1.3,
                font: { size: 7.5, family: "sans-serif" }
            },
            minScale: 1500000,
            maxScale: 0
        }],
        popupTemplate: { title: "{name}" }
    });
    map.add(ilceSinirlariLayer);

    // =========================================================
    // NİŞAN / MARKER KATMANI (ANKARA)
    // =========================================================
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
    // SOL ÜST KÖŞE ARAÇLARI (TAM EKRAN VE ALTLIK GALERİSİ)
    // =========================================================
    const fullscreen = new Fullscreen({ view: view });
    view.ui.add(fullscreen, "top-left");

    const basemapGallery = new BasemapGallery({ view: view });
    const bgExpand = new Expand({
        view: view,
        content: basemapGallery,
        expandIconClass: "esri-icon-basemap",
        expandTooltip: "Harita Türünü Değiştir"
    });
    view.ui.add(bgExpand, "top-left");

    // =========================================================
    // YENİ BUTON: İL LİSTESİ (SOL ÜST)
    // Bu sürümde GeoJSON dosyasının alan adlarına (name, il_adi vs.)
    // hiç bağımlı değil — 81 ilin merkez koordinatları sabit olarak
    // koda gömülü, dolayısıyla dosya kaynaklı sorunlardan etkilenmez.
    // =========================================================
    const illerListesi = [
        { ad: "Adana", lat: 37.000000, lon: 35.321333 },
        { ad: "Adıyaman", lat: 37.764167, lon: 38.276167 },
        { ad: "Afyonkarahisar", lat: 38.763760, lon: 30.540340 },
        { ad: "Ağrı", lat: 39.721667, lon: 43.056667 },
        { ad: "Amasya", lat: 40.650000, lon: 35.833333 },
        { ad: "Ankara", lat: 39.920770, lon: 32.854110 },
        { ad: "Antalya", lat: 36.884140, lon: 30.705630 },
        { ad: "Artvin", lat: 41.183333, lon: 41.816667 },
        { ad: "Aydın", lat: 37.844400, lon: 27.845800 },
        { ad: "Balıkesir", lat: 39.648369, lon: 27.882610 },
        { ad: "Bilecik", lat: 40.150131, lon: 29.983061 },
        { ad: "Bingöl", lat: 38.885349, lon: 40.498291 },
        { ad: "Bitlis", lat: 38.400000, lon: 42.116667 },
        { ad: "Bolu", lat: 40.739479, lon: 31.611561 },
        { ad: "Burdur", lat: 37.726909, lon: 30.288876 },
        { ad: "Bursa", lat: 40.182570, lon: 29.066870 },
        { ad: "Çanakkale", lat: 40.155312, lon: 26.414160 },
        { ad: "Çankırı", lat: 40.600000, lon: 33.616667 },
        { ad: "Çorum", lat: 40.550556, lon: 34.955556 },
        { ad: "Denizli", lat: 37.776520, lon: 29.086390 },
        { ad: "Diyarbakır", lat: 37.914410, lon: 40.230629 },
        { ad: "Edirne", lat: 41.666667, lon: 26.566667 },
        { ad: "Elazığ", lat: 38.680969, lon: 39.226398 },
        { ad: "Erzincan", lat: 39.750000, lon: 39.500000 },
        { ad: "Erzurum", lat: 39.904319, lon: 41.267885 },
        { ad: "Eskişehir", lat: 39.784302, lon: 30.519220 },
        { ad: "Gaziantep", lat: 37.066220, lon: 37.383320 },
        { ad: "Giresun", lat: 40.912811, lon: 38.389530 },
        { ad: "Gümüşhane", lat: 40.460278, lon: 39.481389 },
        { ad: "Hakkari", lat: 37.583333, lon: 43.733333 },
        { ad: "Hatay", lat: 36.401849, lon: 36.349810 },
        { ad: "Isparta", lat: 37.766667, lon: 30.550000 },
        { ad: "Mersin", lat: 36.800000, lon: 34.633333 },
        { ad: "İstanbul", lat: 41.005270, lon: 28.976960 },
        { ad: "İzmir", lat: 38.418850, lon: 27.128720 },
        { ad: "Kars", lat: 40.592670, lon: 43.077831 },
        { ad: "Kastamonu", lat: 41.388710, lon: 33.782730 },
        { ad: "Kayseri", lat: 38.733333, lon: 35.483333 },
        { ad: "Kırklareli", lat: 41.733333, lon: 27.216667 },
        { ad: "Kırşehir", lat: 39.150000, lon: 34.166667 },
        { ad: "Kocaeli", lat: 40.853270, lon: 29.881520 },
        { ad: "Konya", lat: 37.866667, lon: 32.483333 },
        { ad: "Kütahya", lat: 39.416667, lon: 29.983333 },
        { ad: "Malatya", lat: 38.355190, lon: 38.309460 },
        { ad: "Manisa", lat: 38.619099, lon: 27.428921 },
        { ad: "Kahramanmaraş", lat: 37.583333, lon: 36.933333 },
        { ad: "Mardin", lat: 37.312236, lon: 40.735112 },
        { ad: "Muğla", lat: 37.215278, lon: 28.363611 },
        { ad: "Muş", lat: 38.743293, lon: 41.506482 },
        { ad: "Nevşehir", lat: 38.624420, lon: 34.723969 },
        { ad: "Niğde", lat: 37.966667, lon: 34.683333 },
        { ad: "Ordu", lat: 40.983333, lon: 37.883333 },
        { ad: "Rize", lat: 41.020050, lon: 40.523449 },
        { ad: "Sakarya", lat: 40.756879, lon: 30.378138 },
        { ad: "Samsun", lat: 41.292782, lon: 36.331280 },
        { ad: "Siirt", lat: 37.944290, lon: 41.932880 },
        { ad: "Sinop", lat: 42.026422, lon: 35.155075 },
        { ad: "Sivas", lat: 39.747662, lon: 37.017879 },
        { ad: "Tekirdağ", lat: 40.983333, lon: 27.516667 },
        { ad: "Tokat", lat: 40.316667, lon: 36.550000 },
        { ad: "Trabzon", lat: 41.000000, lon: 39.733333 },
        { ad: "Tunceli", lat: 39.107987, lon: 39.540167 },
        { ad: "Şanlıurfa", lat: 37.150000, lon: 38.800000 },
        { ad: "Uşak", lat: 38.682301, lon: 29.408190 },
        { ad: "Van", lat: 38.494167, lon: 43.380000 },
        { ad: "Yozgat", lat: 39.820000, lon: 34.804444 },
        { ad: "Zonguldak", lat: 41.456409, lon: 31.798731 },
        { ad: "Aksaray", lat: 38.368690, lon: 34.036980 },
        { ad: "Bayburt", lat: 40.255169, lon: 40.224880 },
        { ad: "Karaman", lat: 37.175930, lon: 33.228748 },
        { ad: "Kırıkkale", lat: 39.846821, lon: 33.515251 },
        { ad: "Batman", lat: 37.881168, lon: 41.135090 },
        { ad: "Şırnak", lat: 37.516389, lon: 42.461111 },
        { ad: "Bartın", lat: 41.634444, lon: 32.337500 },
        { ad: "Ardahan", lat: 41.110481, lon: 42.702171 },
        { ad: "Iğdır", lat: 39.916667, lon: 44.033333 },
        { ad: "Yalova", lat: 40.650000, lon: 29.266667 },
        { ad: "Karabük", lat: 41.200000, lon: 32.633333 },
        { ad: "Kilis", lat: 36.718399, lon: 37.121220 },
        { ad: "Osmaniye", lat: 37.068050, lon: 36.261589 },
        { ad: "Düzce", lat: 40.843849, lon: 31.156540 }
    ];

    // Alfabetik sıraya diz (Türkçe karakter duyarlı)
    illerListesi.sort(function (a, b) { return a.ad.localeCompare(b.ad, "tr"); });

    const ilListePanel = document.createElement("div");
    ilListePanel.style.cssText = "background:white;padding:10px;width:230px;max-height:420px;overflow-y:auto;font-family:sans-serif;";

    const baslik = document.createElement("b");
    baslik.textContent = "İller";
    baslik.style.fontSize = "13px";
    ilListePanel.appendChild(baslik);

    const ul = document.createElement("ul");
    ul.style.cssText = "list-style:none;padding:0;margin:8px 0 0 0;";

    illerListesi.forEach(function (il) {
        const li = document.createElement("li");
        li.textContent = il.ad;
        li.style.cssText = "padding:6px 4px;cursor:pointer;border-bottom:1px solid #eee;color:#222;font-size:12.5px;";

        li.addEventListener("mouseover", function () { li.style.background = "#f2f2f2"; });
        li.addEventListener("mouseout", function () { li.style.background = "white"; });

        li.addEventListener("click", function () {
            view.goTo({ center: [il.lon, il.lat], zoom: 9 });
            ilListeExpand.collapse();
        });

        ul.appendChild(li);
    });

    ilListePanel.appendChild(ul);

    const ilListeExpand = new Expand({
        view: view,
        content: ilListePanel,
        expandIconClass: "esri-icon-menu",
        expandTooltip: "İl Listesi",
        group: "top-left"
    });
    view.ui.add(ilListeExpand, "top-left");

    // =========================================================
    // SAĞ ÜST KÖŞE: ARAMA ÇUBUĞU (SEARCH)
    // =========================================================
    const searchWidget = new Search({ view: view });
    view.ui.add(searchWidget, "top-right");

});