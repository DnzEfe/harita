require([
    "esri/Map",
    "esri/views/MapView",
    "esri/views/SceneView",
    "esri/Graphic",
    "esri/layers/GraphicsLayer",
    "esri/widgets/Fullscreen",
    "esri/widgets/BasemapGallery",
    "esri/widgets/Expand",
    "esri/Basemap",
    "esri/widgets/Search",
    "esri/widgets/DistanceMeasurement2D",
    "esri/widgets/DirectLineMeasurement3D",
    "esri/widgets/Daylight",
    "esri/widgets/Home" // YENİ: Ana Görünüm (Başa Dön) Modülü
], function (Map, MapView, SceneView, Graphic, GraphicsLayer, Fullscreen, BasemapGallery, Expand, Basemap, Search, DistanceMeasurement2D, DirectLineMeasurement3D, Daylight, Home) {

    // 1. Ortak Harita Alt Yapısını Oluştur
    const map = new Map({
        basemap: "satellite",
        ground: "world-elevation"
    });

    // İki haritanın da başlayacağı ortak konum (Home butonu burayı hafızasına alır)
    const baslangicAyarlari = {
        map: map,
        center: [35.2433, 38.9637], // Türkiye'nin merkezi
        zoom: 6                     // Başlangıç yakınlaşma seviyesi
    };

    // 2. Hem 2D Hem 3D Görünümleri Arka Planda Hazırla
    const view2D = new MapView(baslangicAyarlari);

    const view3D = new SceneView({
        ...baslangicAyarlari,
        qualityProfile: "high",
        environment: { lighting: { type: "sun", date: new Date(), directShadowsEnabled: true } }
    });

    // Başlangıçta 3D haritayı aktif et
    let activeView = view3D;
    activeView.container = "viewDiv";


    // --- 2D / 3D GEÇİŞ BUTONUNU OLUŞTURMA ---
    const toggleButton = document.createElement("div");
    toggleButton.className = "esri-widget esri-widget--button esri-interactive";
    toggleButton.title = "2D / 3D Geçiş Yap";
    toggleButton.innerHTML = "3D";
    toggleButton.style.fontWeight = "bold";
    toggleButton.style.fontFamily = "sans-serif";
    toggleButton.style.fontSize = "14px";


    // --- ARAYÜZ (UI) ARAÇLARI (Ortak Olanlar) ---

    // Tam Ekran Butonu
    const fullscreen = new Fullscreen({ view: activeView });

    // YENİ: Ana Görünüm (Home) Butonu
    const homeWidget = new Home({ view: activeView });

    // Altlık Harita
    const ozelAltliklar = [
        Basemap.fromId("satellite"), Basemap.fromId("hybrid"),
        Basemap.fromId("streets-vector"), Basemap.fromId("topo-vector")
    ];
    const basemapGallery = new BasemapGallery({ view: activeView, source: ozelAltliklar });
    const basemapExpand = new Expand({ view: activeView, content: basemapGallery, expandIconClass: "esri-icon-basemap" });

    // Arama Butonu
    const searchWidget = new Search({ view: activeView });
    const searchExpand = new Expand({ view: activeView, content: searchWidget, expandIconClass: "esri-icon-search" });


    // --- 2D ve 3D'ye ÖZEL ARAÇLAR ---
    const measure2D = new DistanceMeasurement2D({ view: view2D });
    const measureExpand2D = new Expand({ view: view2D, content: measure2D, expandIconClass: "esri-icon-measure-line" });

    const measure3D = new DirectLineMeasurement3D({ view: view3D });
    const measureExpand3D = new Expand({ view: view3D, content: measure3D, expandIconClass: "esri-icon-measure-line" });

    const daylightWidget = new Daylight({ view: view3D, dateOrSeason: "season" });
    const daylightExpand = new Expand({ view: view3D, content: daylightWidget, expandIconClass: "esri-icon-lightbulb" });

    // Başlangıçta menüyü 3D haritaya ekle (homeWidget'ı da listeye ekledik)
    activeView.ui.add([fullscreen, homeWidget, basemapExpand, searchExpand, measureExpand3D, daylightExpand, toggleButton], "top-left");


    // --- 2D / 3D BUTONUNA TIKLANDIĞINDA ÇALIŞACAK MANTIK ---
    toggleButton.addEventListener("click", function () {
        const isCurrently3D = activeView.type === "3d";
        const currentViewpoint = activeView.viewpoint.clone();

        activeView.container = null;

        if (isCurrently3D) {
            activeView = view2D;
            toggleButton.innerHTML = "2D";
        } else {
            activeView = view3D;
            toggleButton.innerHTML = "3D";
        }

        activeView.viewpoint = currentViewpoint;
        activeView.container = "viewDiv";

        // Ortak araçlara yeni haritada olduklarını bildir (homeWidget'ı da ekledik)
        fullscreen.view = activeView;
        homeWidget.view = activeView;
        basemapExpand.view = activeView;
        basemapGallery.view = activeView;
        searchExpand.view = activeView;
        searchWidget.view = activeView;

        // Menüyü yeni haritaya göre tekrar diz
        if (activeView.type === "3d") {
            activeView.ui.add([fullscreen, homeWidget, basemapExpand, searchExpand, measureExpand3D, daylightExpand, toggleButton], "top-left");
        } else {
            activeView.ui.add([fullscreen, homeWidget, basemapExpand, searchExpand, measureExpand2D, toggleButton], "top-left");
        }
    });


    // --- SAĞ TIK KONTROLÜ VE ANKARA NOKTASI --
    view2D.on("pointer-down", function (event) { if (event.button === 2) measure2D.viewModel.clear(); });
    view3D.on("pointer-down", function (event) { if (event.button === 2) measure3D.viewModel.clear(); });

    const graphicsLayer = new GraphicsLayer();
    map.add(graphicsLayer);

    const pointGraphic = new Graphic({
        geometry: { type: "point", longitude: 32.8597, latitude: 39.9334 },
        symbol: { type: "simple-marker", color: [226, 119, 40], outline: { color: [255, 255, 255], width: 1 } },
        attributes: { Name: "Ankara" },
        popupTemplate: { title: "{Name}", content: "Türkiye'nin başkenti" }
    });
    graphicsLayer.add(pointGraphic);

    // Koordinat Gösterici
    function showCoords(event, view) {
        const point = view.toMap({ x: event.x, y: event.y });
        if (point) {
            const coordDiv = document.getElementById("coordDiv");
            if (coordDiv) {
                coordDiv.innerText = "Lon: " + point.longitude.toFixed(4) + " | Lat: " + point.latitude.toFixed(4);
            }
        }
    }
    view2D.on("pointer-move", (e) => showCoords(e, view2D));
    view3D.on("pointer-move", (e) => showCoords(e, view3D));

});