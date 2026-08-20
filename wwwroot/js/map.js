require([
    "esri/Map",
    "esri/views/SceneView",
    "esri/Graphic",
    "esri/geometry/Point",
    "esri/geometry/Circle",
    "esri/layers/GraphicsLayer",
    "esri/layers/GeoJSONLayer",
    "esri/layers/FeatureLayer",
    "esri/widgets/Fullscreen",
    "esri/widgets/BasemapGallery",
    "esri/widgets/LayerList",
    "esri/widgets/Expand",
    "esri/widgets/Search",
    "esri/widgets/Sketch/SketchViewModel",
    "esri/geometry/support/webMercatorUtils"
], function (Map, SceneView, Graphic, Point, Circle, GraphicsLayer, GeoJSONLayer, FeatureLayer, Fullscreen, BasemapGallery, LayerList, Expand, Search, SketchViewModel, webMercatorUtils) {

    let illerListesi = [];
    let editingTesisId = null; // Düzenleme modunu takip eder (null = Yeni Kayıt)

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

    // İL POP-UP ŞABLONU
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

            let featName = getIlAdFromAttr(attr);

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

            let plakaVal = ilData ? (ilData.plaka || ilData.Plaka) : null;
            if (plakaVal === null || plakaVal === undefined) {
                plakaVal = attr.plaka || attr.PLAKA || attr.id || attr.ID || attr.number || null;
            }

            let plakaStr = "--";
            if (plakaVal !== null && plakaVal !== undefined && !isNaN(plakaVal) && Number(plakaVal) > 0) {
                const pNum = Number(plakaVal);
                plakaStr = pNum < 10 ? "0" + pNum : String(pNum);
            }

            const gosterilenAd = featName || (ilData ? (ilData.ad || ilData.adi || ilData.il_adi || ilData.name) : "--");

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

            let yuzolcumu = "--";
            if (ilData && (ilData.yuzOlcumu || ilData.yuzolcumu || ilData.yuz_olcumu || ilData.area)) {
                yuzolcumu = ilData.yuzOlcumu || ilData.yuzolcumu || ilData.yuz_olcumu || ilData.area;
            } else if (attr && (attr.yuzolcumu || attr.area || attr.AREA)) {
                yuzolcumu = attr.yuzolcumu || attr.area || attr.AREA;
            }

            return `
                <div class="popup-card">
                    <span class="popup-badge popup-badge--plaka">Plaka ${plakaStr}</span>
                    <div class="popup-row">
                        <span class="popup-row__label">İl Adı</span>
                        <span class="popup-row__value">${gosterilenAd}</span>
                    </div>
                    <div class="popup-row">
                        <span class="popup-row__label">Enlem</span>
                        <span class="popup-row__value">${enlem}</span>
                    </div>
                    <div class="popup-row">
                        <span class="popup-row__label">Boylam</span>
                        <span class="popup-row__value">${boylam}</span>
                    </div>
                    <div class="popup-row">
                        <span class="popup-row__label">Yüzölçümü</span>
                        <span class="popup-row__value">${yuzolcumu}${yuzolcumu !== "--" ? " km²" : ""}</span>
                    </div>
                </div>
            `;
        }
    };

    // PARSEL POP-UP ŞABLONU (İçindeki tesisleri dinamik çeker)
    const parselPopupTemplate = {
        title: function (target) {
            const a = (target.graphic && target.graphic.attributes) || {};
            return `Parsel Bilgisi: Ada ${a.ada_no || "--"} / Parsel ${a.parsel_no || "--"}`;
        },
        content: function (target) {
            const a = (target.graphic && target.graphic.attributes) || {};
            const parselId = a.id || a.ID;

            const container = document.createElement("div");
            container.className = "popup-card";
            container.innerHTML = `
                <div class="popup-row">
                    <span class="popup-row__label">İl / İlçe</span>
                    <span class="popup-row__value">${a.il || "--"} / ${a.ilce || "--"}</span>
                </div>
                <div class="popup-row">
                    <span class="popup-row__label">Ada / Parsel No</span>
                    <span class="popup-row__value">${a.ada_no || "--"} / ${a.parsel_no || "--"}</span>
                </div>
                <hr style="border:0; border-top:1px solid rgba(255,255,255,0.15); margin: 8px 0;" />
                <div style="font-weight: bold; margin-bottom: 6px; color: #00e5ff; font-size: 13px;">
                    ⚡ Parsel İçindeki Tesisler
                </div>
                <div id="parselTesisListesi_${parselId}" style="font-size: 12px; color: #aaa;">
                    Tesisler sorgulanıyor...
                </div>
            `;

            // Sunucudan parsel içindeki tesisleri getir
            fetch(`/Home/ParselDetay?id=${parselId}`)
                .then(res => res.json())
                .then(data => {
                    const listEl = container.querySelector(`#parselTesisListesi_${parselId}`);
                    if (!listEl) return;

                    if (data.tesisler && data.tesisler.length > 0) {
                        let html = "<ul style='margin: 0; padding-left: 16px; color: #fff;'>";
                        data.tesisler.forEach(t => {
                            const tAd = t.tesisAdi || t.TesisAdi || "İsimsiz Tesis";
                            const tTur = t.tesisTuru || t.TesisTuru || "";
                            const tGuc = t.kuruluGuc !== undefined ? t.kuruluGuc : t.KuruluGuc;
                            html += `<li style='margin-bottom: 4px;'><b>${tAd}</b> <span style='color:#bbb;'>(${tTur} - ${tGuc} MW)</span></li>`;
                        });
                        html += "</ul>";
                        listEl.innerHTML = html;
                    } else {
                        listEl.innerHTML = "<i style='color:#bbb;'>Bu parsel sınırları içinde kayıtlı tesis bulunmamaktadır.</i>";
                    }
                })
                .catch(err => {
                    const listEl = container.querySelector(`#parselTesisListesi_${parselId}`);
                    if (listEl) listEl.innerHTML = "<span style='color:#ff5252;'>Tesis bilgisi alınamadı.</span>";
                });

            return container;
        }
    };

    // 3D HARİTA TANIMI
    const map = new Map({
        basemap: "satellite",
        ground: "world-elevation"
    });

    const view = new SceneView({
        container: "viewDiv",
        map: map,
        camera: {
            position: { x: 35.2433, y: 35.0000, z: 700000 },
            tilt: 45,
            heading: 0
        },
        highlightOptions: {
            color: [0, 255, 255, 1],
            fillOpacity: 0.4,
            haloOpacity: 0.95
        }
    });

    // KATMANLAR
    const tesislerGraphicsLayer = new GraphicsLayer({ title: "Enerji Tesisleri" });
    map.add(tesislerGraphicsLayer);

    // QGIS'ten aktarılan Parseller Katmanı
    const parsellerLayer = new GeoJSONLayer({
        url: "/Home/ParsellerGeoJson",
        title: "Parseller",
        outFields: ["*"],
        popupTemplate: parselPopupTemplate,
        renderer: {
            type: "simple",
            symbol: {
                type: "simple-fill",
                color: [255, 165, 0, 0.25], // Yarı saydam turuncu dolgu
                outline: { color: [255, 140, 0, 1], width: 2.0 }
            }
        },
        labelsVisible: true,
        labelingInfo: [{
            labelExpressionInfo: { expression: "'Ada: ' + $feature.ada_no + ' / P: ' + $feature.parsel_no" },
            symbol: {
                type: "text",
                color: "#FFD54F",
                haloColor: [0, 0, 0, 0.9],
                haloSize: 1.5,
                font: { size: 9, family: "sans-serif", weight: "bold" }
            },
            minScale: 150000
        }]
    });
    map.add(parsellerLayer);

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
        },
        labelsVisible: true,
        labelingInfo: [{
            labelPlacement: "always-horizontal",
            labelExpressionInfo: { expression: "$feature.name" },
            symbol: {
                type: "text",
                color: "#E0F7FA",
                haloColor: [0, 0, 0, 0.9],
                haloSize: 1.5,
                font: { size: 9, family: "sans-serif", weight: "normal" }
            },
            minScale: 1500000
        }]
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

    const aramaGraphicsLayer = new GraphicsLayer({ title: "Arama Alanı" });
    map.add(aramaGraphicsLayer);

    // ARAÇLAR (UI WIDGETS)
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

    // İL LİSTESİ PANELİ
    let ilListeExpand = null;

    fetch("/Home/Iller")
        .then(res => res.json())
        .then(data => {
            illerListesi = data;
            illerListesi.sort((a, b) => (a.plaka || 0) - (b.plaka || 0));

            const ilListePanel = document.createElement("div");
            ilListePanel.className = "il-panel";

            const baslik = document.createElement("div");
            baslik.className = "il-panel__header";
            baslik.textContent = "İller (81 İl)";
            ilListePanel.appendChild(baslik);

            const ul = document.createElement("ul");
            ul.className = "il-panel__list";

            illerListesi.forEach(il => {
                const ilAd = il.ad || il.adi || il.il_adi || il.ilAdi || il.name || "";
                const plakaVal = il.plaka || 0;
                const plakaStr = plakaVal > 0 ? (plakaVal < 10 ? "0" + plakaVal : String(plakaVal)) : "--";

                const li = document.createElement("li");
                li.className = "il-panel__item";

                const plakaSpan = document.createElement("span");
                plakaSpan.className = "il-panel__plaka";
                plakaSpan.textContent = plakaStr;

                const adSpan = document.createElement("span");
                adSpan.textContent = ilAd;

                li.appendChild(plakaSpan);
                li.appendChild(adSpan);

                li.addEventListener("click", () => {
                    document.querySelectorAll(".il-panel__item.is-selected").forEach(el => el.classList.remove("is-selected"));
                    li.classList.add("is-selected");

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

                        view.goTo({ target: targetGeometry, heading: 0, tilt: 50 }, { duration: 1000 }).then(() => {
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


    // ADA/PARSEL SORGULAMA PANELİ
    let parsellerLayerView = null;
    let aktifParselHighlight = null;

    view.whenLayerView(parsellerLayer).then(function (layerView) {
        parsellerLayerView = layerView;
    });

    function sqlDeger(deger) {
        // Sayısal ise tırnaksız, metinse tırnaklı yazar (ada_no/parsel_no kolon tipinden bağımsız çalışsın diye)
        if (deger !== "" && !isNaN(deger)) return deger;
        return `'${deger.replace(/'/g, "''")}'`;
    }

    const parselSorguPanel = document.createElement("div");
    parselSorguPanel.className = "il-panel";
    parselSorguPanel.style.minWidth = "220px";
    parselSorguPanel.innerHTML = `
        <div class="il-panel__header">Ada/Parsel Sorgula</div>
        <div style="padding: 10px;">
            <div class="form-field">
                <label class="form-label" for="parselSorguIl">İl (opsiyonel)</label>
                <input type="text" id="parselSorguIl" class="form-input" placeholder="Örn: Ankara" />
            </div>
            <div class="form-field">
                <label class="form-label" for="parselSorguIlce">İlçe (opsiyonel)</label>
                <input type="text" id="parselSorguIlce" class="form-input" placeholder="Örn: Çankaya" />
            </div>
            <div class="form-field">
                <label class="form-label" for="parselSorguAda">Ada No</label>
                <input type="text" id="parselSorguAda" class="form-input" placeholder="Örn: 1234" />
            </div>
            <div class="form-field">
                <label class="form-label" for="parselSorguParsel">Parsel No</label>
                <input type="text" id="parselSorguParsel" class="form-input" placeholder="Örn: 5" />
            </div>
            <button type="button" id="parselSorguBtn" class="btn btn-primary" style="width:100%; margin-top:6px;">Sorgula</button>
        </div>
    `;

    const parselSorguExpand = new Expand({
        view: view,
        content: parselSorguPanel,
        expandIconClass: "esri-icon-search",
        expandTooltip: "Ada/Parsel Sorgula",
        group: "top-left"
    });
    view.ui.add(parselSorguExpand, "top-left");

    parselSorguPanel.querySelector("#parselSorguBtn").addEventListener("click", () => {
        const il = document.getElementById("parselSorguIl").value.trim();
        const ilce = document.getElementById("parselSorguIlce").value.trim();
        const ada = document.getElementById("parselSorguAda").value.trim();
        const parselNo = document.getElementById("parselSorguParsel").value.trim();

        if (!ada || !parselNo) {
            alert("Lütfen ada ve parsel numarasını giriniz.");
            return;
        }

        let where = `ada_no = ${sqlDeger(ada)} AND parsel_no = ${sqlDeger(parselNo)}`;
        if (il) where += ` AND il = ${sqlDeger(il)}`;
        if (ilce) where += ` AND ilce = ${sqlDeger(ilce)}`;

        const queryTarget = parsellerLayerView || parsellerLayer;
        const query = queryTarget.createQuery();
        query.where = where;
        query.returnGeometry = true;
        query.outFields = ["*"];

        queryTarget.queryFeatures(query).then(result => {
            if (!result.features || result.features.length === 0) {
                alert("Bu ada/parsel numarasına ait kayıt bulunamadı.");
                return;
            }

            const feature = result.features[0];
            feature.layer = parsellerLayer;
            feature.popupTemplate = parselPopupTemplate;

            if (aktifParselHighlight) { aktifParselHighlight.remove(); aktifParselHighlight = null; }
            if (parsellerLayerView) aktifParselHighlight = parsellerLayerView.highlight(feature);

            if (parselSorguExpand.expanded) parselSorguExpand.collapse();

            const targetGeometry = feature.geometry.extent || feature.geometry;
            const locationPoint = feature.geometry.extent ? feature.geometry.extent.center : feature.geometry;

            view.goTo({ target: targetGeometry, tilt: 45 }, { duration: 1000 }).then(() => {
                view.popup.open({
                    features: [feature],
                    location: locationPoint
                });
            });
        }).catch(err => {
            console.error("Ada/Parsel sorgu hatası:", err);
            alert("Sorgu sırasında bir hata oluştu.");
        });
    });

    const searchWidget = new Search({ view: view });
    view.ui.add(searchWidget, "top-right");

    // TESİS İŞLEMLERİ
    function tesisRengiGetir(tur) {
        switch ((tur || "").toUpperCase()) {
            case "GES": return [255, 215, 0];
            case "RES": return [0, 188, 212];
            case "HES": return [33, 150, 243];
            case "TERMİK": return [244, 67, 54];
            default: return [156, 39, 176];
        }
    }

    function tesisTipBilgisi(tur) {
        const anahtar = (tur || "").toUpperCase();
        const tablo = {
            "GES": { sinif: "badge-ges", etiket: "GES · Güneş" },
            "RES": { sinif: "badge-res", etiket: "RES · Rüzgar" },
            "HES": { sinif: "badge-hes", etiket: "HES · Hidroelektrik" },
            "TERMİK": { sinif: "badge-termik", etiket: "Termik" }
        };
        return tablo[anahtar] || { sinif: "badge-diger", etiket: anahtar || "Diğer" };
    }

    // TESİS POP-UP ŞABLONU
    const tesisPopupTemplate = {
        title: function (target) {
            const a = (target.graphic && target.graphic.attributes) || {};
            return a.tesisAdi || a.TesisAdi || "Tesis";
        },
        content: function (target) {
            const a = (target.graphic && target.graphic.attributes) || {};
            const id = a.id || a.Id;
            const tur = a.tesisTuru || a.TesisTuru || "";
            const bilgi = tesisTipBilgisi(tur);
            const guc = a.kuruluGuc !== undefined ? a.kuruluGuc : a.KuruluGuc;
            const il = a.ilAdi || a.IlAdi || "--";
            const enlemVal = a.enlem !== undefined ? a.enlem : a.Enlem;
            const boylamVal = a.boylam !== undefined ? a.boylam : a.Boylam;
            const enlem = typeof enlemVal === "number" ? enlemVal.toFixed(4) : (enlemVal || "--");
            const boylam = typeof boylamVal === "number" ? boylamVal.toFixed(4) : (boylamVal || "--");

            const container = document.createElement("div");
            container.className = "popup-card";
            container.innerHTML = `
                <span class="popup-badge ${bilgi.sinif}">${bilgi.etiket}</span>
                <div class="popup-row">
                    <span class="popup-row__label">Kurulu Güç</span>
                    <span class="popup-row__value">${guc !== undefined && guc !== null ? guc : "--"} MW</span>
                </div>
                <div class="popup-row">
                    <span class="popup-row__label">İl</span>
                    <span class="popup-row__value">${il}</span>
                </div>
                <div class="popup-row">
                    <span class="popup-row__label">Koordinat</span>
                    <span class="popup-row__value">${enlem}, ${boylam}</span>
                </div>
                <div class="popup-actions">
                    <button type="button" class="btn-tesis-duzenle">✏️ Düzenle</button>
                    <button type="button" class="btn-tesis-sil">🗑️ Sil</button>
                </div>
            `;

            const btnDuzenle = container.querySelector(".btn-tesis-duzenle");
            const btnSil = container.querySelector(".btn-tesis-sil");

            if (btnDuzenle) {
                btnDuzenle.addEventListener("click", () => window.tesisDuzenle(id));
            }
            if (btnSil) {
                btnSil.addEventListener("click", () => window.tesisSil(id));
            }

            return container;
        }
    };

    function haritayaTesisEkleGraphic(tesis) {
        const point = new Point({
            longitude: tesis.boylam !== undefined ? tesis.boylam : tesis.Boylam,
            latitude: tesis.enlem !== undefined ? tesis.enlem : tesis.Enlem,
            spatialReference: { wkid: 4326 }
        });

        const markerSymbol = {
            type: "simple-marker",
            color: tesisRengiGetir(tesis.tesisTuru || tesis.TesisTuru),
            size: "14px",
            outline: { color: [255, 255, 255], width: 1.5 }
        };

        const graphic = new Graphic({
            geometry: point,
            symbol: markerSymbol,
            attributes: tesis,
            popupTemplate: tesisPopupTemplate
        });

        tesislerGraphicsLayer.add(graphic);
    }

    function mevcutTesisleriYukle() {
        tesislerGraphicsLayer.removeAll();
        fetch("/Home/Tesisler")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    data.forEach(tesis => haritayaTesisEkleGraphic(tesis));
                }
            })
            .catch(err => console.error("Tesisler çekilirken hata:", err));
    }

    function tesisSembolleriGuncelle(bulunanIdSeti) {
        tesislerGraphicsLayer.graphics.forEach(g => {
            const attrId = g.attributes.id !== undefined ? g.attributes.id : g.attributes.Id;
            const tur = g.attributes.tesisTuru || g.attributes.TesisTuru;
            const iciAlanda = bulunanIdSeti.has(attrId);

            g.symbol = {
                type: "simple-marker",
                color: tesisRengiGetir(tur),
                size: iciAlanda ? "18px" : "10px",
                outline: {
                    color: iciAlanda ? [255, 255, 0] : [255, 255, 255],
                    width: iciAlanda ? 3 : 1
                }
            };
        });
    }

    function tesisSembolleriSifirla() {
        tesislerGraphicsLayer.graphics.forEach(g => {
            const tur = g.attributes.tesisTuru || g.attributes.TesisTuru;
            g.symbol = {
                type: "simple-marker",
                color: tesisRengiGetir(tur),
                size: "14px",
                outline: { color: [255, 255, 255], width: 1.5 }
            };
        });
    }

    // KÜRESEL DÜZENLEME VE SİLME FONKSİYONLARI
    window.tesisSil = function (id) {
        if (!id) {
            alert("Tesis ID'si bulunamadı.");
            return;
        }
        if (confirm("Bu tesisi silmek istediğinize emin misiniz?")) {
            fetch("/Home/TesisSil", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(id)
            })
                .then(res => {
                    if (res.ok) {
                        view.popup.close();
                        const graphicToRemove = tesislerGraphicsLayer.graphics.find(g => {
                            const attrId = g.attributes.id || g.attributes.Id;
                            return attrId == id;
                        });
                        if (graphicToRemove) {
                            tesislerGraphicsLayer.remove(graphicToRemove);
                        }
                    } else {
                        alert("Silme işlemi başarısız oldu.");
                    }
                })
                .catch(err => console.error("Silme hatası:", err));
        }
    };

    window.tesisDuzenle = function (id) {
        if (!id) {
            alert("Tesis ID'si bulunamadı.");
            return;
        }

        const graphicToEdit = tesislerGraphicsLayer.graphics.find(g => {
            const attrId = g.attributes.id || g.attributes.Id;
            return attrId == id;
        });

        if (!graphicToEdit) return;

        const attr = graphicToEdit.attributes;
        editingTesisId = id;

        document.getElementById("modalTesisAdi").value = attr.tesisAdi || attr.TesisAdi || "";
        document.getElementById("modalKuruluGuc").value = attr.kuruluGuc !== undefined ? attr.kuruluGuc : attr.KuruluGuc;
        document.getElementById("modalEnlem").value = attr.enlem !== undefined ? attr.enlem : attr.Enlem;
        document.getElementById("modalBoylam").value = attr.boylam !== undefined ? attr.boylam : attr.Boylam;

        pilSecimGuncelle(attr.tesisTuru || attr.TesisTuru || "GES");

        selectIl.innerHTML = "";
        illerListesi.forEach(il => {
            const ad = il.ad || il.adi || il.il_adi || il.ilAdi || il.name;
            const opt = document.createElement("option");
            opt.value = ad;
            opt.textContent = ad;
            if (ad === (attr.ilAdi || attr.IlAdi)) {
                opt.selected = true;
            }
            selectIl.appendChild(opt);
        });

        document.querySelector(".tesis-modal__title").textContent = "Tesis Bilgilerini Düzenle";
        document.getElementById("modalKaydetBtn").textContent = "Güncelle";

        modal.classList.add("is-open");
        view.popup.close();
    };

    // TESİS EKLEME MODAL VE FAB
    let tesisEklemeModuAktif = false;
    let mapClickHandle = null;
    let selectedTesisTuru = "GES";

    const tesisEkleBtn = document.createElement("button");
    tesisEkleBtn.className = "fab-add-tesis";
    tesisEkleBtn.title = "Haritadan Yeni Tesis Ekle";
    tesisEkleBtn.innerHTML = '<span class="fab-add-tesis__icon" aria-hidden="true">+</span>';

    document.body.appendChild(tesisEkleBtn);

    const modalHtml = `
        <div id="tesisModal" class="tesis-modal">
            <div class="tesis-modal__card">
                <h3 class="tesis-modal__title">Yeni Tesis Kaydı</h3>

                <div class="form-field">
                    <label class="form-label" for="modalTesisAdi">Tesis Adı</label>
                    <input type="text" id="modalTesisAdi" class="form-input" placeholder="Örn: Atatürk HES" />
                </div>

                <div class="form-field">
                    <label class="form-label">Tesis Türü</label>
                    <div class="tesis-type-pills" id="modalTesisTuruPills">
                        <button type="button" class="tesis-type-pill pill-ges" data-value="GES">GES</button>
                        <button type="button" class="tesis-type-pill pill-res" data-value="RES">RES</button>
                        <button type="button" class="tesis-type-pill pill-hes" data-value="HES">HES</button>
                        <button type="button" class="tesis-type-pill pill-termik" data-value="TERMİK">Termik</button>
                    </div>
                </div>

                <div class="form-field">
                    <label class="form-label" for="modalKuruluGuc">Kurulu Güç (MW)</label>
                    <input type="number" step="0.01" id="modalKuruluGuc" class="form-input" placeholder="Örn: 50.5" />
                </div>

                <div class="form-field">
                    <label class="form-label" for="modalIlAdi">İl</label>
                    <select id="modalIlAdi" class="form-select"></select>
                </div>

                <div class="form-row form-field">
                    <div class="form-field">
                        <label class="form-label">Enlem</label>
                        <input type="text" id="modalEnlem" class="form-input" readonly />
                    </div>
                    <div class="form-field">
                        <label class="form-label">Boylam</label>
                        <input type="text" id="modalBoylam" class="form-input" readonly />
                    </div>
                </div>

                <div class="modal-actions">
                    <button type="button" id="modalIptalBtn" class="btn btn-ghost">İptal</button>
                    <button type="button" id="modalKaydetBtn" class="btn btn-primary">Kaydet</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);

    const modal = document.getElementById("tesisModal");
    const selectIl = document.getElementById("modalIlAdi");

    function pilSecimGuncelle(tur) {
        selectedTesisTuru = tur;
        document.querySelectorAll(".tesis-type-pill").forEach(function (p) {
            p.classList.toggle("is-selected", p.dataset.value === tur);
        });
    }

    document.querySelectorAll(".tesis-type-pill").forEach(function (pill) {
        pill.addEventListener("click", function () {
            pilSecimGuncelle(pill.dataset.value);
        });
    });

    tesisEkleBtn.addEventListener("click", () => {
        editingTesisId = null;
        document.querySelector(".tesis-modal__title").textContent = "Yeni Tesis Kaydı";
        document.getElementById("modalKaydetBtn").textContent = "Kaydet";

        tesisEklemeModuAktif = !tesisEklemeModuAktif;

        if (tesisEklemeModuAktif) {
            tesisEkleBtn.classList.add("is-active");
            tesisEkleBtn.title = "İptal etmek için tekrar tıklayın";

            mapClickHandle = view.on("click", (evt) => {
                evt.stopPropagation();

                const lat = evt.mapPoint.latitude.toFixed(6);
                const lon = evt.mapPoint.longitude.toFixed(6);

                document.getElementById("modalEnlem").value = lat;
                document.getElementById("modalBoylam").value = lon;
                document.getElementById("modalTesisAdi").value = "";
                document.getElementById("modalKuruluGuc").value = "";
                pilSecimGuncelle("GES");

                selectIl.innerHTML = "";
                illerListesi.forEach(il => {
                    const ad = il.ad || il.adi || il.il_adi || il.ilAdi || il.name;
                    const opt = document.createElement("option");
                    opt.value = ad;
                    opt.textContent = ad;
                    selectIl.appendChild(opt);
                });

                modal.classList.add("is-open");

                tesisEklemeModuAktif = false;
                tesisEkleBtn.classList.remove("is-active");
                tesisEkleBtn.title = "Haritadan Yeni Tesis Ekle";
                if (mapClickHandle) mapClickHandle.remove();
            });
        } else {
            tesisEkleBtn.classList.remove("is-active");
            tesisEkleBtn.title = "Haritadan Yeni Tesis Ekle";
            if (mapClickHandle) mapClickHandle.remove();
        }
    });

    document.getElementById("modalIptalBtn").addEventListener("click", () => {
        modal.classList.remove("is-open");
        editingTesisId = null;
    });

    document.getElementById("modalKaydetBtn").addEventListener("click", () => {
        const tesisData = {
            TesisAdi: document.getElementById("modalTesisAdi").value.trim(),
            TesisTuru: selectedTesisTuru,
            KuruluGuc: parseFloat(document.getElementById("modalKuruluGuc").value) || 0,
            IlAdi: document.getElementById("modalIlAdi").value,
            Enlem: parseFloat(document.getElementById("modalEnlem").value),
            Boylam: parseFloat(document.getElementById("modalBoylam").value)
        };

        if (!tesisData.TesisAdi) {
            alert("Lütfen bir tesis adı giriniz.");
            return;
        }

        if (editingTesisId) {
            tesisData.Id = editingTesisId;

            fetch("/Home/TesisGuncelle", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(tesisData)
            })
                .then(res => {
                    if (res.ok) return res.json();
                    throw new Error("Güncelleme hatası");
                })
                .then(guncellenenTesis => {
                    modal.classList.remove("is-open");
                    editingTesisId = null;
                    mevcutTesisleriYukle();
                })
                .catch(err => console.error("Güncelleme hatası:", err));

        } else {
            fetch("/Home/TesisEkle", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(tesisData)
            })
                .then(res => {
                    if (res.ok) return res.json();
                    throw new Error("Sunucu hatası");
                })
                .then(kaydedilenTesis => {
                    modal.classList.remove("is-open");
                    haritayaTesisEkleGraphic(kaydedilenTesis);
                })
                .catch(err => console.error("Kayıt hatası:", err));
        }
    });

    // YAKIN TESİS ARAMA (nokta + yarıçap)
    let aramaModuAktif = false;
    let aramaMapClickHandle = null;
    let aramaSonucVar = false;
    let secilenAramaNoktasi = null;

    let sonucPanel = null;
    let sonAramaTipi = null;

    const aramaBtn = document.createElement("button");
    aramaBtn.className = "fab-search-tesis";
    aramaBtn.title = "Yakın Tesis Ara";
    aramaBtn.innerHTML = '<span class="fab-search-tesis__icon" aria-hidden="true">⌖</span>';
    document.body.appendChild(aramaBtn);

    const aramaModalHtml = `
        <div id="aramaModal" class="tesis-modal">
            <div class="tesis-modal__card">
                <h3 class="tesis-modal__title">Yakın Tesis Ara</h3>
                <p style="color:#aaa; font-size:13px; margin-top:-8px;">
                    Seçilen nokta: <span id="aramaKoordinatText">--</span>
                </p>

                <div class="form-field">
                    <label class="form-label">Arama Yarıçapı (km)</label>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <button type="button" id="aramaYaricapAzalt" class="btn btn-ghost" style="padding:6px 14px;">−</button>
                        <input type="number" id="aramaYaricapInput" class="form-input" style="text-align:center;" value="50" min="1" max="300" step="5" />
                        <button type="button" id="aramaYaricapArtir" class="btn btn-ghost" style="padding:6px 14px;">+</button>
                    </div>
                </div>

                <div class="modal-actions">
                    <button type="button" id="aramaIptalBtn" class="btn btn-ghost">İptal</button>
                    <button type="button" id="aramaAraBtn" class="btn btn-primary">Ara</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML("beforeend", aramaModalHtml);

    const aramaModal = document.getElementById("aramaModal");
    const aramaYaricapInput = document.getElementById("aramaYaricapInput");

    const ARAMA_YARICAP_MIN = 1;
    const ARAMA_YARICAP_MAX = 300;
    const ARAMA_YARICAP_ADIM = 5;

    document.getElementById("aramaYaricapAzalt").addEventListener("click", () => {
        let deger = parseInt(aramaYaricapInput.value, 10) || 50;
        deger = Math.max(ARAMA_YARICAP_MIN, deger - ARAMA_YARICAP_ADIM);
        aramaYaricapInput.value = deger;
    });

    document.getElementById("aramaYaricapArtir").addEventListener("click", () => {
        let deger = parseInt(aramaYaricapInput.value, 10) || 50;
        deger = Math.min(ARAMA_YARICAP_MAX, deger + ARAMA_YARICAP_ADIM);
        aramaYaricapInput.value = deger;
    });

    document.getElementById("aramaIptalBtn").addEventListener("click", () => {
        aramaModal.classList.remove("is-open");
        secilenAramaNoktasi = null;
    });

    aramaBtn.addEventListener("click", () => {
        if (aramaSonucVar) {
            aramaTemizle();
            return;
        }

        if (sonAramaTipi === "polygon") {
            polygonTemizle();
        }

        aramaModuAktif = !aramaModuAktif;

        if (aramaModuAktif) {
            aramaBtn.classList.add("is-active");
            aramaBtn.title = "İptal etmek için tekrar tıklayın";

            aramaMapClickHandle = view.on("click", (evt) => {
                evt.stopPropagation();

                secilenAramaNoktasi = {
                    lat: evt.mapPoint.latitude,
                    lon: evt.mapPoint.longitude
                };

                document.getElementById("aramaKoordinatText").textContent =
                    secilenAramaNoktasi.lat.toFixed(4) + ", " + secilenAramaNoktasi.lon.toFixed(4);
                aramaYaricapInput.value = 50;

                aramaModal.classList.add("is-open");

                aramaModuAktif = false;
                aramaBtn.classList.remove("is-active");
                aramaBtn.title = "Yakın Tesis Ara";
                if (aramaMapClickHandle) aramaMapClickHandle.remove();
            });
        } else {
            aramaBtn.classList.remove("is-active");
            aramaBtn.title = "Yakın Tesis Ara";
            if (aramaMapClickHandle) aramaMapClickHandle.remove();
        }
    });

    document.getElementById("aramaAraBtn").addEventListener("click", () => {
        if (!secilenAramaNoktasi) return;

        let radiusKm = parseInt(aramaYaricapInput.value, 10) || 50;
        radiusKm = Math.min(ARAMA_YARICAP_MAX, Math.max(ARAMA_YARICAP_MIN, radiusKm));

        fetch(`/Home/YakinTesisler?lat=${secilenAramaNoktasi.lat}&lon=${secilenAramaNoktasi.lon}&radiusKm=${radiusKm}`)
            .then(res => res.json())
            .then(sonucListesi => {
                aramaCiziVeVurgula(secilenAramaNoktasi, radiusKm, sonucListesi);
                aramaModal.classList.remove("is-open");
            })
            .catch(err => console.error("Yakın tesis arama hatası:", err));
    });

    function aramaCiziVeVurgula(nokta, radiusKm, sonucListesi) {
        const merkez = new Point({
            longitude: nokta.lon,
            latitude: nokta.lat,
            spatialReference: { wkid: 4326 }
        });

        const daire = new Circle({
            center: merkez,
            radius: radiusKm,
            radiusUnit: "kilometers",
            geodesic: true
        });

        aramaGraphicsLayer.removeAll();
        aramaGraphicsLayer.add(new Graphic({
            geometry: daire,
            symbol: {
                type: "simple-fill",
                color: [0, 188, 212, 0.10],
                outline: { color: [0, 188, 212, 0.9], width: 2 }
            }
        }));
        aramaGraphicsLayer.add(new Graphic({
            geometry: merkez,
            symbol: {
                type: "simple-marker",
                color: [0, 188, 212],
                size: "9px",
                outline: { color: "white", width: 1 }
            }
        }));

        const bulunanIdSeti = new Set(sonucListesi.map(t => t.id !== undefined ? t.id : t.Id));
        tesisSembolleriGuncelle(bulunanIdSeti);

        const bulunanGraphics = tesislerGraphicsLayer.graphics.filter(g => {
            const attrId = g.attributes.id !== undefined ? g.attributes.id : g.attributes.Id;
            return bulunanIdSeti.has(attrId);
        }).toArray();

        if (bulunanGraphics.length > 0) {
            view.popup.open({
                features: bulunanGraphics,
                location: merkez
            });
        } else {
            view.popup.open({
                title: "Sonuç Yok",
                content: "Bu alanda kayıtlı tesis bulunamadı.",
                location: merkez
            });
        }

        view.goTo(daire.extent.expand(1.4));

        aramaSonucVar = true;
        aramaBtn.classList.add("is-active");
        aramaBtn.title = "Aramayı temizlemek için tıklayın";
        sonAramaTipi = "yaricap";

        sonucPanelGoster(`${sonucListesi.length} tesis bulundu (${radiusKm} km yarıçap)`);
    }

    function aramaTemizle() {
        aramaGraphicsLayer.removeAll();
        view.popup.close();
        aramaSonucVar = false;
        secilenAramaNoktasi = null;
        aramaBtn.classList.remove("is-active");
        aramaBtn.title = "Yakın Tesis Ara";
        if (sonAramaTipi === "yaricap") sonAramaTipi = null;
        if (sonucPanel) sonucPanel.style.display = "none";

        tesisSembolleriSifirla();
    }

    function sonucPanelGoster(mesaj) {
        if (!sonucPanel) {
            sonucPanel = document.createElement("div");
            Object.assign(sonucPanel.style, {
                position: "fixed",
                bottom: "24px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(20,20,20,0.92)",
                color: "#fff",
                padding: "10px 18px",
                borderRadius: "10px",
                fontSize: "14px",
                zIndex: 1000,
                display: "flex",
                alignItems: "center",
                gap: "12px"
            });
            document.body.appendChild(sonucPanel);
        }

        sonucPanel.innerHTML = `
            <span>${mesaj}</span>
            <button type="button" id="sonucTemizleBtn" class="btn btn-ghost" style="padding:4px 12px;">Temizle</button>
        `;
        sonucPanel.style.display = "flex";

        document.getElementById("sonucTemizleBtn").addEventListener("click", () => {
            if (sonAramaTipi === "yaricap") aramaTemizle();
            else if (sonAramaTipi === "polygon") polygonTemizle();
        });
    }

    // POLYGON İÇİNDEKİ TESİS ARAMA
    let polygonModuAktif = false;
    let polygonSonucVar = false;

    const sketchGraphicsLayer = new GraphicsLayer({ title: "Çizim (Geçici)", listMode: "hide" });
    map.add(sketchGraphicsLayer);

    const sketchViewModel = new SketchViewModel({
        view: view,
        layer: sketchGraphicsLayer,
        polygonSymbol: {
            type: "simple-fill",
            color: [156, 39, 176, 0.15],
            outline: { color: [156, 39, 176, 0.9], width: 2 }
        }
    });

    const polygonBtn = document.createElement("button");
    polygonBtn.className = "fab-draw-polygon";
    polygonBtn.title = "Alan Çizerek Tesis Ara";
    polygonBtn.innerHTML = '<span class="fab-draw-polygon__icon" aria-hidden="true">⬠</span>';
    document.body.appendChild(polygonBtn);

    polygonBtn.addEventListener("click", () => {
        if (polygonSonucVar) {
            polygonTemizle();
            return;
        }

        if (polygonModuAktif) {
            sketchViewModel.cancel();
            polygonCizimBitir();
            return;
        }

        if (sonAramaTipi === "yaricap") {
            aramaTemizle();
        }

        polygonModuAktif = true;
        polygonBtn.classList.add("is-active");
        polygonBtn.title = "İptal etmek için tekrar tıklayın (çizimi bitirmek için çift tıklayın)";
        sketchViewModel.create("polygon");
    });

    function polygonCizimBitir() {
        polygonModuAktif = false;
        polygonBtn.classList.remove("is-active");
        polygonBtn.title = "Alan Çizerek Tesis Ara";
    }

    sketchViewModel.on("create", (event) => {
        if (event.state === "complete") {
            polygonCizimBitir();
            polygonSorgulaVeGoster(event.graphic.geometry);
        } else if (event.state === "cancel") {
            polygonCizimBitir();
        }
    });

    function polygonSorgulaVeGoster(polygonGeometry) {
        sketchGraphicsLayer.removeAll();

        let geoPolygon = polygonGeometry;
        if (polygonGeometry.spatialReference && !polygonGeometry.spatialReference.isWGS84) {
            geoPolygon = webMercatorUtils.webMercatorToGeographic(polygonGeometry);
        }

        const ring = geoPolygon.rings[0];
        if (!ring || ring.length < 3) return;

        const noktalar = ring.map(coord => ({ lat: coord[1], lon: coord[0] }));

        fetch("/Home/TesislerPolygonIcinde", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ noktalar: noktalar })
        })
            .then(res => {
                if (!res.ok) throw new Error("Polygon arama isteği başarısız oldu.");
                return res.json();
            })
            .then(sonucListesi => {
                aramaGraphicsLayer.removeAll();
                aramaGraphicsLayer.add(new Graphic({
                    geometry: polygonGeometry,
                    symbol: {
                        type: "simple-fill",
                        color: [156, 39, 176, 0.12],
                        outline: { color: [156, 39, 176, 0.9], width: 2.2 }
                    }
                }));

                const bulunanIdSeti = new Set(sonucListesi.map(t => t.id !== undefined ? t.id : t.Id));
                tesisSembolleriGuncelle(bulunanIdSeti);

                const bulunanGraphics = tesislerGraphicsLayer.graphics.filter(g => {
                    const attrId = g.attributes.id !== undefined ? g.attributes.id : g.attributes.Id;
                    return bulunanIdSeti.has(attrId);
                }).toArray();

                if (bulunanGraphics.length > 0) {
                    view.popup.open({
                        features: bulunanGraphics,
                        location: polygonGeometry.extent.center
                    });
                } else {
                    view.popup.open({
                        title: "Sonuç Yok",
                        content: "Bu alanda kayıtlı tesis bulunamadı.",
                        location: polygonGeometry.extent.center
                    });
                }

                view.goTo(polygonGeometry.extent.expand(1.4));

                polygonSonucVar = true;
                polygonBtn.classList.add("is-active");
                polygonBtn.title = "Aramayı temizlemek için tıklayın";
                sonAramaTipi = "polygon";

                sonucPanelGoster(`${sonucListesi.length} tesis bulundu (çizilen alan)`);
            })
            .catch(err => {
                console.error("Polygon arama hatası:", err);
            });
    }

    function polygonTemizle() {
        aramaGraphicsLayer.removeAll();
        view.popup.close();
        polygonSonucVar = false;
        polygonBtn.classList.remove("is-active");
        polygonBtn.title = "Alan Çizerek Tesis Ara";
        if (sonAramaTipi === "polygon") sonAramaTipi = null;
        if (sonucPanel) sonucPanel.style.display = "none";

        tesisSembolleriSifirla();
    }
});