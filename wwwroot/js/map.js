require([
    "esri/Map",
    "esri/views/MapView",
    "esri/Graphic",
    "esri/geometry/Point",
    "esri/layers/GraphicsLayer",
    "esri/layers/GeoJSONLayer",
    "esri/layers/FeatureLayer",
    "esri/layers/TileLayer",
    "esri/widgets/Fullscreen",
    "esri/widgets/BasemapGallery",
    "esri/widgets/LayerList",
    "esri/widgets/Expand",
    "esri/widgets/Search"
], function (Map, MapView, Graphic, Point, GraphicsLayer, GeoJSONLayer, FeatureLayer, TileLayer, Fullscreen, BasemapGallery, LayerList, Expand, Search) {

    // JS Tarafı İçin Gelişmiş Metin Normalizasyonu
    function trNormalize(str) {
        if (!str) return "";
        return str.toString()
            .toLowerCase()
            .replace(/i̇/g, "i")
            .replace(/ı/g, "i")
            .replace(/ç/g, "c")
            .replace(/ğ/g, "g")
            .replace(/ö/g, "o")
            .replace(/ş/g, "s")
            .replace(/ü/g, "u")
            .replace(/[^a-z0-9]/g, "");
    }

    const map = new Map({
        basemap: "satellite"
    });

    const view = new MapView({
        container: "viewDiv",
        map: map,
        center: [35.2433, 38.9637],
        zoom: 6,
        highlightOptions: {
            color: [0, 255, 255, 1],
            fillOpacity: 0.4,
            haloOpacity: 0.95
        }
    });

    // =========================================================
    // 1. İL VE İLÇE SINIRLARI KATMANLARI
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
                outline: {
                    color: [255, 170, 0, 1],
                    width: 3.0
                }
            }
        },
        labelsVisible: true,
        labelingInfo: [{
            labelPlacement: "always-horizontal",
            labelExpressionInfo: { expression: "$feature.name" },
            symbol: {
                type: "text",
                color: "#FFFFFF",
                haloColor: [0, 0, 0, 0.9],
                haloSize: 2.0,
                font: { size: 10, family: "sans-serif", weight: "bold" }
            }
        }],
        popupTemplate: {
            title: "İl: {name}",
            expressionInfos: [
                {
                    name: "plaka-no",
                    title: "Plaka Kodu",
                    expression: `
                        var rawName = DefaultValue($feature.name, DefaultValue($feature.NAME, ''));
                        if (IsEmpty(rawName)) { return '-'; }

                        var n = Lower(rawName);
                        n = Replace(n, "i̇", "i");
                        n = Replace(n, "ı", "i");
                        n = Replace(n, "ç", "c");
                        n = Replace(n, "ğ", "g");
                        n = Replace(n, "ö", "o");
                        n = Replace(n, "ş", "s");
                        n = Replace(n, "ü", "u");
                        n = Replace(n, " ", "");
                        n = Replace(n, "-", "");
                        n = Replace(n, ".", "");

                        var dict = {
                            "adana": 1, "adiyaman": 2, "afyonkarahisar": 3, "afyon": 3, "agri": 4, "amasya": 5, "ankara": 6, "antalya": 7, "artvin": 8, "aydin": 9, "balikesir": 10,
                            "bilecik": 11, "bingol": 12, "bitlis": 13, "bolu": 14, "burdur": 15, "bursa": 16, "canakkale": 17, "cankiri": 18, "corum": 19, "denizli": 20,
                            "diyarbakir": 21, "edirne": 22, "elazig": 23, "erzincan": 24, "erzurum": 25, "eskisehir": 26, "gaziantep": 27, "antep": 27, "giresun": 28, "gumushane": 29, "hakkari": 30,
                            "hatay": 31, "isparta": 32, "mersin": 33, "icel": 33, "istanbul": 34, "izmir": 35, "kars": 36, "kastamonu": 37, "kayseri": 38, "kirklareli": 39, "kirsehir": 40,
                            "kocaeli": 41, "konya": 42, "kutahya": 43, "malatya": 44, "manisa": 45, "kahramanmaras": 46, "kmaras": 46, "maras": 46, "mardin": 47, "mugla": 48, "mus": 49, "nevsehir": 50,
                            "nigde": 51, "ordu": 52, "rize": 53, "sakarya": 54, "samsun": 55, "siirt": 56, "sinop": 57, "sivas": 58, "tekirdag": 59, "tokat": 60,
                            "trabzon": 61, "tunceli": 62, "sanliurfa": 63, "surfa": 63, "urfa": 63, "usak": 64, "van": 65, "yozgat": 66, "zonguldak": 67, "aksaray": 68, "bayburt": 69,
                            "karaman": 70, "kirikkale": 71, "batman": 72, "sirnak": 73, "bartin": 74, "ardahan": 75, "igdir": 76, "yalova": 77, "karabuk": 78,
                            "kilis": 79, "osmaniye": 80, "duzce": 81
                        };

                        return IIF(HasKey(dict, n), Text(dict[n], '00'), '-');
                    `
                },
                {
                    name: "koordinat-bilgisi",
                    title: "Koordinatlar (Enlem, Boylam)",
                    expression: `
                        var c = Centroid($feature);
                        return Text(Round(c.y, 4)) + '° N, ' + Text(Round(c.x, 4)) + '° E';
                    `
                },
                {
                    name: "yuzolcumu-km2",
                    title: "Yüzölçümü",
                    expression: "Text(Round(AreaGeodetic($feature, 'square-kilometers'), 0), '#,###') + ' km²'"
                },
                {
                    name: "cevre-km",
                    title: "Sınır Çevre Uzunluğu",
                    expression: "Text(Round(LengthGeodetic($feature, 'kilometers'), 1), '#,###.#') + ' km'"
                }
            ],
            content: [
                {
                    type: "fields",
                    fieldInfos: [
                        { fieldName: "expression/plaka-no", label: "Plaka Kodu" },
                        { fieldName: "name", label: "İl Adı" },
                        { fieldName: "expression/koordinat-bilgisi", label: "Merkez Koordinatı" },
                        { fieldName: "expression/yuzolcumu-km2", label: "Yüzölçümü" },
                        { fieldName: "expression/cevre-km", label: "Sınır Uzunluğu" }
                    ]
                }
            ]
        }
    });
    map.add(ilSinirlariLayer);

    let ilSinirlariLayerView = null;
    let aktifHighlight = null;

    view.whenLayerView(ilSinirlariLayer).then(function (layerView) {
        ilSinirlariLayerView = layerView;
    });

    const ilceSinirlariLayer = new GeoJSONLayer({
        url: "https://raw.githubusercontent.com/uyasarkocal/borders-of-turkey/master/lvl2-TR.geojson",
        title: "İlçe Sınırları",
        minScale: 2000000,
        renderer: {
            type: "simple",
            symbol: {
                type: "simple-fill",
                color: [255, 255, 255, 0],
                outline: {
                    color: [0, 220, 255, 0.85],
                    width: 1.2,
                    style: "dash"
                }
            }
        },
        labelsVisible: true,
        labelingInfo: [{
            labelPlacement: "always-horizontal",
            labelExpressionInfo: { expression: "$feature.name" },
            symbol: {
                type: "text",
                color: "#E0F7FA",
                haloColor: [0, 0, 0, 0.95],
                haloSize: 2.0,
                font: { size: 9, family: "sans-serif", weight: "normal" }
            },
            minScale: 2000000
        }],
        popupTemplate: {
            title: "İlçe: {name}",
            expressionInfos: [
                {
                    name: "ilce-yuzolcumu",
                    expression: "Text(Round(AreaGeodetic($feature, 'square-kilometers'), 1), '#,###.#') + ' km²'"
                }
            ],
            content: [
                {
                    type: "fields",
                    fieldInfos: [
                        { fieldName: "name", label: "İlçe Adı" },
                        { fieldName: "expression/ilce-yuzolcumu", label: "Yüzölçümü" }
                    ]
                }
            ]
        }
    });
    map.add(ilceSinirlariLayer);

    // =========================================================
    // 2. FAY HATTLARI VE DİĞER KATMANLAR
    // =========================================================
    const trFayHatLariLayer = new FeatureLayer({
        url: "https://services1.arcgis.com/0MSEUqKaxRlEPVqi/arcgis/rest/services/Turkey_Faults/FeatureServer/0",
        title: "Türkiye Diri Fay Hatları",
        renderer: {
            type: "simple",
            symbol: {
                type: "simple-line",
                color: [255, 0, 0, 0.95],
                width: 2.2
            }
        },
        popupTemplate: {
            title: "Fay Hattı: {NAME_TR}",
            content: "Tip: {FAULT_TYPE}"
        }
    });
    map.add(trFayHatLariLayer);

    const trKorunanAlanlarLayer = new FeatureLayer({
        url: "https://services5.arcgis.com/GfwifWzHfLocal/arcgis/rest/services/WDPA_Polygons/FeatureServer/0",
        title: "Türkiye Korunan Alanlar & Milli Parklar",
        definitionExpression: "ISO3 = 'TUR' OR PARENT_ISO = 'TUR'",
        renderer: {
            type: "simple",
            symbol: {
                type: "simple-fill",
                color: [76, 175, 80, 0.35],
                outline: { color: [46, 125, 50, 0.9], width: 1.2 }
            }
        },
        popupTemplate: {
            title: "{NAME}",
            content: "Statü: {DESIG_ENG} ({ORIG_NAME})"
        }
    });
    map.add(trKorunanAlanlarLayer);

    const karayollariLayer = new TileLayer({
        url: "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer",
        title: "Ulaşım: Karayolları ve Otobanlar",
        opacity: 0.85
    });
    map.add(karayollariLayer);

    const graphicsLayer = new GraphicsLayer({ title: "İşaretler" });
    map.add(graphicsLayer);

    // SOL ÜST KÖŞE ARAÇLARI
    const fullscreen = new Fullscreen({ view: view });
    view.ui.add(fullscreen, "top-left");

    const basemapGallery = new BasemapGallery({ view: view });
    const bgExpand = new Expand({
        view: view,
        content: basemapGallery,
        expandIconClass: "esri-icon-basemap",
        expandTooltip: "Harita Türünü Değiştir",
        group: "top-left"
    });
    view.ui.add(bgExpand, "top-left");

    const layerList = new LayerList({
        view: view,
        listItemCreatedFunction: function (event) {
            const item = event.item;
            item.panel = { content: "legend", open: false };

            const aksiyonlar = [{
                title: "Katmana Yakınlaş",
                className: "esri-icon-zoom-out-fixed",
                id: "yakinlas"
            }];

            if (item.layer && item.layer.url) {
                aksiyonlar.push({
                    title: "Kaynağa Git",
                    className: "esri-icon-link-external",
                    id: "kaynak"
                });
            }
            item.actionsSections = [aksiyonlar];
        }
    });

    layerList.on("trigger-action", function (event) {
        const layer = event.item.layer;
        if (event.action.id === "yakinlas") {
            if (layer.fullExtent) {
                view.goTo(layer.fullExtent);
            } else if (layer.queryExtent) {
                layer.queryExtent().then(function (res) {
                    if (res.extent) view.goTo(res.extent);
                });
            }
        }
        if (event.action.id === "kaynak" && layer.url) {
            window.open(layer.url, "_blank");
        }
    });

    const layerListExpand = new Expand({
        view: view,
        content: layerList,
        expandIconClass: "esri-icon-layers",
        expandTooltip: "Katmanlar",
        group: "top-left"
    });
    view.ui.add(layerListExpand, "top-left");

    // =========================================================
    // İL LİSTESİ PANELİ (81 İL - TAM LİSTE)
    // =========================================================
    const illerListesi = [
        { plaka: 1, ad: "Adana", lat: 37.000000, lon: 35.321333 },
        { plaka: 2, ad: "Adıyaman", lat: 37.764167, lon: 38.276167 },
        { plaka: 3, ad: "Afyonkarahisar", lat: 38.763760, lon: 30.540340 },
        { plaka: 4, ad: "Ağrı", lat: 39.721667, lon: 43.056667 },
        { plaka: 5, ad: "Amasya", lat: 40.650000, lon: 35.833333 },
        { plaka: 6, ad: "Ankara", lat: 39.920770, lon: 32.854110 },
        { plaka: 7, ad: "Antalya", lat: 36.884140, lon: 30.705630 },
        { plaka: 8, ad: "Artvin", lat: 41.183333, lon: 41.816667 },
        { plaka: 9, ad: "Aydın", lat: 37.844400, lon: 27.845800 },
        { plaka: 10, ad: "Balıkesir", lat: 39.648369, lon: 27.882610 },
        { plaka: 11, ad: "Bilecik", lat: 40.150131, lon: 29.983061 },
        { plaka: 12, ad: "Bingöl", lat: 38.885349, lon: 40.498291 },
        { plaka: 13, ad: "Bitlis", lat: 38.400000, lon: 42.116667 },
        { plaka: 14, ad: "Bolu", lat: 40.739479, lon: 31.611561 },
        { plaka: 15, ad: "Burdur", lat: 37.726909, lon: 30.288876 },
        { plaka: 16, ad: "Bursa", lat: 40.182570, lon: 29.066870 },
        { plaka: 17, ad: "Çanakkale", lat: 40.155312, lon: 26.414160 },
        { plaka: 18, ad: "Çankırı", lat: 40.600000, lon: 33.616667 },
        { plaka: 19, ad: "Çorum", lat: 40.550556, lon: 34.955556 },
        { plaka: 20, ad: "Denizli", lat: 37.776520, lon: 29.086390 },
        { plaka: 21, ad: "Diyarbakır", lat: 37.914410, lon: 40.230629 },
        { plaka: 22, ad: "Edirne", lat: 41.666667, lon: 26.566667 },
        { plaka: 23, ad: "Elazığ", lat: 38.680969, lon: 39.226398 },
        { plaka: 24, ad: "Erzincan", lat: 39.750000, lon: 39.500000 },
        { plaka: 25, ad: "Erzurum", lat: 39.904319, lon: 41.267885 },
        { plaka: 26, ad: "Eskişehir", lat: 39.784302, lon: 30.519220 },
        { plaka: 27, ad: "Gaziantep", lat: 37.066220, lon: 37.383320 },
        { plaka: 28, ad: "Giresun", lat: 40.912811, lon: 38.389530 },
        { plaka: 29, ad: "Gümüşhane", lat: 40.460278, lon: 39.481389 },
        { plaka: 30, ad: "Hakkari", lat: 37.583333, lon: 43.733333 },
        { plaka: 31, ad: "Hatay", lat: 36.401849, lon: 36.349810 },
        { plaka: 32, ad: "Isparta", lat: 37.766667, lon: 30.550000 },
        { plaka: 33, ad: "Mersin", lat: 36.800000, lon: 34.633333 },
        { plaka: 34, ad: "İstanbul", lat: 41.005270, lon: 28.976960 },
        { plaka: 35, ad: "İzmir", lat: 38.418850, lon: 27.128720 },
        { plaka: 36, ad: "Kars", lat: 40.592670, lon: 43.077831 },
        { plaka: 37, ad: "Kastamonu", lat: 41.388710, lon: 33.782730 },
        { plaka: 38, ad: "Kayseri", lat: 38.733333, lon: 35.483333 },
        { plaka: 39, ad: "Kırklareli", lat: 41.733333, lon: 27.216667 },
        { plaka: 40, ad: "Kırşehir", lat: 39.150000, lon: 34.166667 },
        { plaka: 41, ad: "Kocaeli", lat: 40.853270, lon: 29.881520 },
        { plaka: 42, ad: "Konya", lat: 37.866667, lon: 32.483333 },
        { plaka: 43, ad: "Kütahya", lat: 39.416667, lon: 29.983333 },
        { plaka: 44, ad: "Malatya", lat: 38.355190, lon: 38.309460 },
        { plaka: 45, ad: "Manisa", lat: 38.619099, lon: 27.428921 },
        { plaka: 46, ad: "Kahramanmaraş", lat: 37.583333, lon: 36.933333 },
        { plaka: 47, ad: "Mardin", lat: 37.312236, lon: 40.735112 },
        { plaka: 48, ad: "Muğla", lat: 37.215278, lon: 28.363611 },
        { plaka: 49, ad: "Muş", lat: 38.743293, lon: 41.506482 },
        { plaka: 50, ad: "Nevşehir", lat: 38.624420, lon: 34.723969 },
        { plaka: 51, ad: "Niğde", lat: 37.966667, lon: 34.683333 },
        { plaka: 52, ad: "Ordu", lat: 40.983333, lon: 37.883333 },
        { plaka: 53, ad: "Rize", lat: 41.020050, lon: 40.523449 },
        { plaka: 54, ad: "Sakarya", lat: 40.756879, lon: 30.378138 },
        { plaka: 55, ad: "Samsun", lat: 41.292782, lon: 36.331280 },
        { plaka: 56, ad: "Siirt", lat: 37.944290, lon: 41.932880 },
        { plaka: 57, ad: "Sinop", lat: 42.026422, lon: 35.155075 },
        { plaka: 58, ad: "Sivas", lat: 39.747662, lon: 37.017879 },
        { plaka: 59, ad: "Tekirdağ", lat: 40.983333, lon: 27.516667 },
        { plaka: 60, ad: "Tokat", lat: 40.316667, lon: 36.550000 },
        { plaka: 61, ad: "Trabzon", lat: 41.000000, lon: 39.733333 },
        { plaka: 62, ad: "Tunceli", lat: 39.107987, lon: 39.540167 },
        { plaka: 63, ad: "Şanlıurfa", lat: 37.150000, lon: 38.800000 },
        { plaka: 64, ad: "Uşak", lat: 38.682301, lon: 29.408190 },
        { plaka: 65, ad: "Van", lat: 38.494167, lon: 43.380000 },
        { plaka: 66, ad: "Yozgat", lat: 39.820000, lon: 34.804444 },
        { plaka: 67, ad: "Zonguldak", lat: 41.456409, lon: 31.798731 },
        { plaka: 68, ad: "Aksaray", lat: 38.368690, lon: 34.036980 },
        { plaka: 69, ad: "Bayburt", lat: 40.255169, lon: 40.224880 },
        { plaka: 70, ad: "Karaman", lat: 37.175930, lon: 33.228748 },
        { plaka: 71, ad: "Kırıkkale", lat: 39.846821, lon: 33.515251 },
        { plaka: 72, ad: "Batman", lat: 37.881168, lon: 41.135090 },
        { plaka: 73, ad: "Şırnak", lat: 37.516389, lon: 42.461111 },
        { plaka: 74, ad: "Bartın", lat: 41.634444, lon: 32.337500 },
        { plaka: 75, ad: "Ardahan", lat: 41.110481, lon: 42.702171 },
        { plaka: 76, ad: "Iğdır", lat: 39.916667, lon: 44.033333 },
        { plaka: 77, ad: "Yalova", lat: 40.650000, lon: 29.266667 },
        { plaka: 78, ad: "Karabük", lat: 41.200000, lon: 32.633333 },
        { plaka: 79, ad: "Kilis", lat: 36.718399, lon: 37.121220 },
        { plaka: 80, ad: "Osmaniye", lat: 37.068050, lon: 36.261589 },
        { plaka: 81, ad: "Düzce", lat: 40.843849, lon: 31.156540 }
    ];

    // Plaka numarasına göre 01'den 81'e sırala
    illerListesi.sort(function (a, b) { return a.plaka - b.plaka; });

    const ilListePanel = document.createElement("div");
    ilListePanel.style.cssText = "background:white;padding:10px;width:240px;max-height:420px;overflow-y:auto;font-family:sans-serif;";

    const baslik = document.createElement("b");
    baslik.textContent = "İller (81 İl)";
    baslik.style.fontSize = "13px";
    ilListePanel.appendChild(baslik);

    const ul = document.createElement("ul");
    ul.style.cssText = "list-style:none;padding:0;margin:8px 0 0 0;";

    illerListesi.forEach(function (il) {
        const li = document.createElement("li");
        const plakaStr = il.plaka < 10 ? "0" + il.plaka : il.plaka;
        li.textContent = plakaStr + " - " + il.ad;
        li.style.cssText = "padding:6px 4px;cursor:pointer;border-bottom:1px solid #eee;color:#222;font-size:12.5px;";

        li.addEventListener("mouseover", function () { li.style.background = "#f2f2f2"; });
        li.addEventListener("mouseout", function () { li.style.background = "white"; });

        li.addEventListener("click", function () {
            ilListeExpand.collapse();

            if (aktifHighlight) {
                aktifHighlight.remove();
                aktifHighlight = null;
            }

            const query = ilSinirlariLayer.createQuery();
            query.where = "1=1";
            query.returnGeometry = true;
            query.outFields = ["*"];

            ilSinirlariLayer.queryFeatures(query).then(function (result) {
                const feature = result.features.find(function (f) {
                    const featName = f.attributes.name || f.attributes.NAME || f.attributes.NAME_1 || "";
                    return trNormalize(featName) === trNormalize(il.ad);
                });

                if (feature) {
                    feature.popupTemplate = ilSinirlariLayer.popupTemplate;

                    const centerPoint = feature.geometry.extent
                        ? feature.geometry.extent.center
                        : new Point({ longitude: il.lon, latitude: il.lat });

                    const highlightPromise = ilSinirlariLayerView
                        ? Promise.resolve(ilSinirlariLayerView)
                        : view.whenLayerView(ilSinirlariLayer);

                    highlightPromise.then(function (layerView) {
                        ilSinirlariLayerView = layerView;
                        aktifHighlight = layerView.highlight(feature);
                    });

                    view.goTo({
                        target: feature.geometry.extent || feature.geometry,
                        zoom: 8
                    }, { duration: 600 }).then(function () {
                        view.popup.open({
                            features: [feature],
                            location: centerPoint
                        });
                    });

                } else {
                    const defaultPoint = new Point({ longitude: il.lon, latitude: il.lat });
                    view.goTo({ center: defaultPoint, zoom: 8 });
                }
            });
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

    // SAĞ ÜST KÖŞE: ARAMA ÇUBUĞU
    const searchWidget = new Search({ view: view });
    view.ui.add(searchWidget, "top-right");

});