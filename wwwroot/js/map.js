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
            // Fonksiyonun TAMAMI try/catch içinde: herhangi bir satır hata
            // fırlatırsa bile widget'ın render'ı durmaz, sadece o item için
            // bir uyarı loglanır ve diğer katmanlar normal şekilde listelenir.
            try {
                const item = event.item;

                // NOT: GraphicsLayer ve group katmanların renderer/legend desteği yoktur.
                // Bu katmanlara legend paneli atamaya çalışmak hataya yol açabilir.
                if (item.layer && item.layer.type !== "graphics" && item.layer.type !== "group") {
                    item.panel = { content: "legend", open: false };
                }

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
            } catch (e) {
                console.warn("LayerList item oluşturulurken hata:", event.item && event.item.layer && event.item.layer.title, e);
            }
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
    // 3. İL LİSTESİ PANELİ (Controller'dan JSON fetch)
    // =========================================================
    // Iller() action'ı HomeController içinde tanımlı, bu yüzden URL /Home/Iller.
    let illerListesi = [];
    let ilListeExpand = null;

    fetch("/Home/Iller")
        .then(function (res) {
            if (!res.ok) {
                throw new Error("Sunucu hatası: " + res.status + " " + res.statusText);
            }
            return res.json();
        })
        .then(function (data) {
            illerListesi = data;
            illerListesi.sort(function (a, b) { return a.plaka - b.plaka; });

            // ---- Liste panelini oluşturan kod artık veri geldikten SONRA çalışıyor ----
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

            ilListeExpand = new Expand({
                view: view,
                content: ilListePanel,
                expandIconClass: "esri-icon-menu",
                expandTooltip: "İl Listesi",
                group: "top-left"
            });
            view.ui.add(ilListeExpand, "top-left");
            // ---- Liste paneli sonu ----
        })
        .catch(function (err) {
            console.error("İller verisi alınamadı:", err);
        });

    // SAĞ ÜST KÖŞE: ARAMA ÇUBUĞU
    const searchWidget = new Search({ view: view });
    view.ui.add(searchWidget, "top-right");

});