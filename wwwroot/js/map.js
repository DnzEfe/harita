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
    "esri/widgets/Home",
    "esri/layers/GeoJSONLayer",
    "esri/widgets/LayerList", // YENİ: Katman Listesi Aracı
    "esri/layers/TileLayer"   // YENİ: Yollar ve Şehirler gibi hazır harita katmanları için
], function (Map, MapView, SceneView, Graphic, GraphicsLayer, Fullscreen, BasemapGallery, Expand, Basemap, Search, DistanceMeasurement2D, DirectLineMeasurement3D, Daylight, Home, GeoJSONLayer, LayerList, TileLayer) {

    // --- 1. HARİTA VE GÖRÜNÜM AYARLARI ---
    const map = new Map({
        basemap: "satellite",
        ground: "world-elevation"
    });

    // --- 2. KATMANLARI OLUŞTURMA (LayerList bunları otomatik algılar) ---

    // A. Kendi GeoJSON İl Sınırları Katmanımız
    const geojsonUrl = "/js/iller.json";
    const sinirTasarimi = {
        type: "simple",
        symbol: {
            type: "simple-fill",
            color: [0, 0, 0, 0],
            outline: { color: [255, 204, 0, 1], width: 1.5 }
        }
    };
    const ilSinirlariLayer = new GeoJSONLayer({
        url: geojsonUrl,
        renderer: sinirTasarimi,
        title: "Türkiye İl Sınırları",
        popupTemplate: { title: "İl Sınırı", content: "Seçilen bölge: <b>{name}</b>" },
        labelingInfo: [{
            symbol: {
                type: "text", color: [255, 255, 255, 0.9],
                haloColor: [0, 0, 0, 0.8], haloSize: 1,
                font: { size: 10, family: "sans-serif", weight: "bold" }
            },
            labelPlacement: "always-horizontal",
            labelExpressionInfo: { expression: "$feature.name" }
        }]
    });

    // B. Yollar, Otobanlar ve Demir Yolları Katmanı (Esri Sunucusundan)
    const ulasimLayer = new TileLayer({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer",
        title: "Otobanlar, Sokaklar ve Demir Yolları",
        visible: false // Başlangıçta gözü kapalı gelsin (tıklayarak açılabilir)
    });

    // C. Şehirler, İlçeler ve Önemli Yerler Katmanı (Esri Sunucusundan)
    const sehirlerLayer = new TileLayer({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer",
        title: "Şehirler ve Yerleşim Yerleri",
        visible: false
    });

    // Katmanları haritaya ekle (Katman listesi aracı bu sıraya göre gösterecek)
    map.addMany([sehirlerLayer, ulasimLayer, ilSinirlariLayer]);
    // ---------------------------------------------

    const baslangicAyarlari = {
        map: map,
        center: [35.2433, 38.9637],
        zoom: 6
    };

    const view2D = new MapView(baslangicAyarlari);

    const view3D = new SceneView({
        ...baslangicAyarlari,
        qualityProfile: "high",
        environment: { lighting: { type: "sun", date: new Date(), directShadowsEnabled: true } }
    });

    let activeView = view3D;
    activeView.container = "viewDiv";


    // --- 3. 2D / 3D GEÇİŞ BUTONU ---
    const toggleButton = document.createElement("div");
    toggleButton.className = "esri-widget esri-widget--button esri-interactive";
    toggleButton.title = "2D / 3D Geçiş Yap";
    toggleButton.innerHTML = "3D";
    toggleButton.style.fontWeight = "bold";
    toggleButton.style.fontFamily = "sans-serif";
    toggleButton.style.fontSize = "14px";


    // --- 4. STANDART ARAYÜZ (UI) ARAÇLARI ---
    const fullscreen = new Fullscreen({ view: activeView });
    const homeWidget = new Home({ view: activeView });

    const ozelAltliklar = [
        Basemap.fromId("satellite"), Basemap.fromId("hybrid"),
        Basemap.fromId("streets-vector"), Basemap.fromId("topo-vector")
    ];
    const basemapGallery = new BasemapGallery({ view: activeView, source: ozelAltliklar });
    const basemapExpand = new Expand({ view: activeView, content: basemapGallery, expandIconClass: "esri-icon-basemap" });

    const searchWidget = new Search({ view: activeView });
    const searchExpand = new Expand({ view: activeView, content: searchWidget, expandIconClass: "esri-icon-search" });

    // YENİ: Katman Listesi (LayerList) Aracı ve Butonu
    const layerList = new LayerList({ view: activeView });
    const layerListExpand = new Expand({
        view: activeView,
        content: layerList,
        expandIconClass: "esri-icon-layers", // Katmanlar İkonu
        expandTooltip: "Katmanları Aç / Kapat"
    });


    // --- 5. İL SEÇİCİ PANEL (SAĞ ÜST KÖŞE) ---
    const sehirler = [
        "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın", "Balıkesir",
        "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli",
        "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari",
        "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir", "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir",
        "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir",
        "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat",
        "Trabzon", "Tunceli", "Şanlıurfa", "Uşak", "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman",
        "Kırıkkale", "Batman", "Şırnak", "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce"
    ];

    const bolgePaneli = document.createElement("div");
    bolgePaneli.className = "esri-widget";
    bolgePaneli.style.padding = "15px";
    bolgePaneli.style.width = "220px";
    bolgePaneli.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.3)";

    bolgePaneli.innerHTML = `
        <h4 style="margin-top: 0; margin-bottom: 10px; font-size: 14px;">Şehre Git</h4>
        <select id="ilSelect" class="esri-select" style="width: 100%;">
            <option value="">-- İl Seçin --</option>
            ${sehirler.map(il => `<option value="${il}">${il}</option>`).join("")}
        </select>
    `;

    activeView.ui.add(bolgePaneli, "top-right");

    const ilSelect = bolgePaneli.querySelector("#ilSelect");
    ilSelect.addEventListener("change", (e) => {
        const secilenIl = e.target.value;
        if (secilenIl) searchWidget.search(secilenIl + ", Türkiye");
    });


    // --- 6. 2D ve 3D'ye ÖZEL ARAÇLAR ---
    const measure2D = new DistanceMeasurement2D({ view: view2D });
    const measureExpand2D = new Expand({ view: view2D, content: measure2D, expandIconClass: "esri-icon-measure-line" });

    const measure3D = new DirectLineMeasurement3D({ view: view3D });
    const measureExpand3D = new Expand({ view: view3D, content: measure3D, expandIconClass: "esri-icon-measure-line" });

    const daylightWidget = new Daylight({ view: view3D, dateOrSeason: "season" });
    const daylightExpand = new Expand({ view: view3D, content: daylightWidget, expandIconClass: "esri-icon-lightbulb" });

    // Başlangıçta sol menüyü diz (layerListExpand eklendi)
    activeView.ui.add([fullscreen, homeWidget, basemapExpand, layerListExpand, searchExpand, measureExpand3D, daylightExpand, toggleButton], "top-left");


    // --- 7. 2D / 3D BUTONUNA TIKLANDIĞINDA ÇALIŞACAK MANTIK ---
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

        // Ortak araçlara yeni haritada olduklarını bildir
        fullscreen.view = activeView;
        homeWidget.view = activeView;
        basemapExpand.view = activeView;
        basemapGallery.view = activeView;
        searchExpand.view = activeView;
        searchWidget.view = activeView;
        layerList.view = activeView; // YENİ: Katman listesi de yeni haritayı bilsin
        layerListExpand.view = activeView;

        if (activeView.type === "3d") {
            activeView.ui.add([fullscreen, homeWidget, basemapExpand, layerListExpand, searchExpand, measureExpand3D, daylightExpand, toggleButton], "top-left");
        } else {
            activeView.ui.add([fullscreen, homeWidget, basemapExpand, layerListExpand, searchExpand, measureExpand2D, toggleButton], "top-left");
        }

        activeView.ui.add(bolgePaneli, "top-right");
    });


    // --- 8. SAĞ TIK KONTROLÜ VE ANKARA NOKTASI ---
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