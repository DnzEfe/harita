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

    let illerListesi = [];

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

    // Harita grafiğindeki özniteliklerden (attributes) il adını tespit eden esnek fonksiyon
    function getIlAdFromAttr(attr) {
        if (!attr) return "";
        if (attr.name) return attr.name;
        if (attr.NAME) return attr.NAME;
        if (attr.Name) return attr.Name;
        if (attr.il_adi) return attr.il_adi;
        if (attr.IL_ADI) return attr.IL_ADI;
        if (attr.ilAdi) return attr.ilAdi;
        if (attr.NAME_1) return attr.NAME_1;
        if (attr.label) return attr.label;

        // Alternatif olarak anahtar kelimeler içinde ara
        for (let key in attr) {
            const kLower = key.toLowerCase();
            if (kLower.includes("name") || kLower.includes("il") || kLower === "ad") {
                if (typeof attr[key] === "string" && attr[key].trim().length > 0) {
                    return attr[key];
                }
            }
        }
        return "";
    }

    function findMatchingFeature(features, rawTargetName) {
        const normTarget = trNormalize(rawTargetName);
        if (!normTarget) return null;

        const aliasMap = {
            "afyon": "afyonkarahisar",
            "icel": "mersin",
            "maras": "kahramanmaras",
            "kmaras": "kahramanmaras",
            "urfa": "sanliurfa",
            "surfa": "sanliurfa",
            "antep": "gaziantep"
        };

        const mappedTarget = aliasMap[normTarget] || normTarget;

        let match = features.find(function (f) {
            const featName = trNormalize(getIlAdFromAttr(f.attributes));
            return featName === mappedTarget || featName === normTarget;
        });

        if (match) return match;

        match = features.find(function (f) {
            const featName = trNormalize(getIlAdFromAttr(f.attributes));
            if (!featName) return false;
            return (featName.startsWith(mappedTarget) && mappedTarget.length >= 3) ||
                (mappedTarget.startsWith(featName) && featName.length >= 3);
        });

        return match;
    }

    // =========================================================
    // DİNAMİK İL POP-UP ŞABLONU
    // =========================================================
    const ilPopupTemplate = {
        title: function (target) {
            const g = target.graphic;
            const attr = g ? (g.attributes || {}) : {};
            const featName = getIlAdFromAttr(attr);
            return featName ? "İl Bilgisi: " + featName : "İl Bilgisi";
        },
        content: function (target) {
            const g = target.graphic;
            const attr = g ? (g.attributes || {}) : {};

            // 1. Grafik özniteliklerinden il adını al
            let featName = getIlAdFromAttr(attr);

            // 2. /Home/Iller verisinden eşleşen ili bul
            let ilData = null;
            if (illerListesi && illerListesi.length > 0 && featName) {
                const normTarget = trNormalize(featName);
                ilData = illerListesi.find(il => {
                    const ad = trNormalize(il.ad || il.adi || il.il_adi || il.ilAdi || il.name || "");
                    return ad === normTarget;
                });

                if (!ilData) {
                    ilData = illerListesi.find(il => {
                        const ad = trNormalize(il.ad || il.adi || il.il_adi || il.ilAdi || il.name || "");
                        return (ad.startsWith(normTarget) && normTarget.length >= 3) ||
                            (normTarget.startsWith(ad) && ad.length >= 3);
                    });
                }
            }

            // 3. Plaka Kodunu Belirle (İl Verisi -> GeoJSON attributes yedekleri)
            let plakaVal = ilData ? (ilData.plaka || ilData.Plaka) : null;
            if (plakaVal === null || plakaVal === undefined) {
                plakaVal = attr.plaka || attr.PLAKA || attr.id || attr.ID || attr.number || null;
            }

            let plakaStr = "--";
            if (plakaVal !== null && plakaVal !== undefined && !isNaN(plakaVal) && Number(plakaVal) > 0) {
                const pNum = Number(plakaVal);
                plakaStr = pNum < 10 ? "0" + pNum : String(pNum);
            }

            // 4. İl Adı Gösterimi
            const gosterilenAd = featName || (ilData ? (ilData.ad || ilData.adi || ilData.il_adi || ilData.name) : "--");

            // 5. Enlem / Boylam
            let enlem = "--";
            let boylam = "--";

            if (ilData && (ilData.enlem || ilData.lat || ilData.Enlem)) {
                enlem = ilData.enlem || ilData.lat || ilData.Enlem;
            } else if (g && g.geometry) {
                const center = g.geometry.extent ? g.geometry.extent.center : g.geometry;
                if (center && center.latitude) enlem = center.latitude.toFixed(4);
            }

            if (ilData && (ilData.boylam || ilData.lon || ilData.Boylam)) {
                boylam = ilData.boylam || ilData.lon || ilData.Boylam;
            } else if (g && g.geometry) {
                const center = g.geometry.extent ? g.geometry.extent.center : g.geometry;
                if (center && center.longitude) boylam = center.longitude.toFixed(4);
            }

            // 6. Yüzölçümü
            let yuzolcumu = "--";
            if (ilData && (ilData.yuzOlcumu || ilData.yuzolcumu || ilData.yuz_olcumu || ilData.area)) {
                yuzolcumu = ilData.yuzOlcumu || ilData.yuzolcumu || ilData.yuz_olcumu || ilData.area;
            } else if (attr && (attr.yuzolcumu || attr.area || attr.AREA)) {
                yuzolcumu = attr.yuzolcumu || attr.area || attr.AREA;
            }

            return `
                <div style="font-family: sans-serif; font-size: 13px; line-height: 1.8;">
                    <b>Plaka Kodu:</b> ${plakaStr}<br/>
                    <b>İl Adı:</b> ${gosterilenAd}<br/>
                    <b>Enlem:</b> ${enlem}<br/>
                    <b>Boylam:</b> ${boylam}<br/>
                    <b>Yüzölçümü:</b> ${yuzolcumu} ${yuzolcumu !== "--" ? "km²" : ""}
                </div>
            `;
        }
    };

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
    // KATMANLAR
    // =========================================================
    const tesislerGraphicsLayer = new GraphicsLayer({ title: "Enerji Tesisleri" });
    map.add(tesislerGraphicsLayer);

    const ilSinirlariLayer = new GeoJSONLayer({
        url: "https://raw.githubusercontent.com/uyasarkocal/borders-of-turkey/master/lvl1-TR.geojson",
        title: "İl Sınırları",
        outFields: ["*"],
        popupTemplate: ilPopupTemplate,
        renderer: {
            type: "simple",
            symbol: {
                type: "simple-fill",
                color: [255, 255, 255, 0],
                outline: { color: [255, 170, 0, 1], width: 3.0 }
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
        }]
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
                outline: { color: [0, 220, 255, 0.85], width: 1.2, style: "dash" }
            }
        }
    });
    map.add(ilceSinirlariLayer);

    const trFayHatLariLayer = new FeatureLayer({
        url: "https://services1.arcgis.com/0MSEUqKaxRlEPVqi/arcgis/rest/services/Turkey_Faults/FeatureServer/0",
        title: "Türkiye Diri Fay Hatları",
        renderer: {
            type: "simple",
            symbol: { type: "simple-line", color: [255, 0, 0, 0.95], width: 2.2 }
        }
    });
    map.add(trFayHatLariLayer);

    const graphicsLayer = new GraphicsLayer({ title: "İşaretler" });
    map.add(graphicsLayer);

    // =========================================================
    // ARAÇLAR (UI WIDGETS)
    // =========================================================
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

    const layerList = new LayerList({ view: view });
    const layerListExpand = new Expand({
        view: view,
        content: layerList,
        expandIconClass: "esri-icon-layers",
        expandTooltip: "Katmanlar",
        group: "top-left"
    });
    view.ui.add(layerListExpand, "top-left");

    // =========================================================
    // İL LİSTESİ PANELİ
    // =========================================================
    let ilListeExpand = null;

    fetch("/Home/Iller")
        .then(res => res.json())
        .then(data => {
            illerListesi = data;
            illerListesi.sort((a, b) => (a.plaka || 0) - (b.plaka || 0));

            const ilListePanel = document.createElement("div");
            ilListePanel.style.cssText = "background:white;padding:10px;width:240px;max-height:420px;overflow-y:auto;font-family:sans-serif;";

            const baslik = document.createElement("b");
            baslik.textContent = "İller (81 İl)";
            baslik.style.fontSize = "13px";
            ilListePanel.appendChild(baslik);

            const ul = document.createElement("ul");
            ul.style.cssText = "list-style:none;padding:0;margin:8px 0 0 0;";

            illerListesi.forEach(il => {
                const ilAd = il.ad || il.adi || il.il_adi || il.ilAdi || il.name || "";
                const plakaVal = il.plaka || 0;
                const plakaStr = plakaVal > 0 ? (plakaVal < 10 ? "0" + plakaVal : plakaVal) : "--";

                const li = document.createElement("li");
                li.textContent = plakaStr + " - " + ilAd;
                li.style.cssText = "padding:6px 4px;cursor:pointer;border-bottom:1px solid #eee;color:#222;font-size:12.5px;";

                li.addEventListener("mouseover", () => li.style.background = "#f2f2f2");
                li.addEventListener("mouseout", () => li.style.background = "white");

                li.addEventListener("click", () => {
                    if (ilListeExpand) ilListeExpand.collapse();
                    if (aktifHighlight) { aktifHighlight.remove(); aktifHighlight = null; }

                    const queryTarget = ilSinirlariLayerView || ilSinirlariLayer;
                    const query = queryTarget.createQuery();
                    query.where = "1=1";
                    query.returnGeometry = true;
                    query.outFields = ["*"];

                    queryTarget.queryFeatures(query).then(result => {
                        let feature = findMatchingFeature(result.features, ilAd);
                        let targetGeometry, locationPoint;

                        if (feature) {
                            feature.layer = ilSinirlariLayer;
                            feature.popupTemplate = ilPopupTemplate;
                            if (ilSinirlariLayerView) aktifHighlight = ilSinirlariLayerView.highlight(feature);
                            targetGeometry = feature.geometry.extent || feature.geometry;
                            locationPoint = feature.geometry.extent ? feature.geometry.extent.center : feature.geometry;
                        } else {
                            locationPoint = new Point({ longitude: Number(il.lon || il.boylam || 35.0), latitude: Number(il.lat || il.enlem || 39.0), spatialReference: { wkid: 4326 } });
                            targetGeometry = locationPoint;
                            feature = new Graphic({
                                geometry: locationPoint,
                                attributes: { name: ilAd },
                                popupTemplate: ilPopupTemplate
                            });
                        }

                        view.goTo({ target: targetGeometry, zoom: 8 }, { duration: 600 }).then(() => {
                            view.popup.open({
                                features: [feature],
                                location: locationPoint
                            });
                        });
                    });
                });
                ul.appendChild(li);
            });

            ilListePanel.appendChild(ul);
            ilListeExpand = new Expand({ view: view, content: ilListePanel, expandIconClass: "esri-icon-menu", expandTooltip: "İl Listesi", group: "top-left" });
            view.ui.add(ilListeExpand, "top-left");

            mevcutTesisleriYukle();
        });

    const searchWidget = new Search({ view: view });
    view.ui.add(searchWidget, "top-right");

    // =========================================================
    // TESİS SEMBOLÜ RENK HARİTASI VE GRAFİK EKLEME
    // =========================================================
    function tesisRengiGetir(tur) {
        switch ((tur || "").toUpperCase()) {
            case "GES": return [255, 215, 0];
            case "RES": return [0, 188, 212];
            case "HES": return [33, 150, 243];
            case "TERMİK": return [244, 67, 54];
            default: return [156, 39, 176];
        }
    }

    function haritayaTesisEkleGraphic(tesis) {
        const point = new Point({
            longitude: tesis.boylam || tesis.Boylam,
            latitude: tesis.enlem || tesis.Enlem,
            spatialReference: { wkid: 4326 }
        });

        const markerSymbol = {
            type: "simple-marker",
            color: tesisRengiGetir(tesis.tesisTuru || tesis.TesisTuru),
            size: "12px",
            outline: { color: [255, 255, 255], width: 1.5 }
        };

        const graphic = new Graphic({
            geometry: point,
            symbol: markerSymbol,
            attributes: tesis,
            popupTemplate: {
                title: "Tesis: {tesisAdi}",
                content: `
                    <b>Tür:</b> {tesisTuru}<br/>
                    <b>Kurulu Güç:</b> {kuruluGuc} MW<br/>
                    <b>İl:</b> {ilAdi}<br/>
                    <b>Koordinat:</b> {enlem}, {boylam}
                `
            }
        });

        tesislerGraphicsLayer.add(graphic);
    }

    function mevcutTesisleriYukle() {
        fetch("/Home/Tesisler")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    data.forEach(tesis => haritayaTesisEkleGraphic(tesis));
                }
            })
            .catch(err => console.error("Tesisler çekilirken hata:", err));
    }

    // =========================================================
    // TESİS EKLEME BUTONU VE MODAL FORM MANTIĞI
    // =========================================================
    let tesisEklemeModuAktif = false;
    let mapClickHandle = null;

    const tesisEkleBtn = document.createElement("button");
    tesisEkleBtn.className = "esri-widget--button esri-widget esri-interactive";
    tesisEkleBtn.title = "Haritadan Yeni Tesis Ekle";
    tesisEkleBtn.innerHTML = "<span class='esri-icon-plus'></span>";
    tesisEkleBtn.style.cssText = "background-color: #2e7d32; color: white; border-radius: 2px;";

    view.ui.add(tesisEkleBtn, "top-left");

    const modalHtml = `
        <div id="tesisModal" style="display:none; position:fixed; z-index:9999; left:0; top:0; width:100%; height:100%; background:rgba(0,0,0,0.5); align-items:center; justify-content:center; font-family:sans-serif;">
            <div style="background:white; padding:20px; border-radius:8px; width:340px; box-shadow:0 4px 15px rgba(0,0,0,0.3);">
                <h3 style="margin-top:0; font-size:16px; color:#333; border-bottom:1px solid #ddd; padding-bottom:8px;">Yeni Tesis Kaydı</h3>
                
                <label style="font-size:12px; font-weight:bold; display:block; margin-top:10px;">Tesis Adı:</label>
                <input type="text" id="modalTesisAdi" style="width:100%; padding:6px; margin-top:3px; box-sizing:border-box;" placeholder="Örn: Atatürk HES" />

                <label style="font-size:12px; font-weight:bold; display:block; margin-top:10px;">Tesis Türü:</label>
                <select id="modalTesisTuru" style="width:100%; padding:6px; margin-top:3px; box-sizing:border-box;">
                    <option value="GES">GES (Güneş Enerjisi)</option>
                    <option value="RES">RES (Rüzgar Enerjisi)</option>
                    <option value="HES">HES (Hidroelektrik)</option>
                    <option value="TERMİK">TERMİK</option>
                </select>

                <label style="font-size:12px; font-weight:bold; display:block; margin-top:10px;">Kurulu Güç (MW):</label>
                <input type="number" step="0.01" id="modalKuruluGuc" style="width:100%; padding:6px; margin-top:3px; box-sizing:border-box;" placeholder="Örn: 50.5" />

                <label style="font-size:12px; font-weight:bold; display:block; margin-top:10px;">İl:</label>
                <select id="modalIlAdi" style="width:100%; padding:6px; margin-top:3px; box-sizing:border-box;"></select>

                <div style="display:flex; gap:10px; margin-top:10px;">
                    <div style="flex:1;">
                        <label style="font-size:11px; font-weight:bold;">Enlem:</label>
                        <input type="text" id="modalEnlem" readonly style="width:100%; padding:5px; background:#eee; border:1px solid #ccc; font-size:11px;" />
                    </div>
                    <div style="flex:1;">
                        <label style="font-size:11px; font-weight:bold;">Boylam:</label>
                        <input type="text" id="modalBoylam" readonly style="width:100%; padding:5px; background:#eee; border:1px solid #ccc; font-size:11px;" />
                    </div>
                </div>

                <div style="margin-top:18px; text-align:right;">
                    <button id="modalIptalBtn" style="padding:7px 14px; background:#757575; color:white; border:none; border-radius:4px; cursor:pointer; margin-right:5px;">İptal</button>
                    <button id="modalKaydetBtn" style="padding:7px 14px; background:#1976d2; color:white; border:none; border-radius:4px; cursor:pointer;">Kaydet</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);

    const modal = document.getElementById("tesisModal");
    const selectIl = document.getElementById("modalIlAdi");

    tesisEkleBtn.addEventListener("click", () => {
        tesisEklemeModuAktif = !tesisEklemeModuAktif;

        if (tesisEklemeModuAktif) {
            tesisEkleBtn.style.backgroundColor = "#d32f2f";

            mapClickHandle = view.on("click", (evt) => {
                evt.stopPropagation();

                const lat = evt.mapPoint.latitude.toFixed(6);
                const lon = evt.mapPoint.longitude.toFixed(6);

                document.getElementById("modalEnlem").value = lat;
                document.getElementById("modalBoylam").value = lon;
                document.getElementById("modalTesisAdi").value = "";
                document.getElementById("modalKuruluGuc").value = "";

                selectIl.innerHTML = "";
                illerListesi.forEach(il => {
                    const ad = il.ad || il.adi || il.il_adi || il.ilAdi || il.name;
                    const opt = document.createElement("option");
                    opt.value = ad;
                    opt.textContent = ad;
                    selectIl.appendChild(opt);
                });

                modal.style.display = "flex";

                tesisEklemeModuAktif = false;
                tesisEkleBtn.style.backgroundColor = "#2e7d32";
                if (mapClickHandle) mapClickHandle.remove();
            });
        } else {
            tesisEkleBtn.style.backgroundColor = "#2e7d32";
            if (mapClickHandle) mapClickHandle.remove();
        }
    });

    document.getElementById("modalIptalBtn").addEventListener("click", () => {
        modal.style.display = "none";
    });

    document.getElementById("modalKaydetBtn").addEventListener("click", () => {
        const yeniTesis = {
            TesisAdi: document.getElementById("modalTesisAdi").value.trim(),
            TesisTuru: document.getElementById("modalTesisTuru").value,
            KuruluGuc: parseFloat(document.getElementById("modalKuruluGuc").value) || 0,
            IlAdi: document.getElementById("modalIlAdi").value,
            Enlem: parseFloat(document.getElementById("modalEnlem").value),
            Boylam: parseFloat(document.getElementById("modalBoylam").value)
        };

        if (!yeniTesis.TesisAdi) {
            return;
        }

        fetch("/Home/TesisEkle", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(yeniTesis)
        })
            .then(res => {
                if (res.ok) return res.json();
                throw new Error("Sunucu hatası");
            })
            .then(kaydedilenTesis => {
                modal.style.display = "none";

                haritayaTesisEkleGraphic({
                    tesisAdi: kaydedilenTesis.tesisAdi || yeniTesis.TesisAdi,
                    tesisTuru: kaydedilenTesis.tesisTuru || yeniTesis.TesisTuru,
                    kuruluGuc: kaydedilenTesis.kuruluGuc || yeniTesis.KuruluGuc,
                    ilAdi: kaydedilenTesis.ilAdi || yeniTesis.IlAdi,
                    enlem: kaydedilenTesis.enlem || yeniTesis.Enlem,
                    boylam: kaydedilenTesis.boylam || yeniTesis.Boylam
                });
            })
            .catch(err => {
                console.error("Kayıt hatası:", err);
            });
    });
});