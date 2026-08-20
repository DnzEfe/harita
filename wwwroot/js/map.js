require([
    "esri/config",
    "esri/Map",
    "esri/views/MapView",
    "esri/views/SceneView",
    "esri/Graphic",
    "esri/layers/GraphicsLayer",
    "esri/widgets/Fullscreen",
    "esri/widgets/BasemapGallery",
    "esri/widgets/Expand",
    "esri/Basemap",
    "esri/widgets/Home",
    "esri/layers/GeoJSONLayer",
    "esri/widgets/LayerList",
    "esri/layers/TileLayer",
    "esri/widgets/Weather",
    "esri/widgets/Daylight",
    "esri/widgets/Sketch/SketchViewModel",
    "esri/core/reactiveUtils",
    "esri/geometry/Circle"
], function (esriConfig, Map, MapView, SceneView, Graphic, GraphicsLayer, Fullscreen, BasemapGallery, Expand, Basemap, Home, GeoJSONLayer, LayerList, TileLayer, Weather, Daylight, SketchViewModel, reactiveUtils, Circle) {

    esriConfig.apiKey = "AAPK_BURAYA_KENDI_API_ANAHTARINI_YAZABILIRSIN";

    // --- HARİTA VE KATMANLAR ---
    const map = new Map({ basemap: "satellite", ground: "world-elevation" });

    const ilSinirlariLayer = new GeoJSONLayer({
        url: "/js/iller.json",
        spatialReference: { wkid: 4326 },
        objectIdField: "feature_id",
        outFields: ["*"],
        renderer: { type: "simple", symbol: { type: "simple-fill", color: [0, 0, 0, 0], outline: { color: [255, 204, 0, 1], width: 1.5 } } },
        title: "Türkiye İl Sınırları",
        popupEnabled: false,
        labelsVisible: true,
        labelingInfo: [{
            labelExpressionInfo: { expression: "$feature.feature_name" },
            labelPlacement: "always-horizontal",
            symbol: { type: "text", color: "white", haloColor: [0, 0, 0, 0.85], haloSize: 1.2, font: { size: 10, weight: "bold", family: "sans-serif" } }
        }]
    });

    const ulasimLayer = new TileLayer({ url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer", title: "Otobanlar", visible: false });
    const tesislerKatmani = new GraphicsLayer({ title: "Enerji Tesisleri" });
    const analizKatmani = new GraphicsLayer({ title: "Mekansal Analiz (Çember)" });
    const poligonKatmani = new GraphicsLayer({ title: "Serbest Çizim Alanı" });
    const parsellerKatmani = new GraphicsLayer({ title: "Tapu Parselleri" });

    map.addMany([ulasimLayer, ilSinirlariLayer, tesislerKatmani, analizKatmani, poligonKatmani, parsellerKatmani]);

    const baslangicAyarlari = { map: map, center: [35.2433, 38.9637], zoom: 6 };

    const view2D = new MapView({ ...baslangicAyarlari, highlightOptions: { color: [0, 234, 255, 1], haloOpacity: 1, fillOpacity: 0.25 } });
    const view3D = new SceneView({
        ...baslangicAyarlari,
        qualityProfile: "high",
        environment: { lighting: { type: "sun", date: new Date(), directShadowsEnabled: true } },
        highlightOptions: { color: [0, 234, 255, 1], haloOpacity: 1, fillOpacity: 0.25 }
    });

    let activeView = view3D;
    activeView.container = "viewDiv";

    // --- ARAYÜZ (UI) ARAÇLARI VE WIDGET'LAR ---
    const toggleButton = document.createElement("div"); toggleButton.className = "esri-widget esri-widget--button esri-interactive"; toggleButton.innerHTML = "2D"; toggleButton.style.fontWeight = "bold"; toggleButton.title = "2D Görünüme Geç";

    const fullscreen = new Fullscreen({ view: activeView });
    const homeWidget = new Home({ view: activeView });

    function altlikOnizlemeUret(metin, arkaplanRengi) {
        const canvas = document.createElement("canvas"); canvas.width = 200; canvas.height = 133;
        const ctx = canvas.getContext("2d"); ctx.fillStyle = arkaplanRengi; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 18px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(metin, canvas.width / 2, canvas.height / 2); return canvas.toDataURL();
    }

    const sokaklarAltligi = new Basemap({ baseLayers: [new TileLayer({ url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer" })], title: "Sokaklar", id: "sokaklar-klasik", thumbnailUrl: altlikOnizlemeUret("Sokaklar", "#6b8f47") });
    const topografikAltlik = new Basemap({ baseLayers: [new TileLayer({ url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer" })], title: "Topografik", id: "topografik-klasik", thumbnailUrl: altlikOnizlemeUret("Topografik", "#8a6d3b") });
    const koyuGriAltlik = new Basemap({ baseLayers: [new TileLayer({ url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer" }), new TileLayer({ url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer" })], title: "Koyu Gri Kanvas", id: "koyu-gri-klasik", thumbnailUrl: altlikOnizlemeUret("Koyu Gri", "#3a3a3a") });
    const acikGriAltlik = new Basemap({ baseLayers: [new TileLayer({ url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer" }), new TileLayer({ url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer" })], title: "Açık Gri Kanvas", id: "acik-gri-klasik", thumbnailUrl: altlikOnizlemeUret("Açık Gri", "#9e9e9e") });

    const basemapGalleryWidget = new BasemapGallery({ view: activeView, source: [Basemap.fromId("satellite"), Basemap.fromId("hybrid"), sokaklarAltligi, topografikAltlik, koyuGriAltlik, acikGriAltlik, Basemap.fromId("osm")] });

    document.head.insertAdjacentHTML('beforeend', `
        <style>
            .esri-basemap-gallery { width: 300px !important; max-height: 420px !important; overflow-y: auto !important; }
            .esri-icon-cloudy::before { content: "☁️" !important; font-family: initial !important; font-size: 17px !important; line-height: 1 !important; }
        </style>
    `);

    const basemapExpand = new Expand({ view: activeView, content: basemapGalleryWidget, expandIconClass: "esri-icon-basemap", expandTooltip: "Altlık Seç" });

    const layerListWidget = new LayerList({
        view: activeView,
        listItemCreatedFunction: function (event) {
            const item = event.item;
            if (item.layer === ilSinirlariLayer) {
                item.actionsSections = [[{ title: "Şehir İsimlerini Göster/Gizle", className: ilSinirlariLayer.labelsVisible ? "esri-icon-labels" : "esri-icon-non-visible", id: "il-etiket-toggle" }]];
            }
        }
    });

    layerListWidget.on("trigger-action", function (event) {
        if (event.action.id === "il-etiket-toggle") { ilSinirlariLayer.labelsVisible = !ilSinirlariLayer.labelsVisible; event.action.className = ilSinirlariLayer.labelsVisible ? "esri-icon-labels" : "esri-icon-non-visible"; }
    });

    const layerListExpand = new Expand({ view: activeView, content: layerListWidget, expandIconClass: "esri-icon-layers", expandTooltip: "Katmanlar" });

    // 3D Araçları
    const weatherExpand = new Expand({ view: activeView, content: new Weather({ view: activeView }), expandIconClass: "esri-icon-cloudy", expandTooltip: "Hava Durumu" });
    const daylightExpand = new Expand({ view: activeView, content: new Daylight({ view: activeView }), expandIconClass: "esri-icon-lightbulb", expandTooltip: "Gün Işığı Simülasyonu" });

    // --- YENİ: ARAMA KUTUSU (EXPAND WIDGET) ---
    const sorguContainer = document.createElement("div");
    sorguContainer.className = "esri-widget";
    sorguContainer.style.padding = "15px";
    sorguContainer.style.width = "220px";
    sorguContainer.innerHTML = `
        <h3 style="margin-top:0; color:#0079c1; font-size: 14px;">🔍 Ada/Parsel Sorgula</h3>
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <input type="number" id="sorguAda" placeholder="Ada" style="width:45%; padding:5px; border:1px solid #ccc; border-radius:4px;">
            <input type="number" id="sorguParsel" placeholder="Parsel" style="width:45%; padding:5px; border:1px solid #ccc; border-radius:4px;">
        </div>
        <button id="btnSorgula" style="width:100%; padding:8px; background:#0079c1; color:white; border:none; cursor:pointer; font-weight:bold; border-radius:4px;">Bul ve Yaklaş</button>
    `;

    const sorguExpand = new Expand({
        view: activeView,
        content: sorguContainer,
        expandIconClass: "esri-icon-search",
        expandTooltip: "Ada/Parsel Sorgula"
    });

    let highlightGrafigi = null;

    // Arama Mantığı (Kusursuz Merkezleme ve Zoom ile)
    sorguContainer.querySelector("#btnSorgula").addEventListener("click", () => {
        const ada = document.getElementById("sorguAda").value;
        const parsel = document.getElementById("sorguParsel").value;

        if (!ada || !parsel) { alert("Lütfen ada ve parsel numarasını girin!"); return; }

        fetch(`/api/parsel/sorgula?ada=${ada}&parsel=${parsel}`)
            .then(res => {
                if (!res.ok) throw new Error("Bu ada/parsele ait kayıt bulunamadı!");
                return res.json();
            })
            .then(parselData => {
                const polygonGeometry = { type: "polygon", rings: [parselData.koordinatlar], spatialReference: { wkid: 4326 } };
                if (highlightGrafigi) activeView.graphics.remove(highlightGrafigi);

                highlightGrafigi = new Graphic({
                    geometry: polygonGeometry,
                    symbol: { type: "simple-fill", color: [255, 255, 0, 0.4], outline: { color: [255, 0, 0], width: 2 } }
                });
                activeView.graphics.add(highlightGrafigi);

                // --- SON DÜZELTME: Doğrudan grafiğin sınırlarına tatlı bir şekilde zoom yapar ---
                activeView.goTo({ target: highlightGrafigi.geometry.extent.expand(2) }, { duration: 1500 });
                sorguExpand.collapse(); // Gittikten sonra menüyü otomatik kapat

                fetch(`/api/parsel/${parselData.id}/tesisler`)
                    .then(r => r.json())
                    .then(tesisler => {
                        let html = `<b>Sistem ID:</b> ${parselData.id} <br>
                                    <b>İl:</b> ${parselData.il} <br>
                                    <b>İlçe:</b> ${parselData.ilce} <br>
                                    <b>Ada No:</b> ${parselData.adaNo} <br>
                                    <b>Parsel No:</b> ${parselData.parselNo} <br>
                                    <hr><b>Parsel İçindeki Tesisler:</b><br>`;
                        if (tesisler.length === 0) { html += "<i>Bu parsel sınırları içinde tesis bulunamadı.</i>"; }
                        else { html += "<ul>"; tesisler.forEach(t => { html += `<li>${t.tesisAdi}</li>`; }); html += "</ul>"; }

                        activeView.popup.open({
                            title: "🔍 Sorgu Sonucu",
                            content: html,
                            // --- SON DÜZELTME: Popup'ı grafiğin tam merkezinde (centroid) açar ---
                            location: highlightGrafigi.geometry.centroid
                        });
                    });
            })
            .catch(err => alert(err.message));
    });

    const tesisEkleBtn = document.createElement("div"); tesisEkleBtn.className = "esri-widget esri-widget--button esri-interactive"; tesisEkleBtn.title = "Haritaya Tesis Ekle"; tesisEkleBtn.innerHTML = '<span class="esri-icon-plus"></span>';
    const analizBtn = document.createElement("div"); analizBtn.className = "esri-widget esri-widget--button esri-interactive"; analizBtn.title = "Yarıçap Analizi Yap"; analizBtn.innerHTML = '<span class="esri-icon-dial"></span>';
    const poligonBtn = document.createElement("div"); poligonBtn.className = "esri-widget esri-widget--button esri-interactive"; poligonBtn.title = "Alanı Kendin Çiz"; poligonBtn.innerHTML = '<span class="esri-icon-polygon"></span>';
    const coordDiv = document.getElementById("coordDiv");

    // --- HTML FORMLARI (DOKUNULMADI) ---
    const formHtml = `<div id="tesisFormKutusu" style="display:none; position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); background:white; padding:20px; z-index:99; box-shadow:0 4px 15px rgba(0,0,0,0.3); border-radius:8px; width: 300px; font-family: sans-serif;"><h3 style="margin-top:0; color:#0079c1;">Yeni Tesis Ekle</h3><label>Tesis Adı:</label><br><input type="text" id="tAdi" style="width:100%; margin-bottom:10px; padding:5px;"><br><label>Tesis Türü:</label><br><select id="tTuru" style="width:100%; margin-bottom:10px; padding:5px;"><option value="HES">HES</option><option value="GES">GES</option><option value="RES">RES</option><option value="Termik">Termik</option></select><br><label>İl (Otomatik):</label><br><input type="text" id="tIl" readonly style="width:100%; margin-bottom:10px; padding:5px; background:#f0f0f0;"><br><label>Enlem:</label><br><input type="text" id="tEnlem" readonly style="width:100%; margin-bottom:10px; padding:5px; background:#f0f0f0;"><br><label>Boylam:</label><br><input type="text" id="tBoylam" readonly style="width:100%; margin-bottom:15px; padding:5px; background:#f0f0f0;"><br><button id="btnKaydet" style="width:100%; padding:10px; background:#0079c1; color:white; border:none; cursor:pointer; font-weight:bold; border-radius:4px;">Kaydet</button><button id="btnIptal" style="width:100%; padding:10px; background:#ccc; color:black; border:none; cursor:pointer; font-weight:bold; margin-top:8px; border-radius:4px;">İptal</button></div>`;
    const editFormHtml = `<div id="editFormKutusu" style="display:none; position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); background:white; padding:20px; z-index:99; box-shadow:0 4px 15px rgba(0,0,0,0.3); border-radius:8px; width: 300px; font-family: sans-serif;"><h3 style="margin-top:0; color:#28a745;">Tesisi Düzenle</h3><input type="hidden" id="eId"><label>Tesis Adı:</label><br><input type="text" id="eAdi" style="width:100%; margin-bottom:10px; padding:5px;"><br><label>Tesis Türü:</label><br><select id="eTuru" style="width:100%; margin-bottom:10px; padding:5px;"><option value="HES">HES</option><option value="GES">GES</option><option value="RES">RES</option><option value="Termik">Termik</option></select><br><label>İl:</label><br><input type="text" id="eIl" readonly style="width:100%; margin-bottom:10px; padding:5px; background:#f0f0f0;"><br><label>Enlem:</label><br><input type="text" id="eEnlem" readonly style="width:100%; margin-bottom:10px; padding:5px; background:#f0f0f0;"><br><label>Boylam:</label><br><input type="text" id="eBoylam" readonly style="width:100%; margin-bottom:15px; padding:5px; background:#f0f0f0;"><br><button id="btnGuncelle" style="width:100%; padding:10px; background:#28a745; color:white; border:none; cursor:pointer; font-weight:bold; border-radius:4px;">Güncelle</button><button id="btnEditIptal" style="width:100%; padding:10px; background:#ccc; color:black; border:none; cursor:pointer; font-weight:bold; margin-top:8px; border-radius:4px;">İptal</button></div>`;

    document.body.insertAdjacentHTML('beforeend', formHtml + editFormHtml);
    const tesisFormKutusu = document.getElementById("tesisFormKutusu"); const editFormKutusu = document.getElementById("editFormKutusu");

    // --- UYGULAMA MODLARI VE SKETCH KURULUMU ---
    let tesisEklemeModu = false; let analizModu = false; let poligonModu = false; let ilHighlightHandle = null;

    const sketchVM = new SketchViewModel({ view: activeView, layer: poligonKatmani, polygonSymbol: { type: "simple-fill", color: [156, 39, 176, 0.3], outline: { color: [156, 39, 176, 0.9], width: 2 } } });

    sketchVM.on("create", function (event) {
        if (event.state === "complete") {
            const polygonGeometrisi = event.graphic.geometry;
            const gonderilecekKoordinatlar = polygonGeometrisi.rings[0].map(nokta => {
                let x = nokta[0]; let y = nokta[1];
                if (Math.abs(x) > 180) { let lon = (x / 20037508.34) * 180; let lat = (y / 20037508.34) * 180; lat = 180 / Math.PI * (2 * Math.atan(Math.exp(lat * Math.PI / 180)) - Math.PI / 2); return { boylam: lon, enlem: lat }; }
                return { boylam: x, enlem: y };
            });

            fetch('/api/tesis/analiz/polygon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(gonderilecekKoordinatlar) })
                .then(res => res.json())
                .then(bulunanTesisler => {
                    const bulunanIdler = bulunanTesisler.map(t => t.id);
                    tesislerKatmani.graphics.forEach(g => { g.visible = bulunanIdler.includes(g.attributes.Id); });
                    let popupIcerik = `<div style="font-family: sans-serif; padding: 5px;"><p style="margin-top:0; font-size:14px; color:#9c27b0; font-weight:bold;">📍 Çizdiğiniz alanda toplam <b>${bulunanTesisler.length}</b> tesis bulundu.</p><hr style="border:0; border-top:1px solid #eee; margin:10px 0;">`;
                    if (bulunanTesisler.length > 0) { popupIcerik += `<ul style="list-style:none; padding:0; margin:0; max-height: 200px; overflow-y: auto;">`; bulunanTesisler.forEach(t => { popupIcerik += `<li style="padding: 6px 0; border-bottom: 1px solid #f0f0f0;"><span style="font-size:12px;">⚡</span> <b>${t.tesisAdi}</b> <span style="color:#666; font-size:12px; float:right;">${t.tesisTuru} - ${t.il}</span></li>`; }); popupIcerik += `</ul>`; }
                    popupIcerik += `</div>`;
                    activeView.popup.open({ title: `📐 Serbest Alan Analizi`, content: popupIcerik, location: polygonGeometrisi.centroid });
                }).catch(err => console.error("Poligon Analiz Hatası:", err));
        }
    });

    function modlariSifirla() { tesisEklemeModu = false; analizModu = false; poligonModu = false; tesisEkleBtn.style.backgroundColor = ""; analizBtn.style.backgroundColor = ""; poligonBtn.style.backgroundColor = ""; document.body.style.cursor = "default"; analizKatmani.removeAll(); poligonKatmani.removeAll(); sketchVM.cancel(); tesislerKatmani.graphics.forEach(g => g.visible = true); if (ilHighlightHandle) { ilHighlightHandle.remove(); ilHighlightHandle = null; } }

    tesisEkleBtn.addEventListener("click", () => { const aktifMi = tesisEklemeModu; modlariSifirla(); if (!aktifMi) { tesisEklemeModu = true; tesisEkleBtn.style.backgroundColor = "#e2f1fb"; document.body.style.cursor = "crosshair"; } });
    analizBtn.addEventListener("click", () => { const aktifMi = analizModu; modlariSifirla(); if (!aktifMi) { analizModu = true; analizBtn.style.backgroundColor = "#e2f1fb"; document.body.style.cursor = "crosshair"; } });
    poligonBtn.addEventListener("click", () => { const aktifMi = poligonModu; modlariSifirla(); if (!aktifMi) { poligonModu = true; poligonBtn.style.backgroundColor = "#f3e5f5"; document.body.style.cursor = "crosshair"; sketchVM.create("polygon"); } });
    document.getElementById("btnIptal").addEventListener("click", () => { tesisFormKutusu.style.display = "none"; }); document.getElementById("btnEditIptal").addEventListener("click", () => { editFormKutusu.style.display = "none"; });

    const tesisPopupSablonu = { title: "⚡ {Name}", content: `<div class="ozel-popup-icerik"><div class="popup-satir"><span class="popup-etiket">⚙️ Tesis Türü</span><span class="rozet rozet-{Type}">{Type}</span></div><div class="popup-satir"><span class="popup-etiket">📍 İl</span><span class="popup-deger">{City}</span></div><div class="popup-satir"><span class="popup-etiket">🧭 Koordinat</span><span class="popup-deger" style="font-size:12px; color:#94a3b8; font-weight:500;">{Lat}, {Lon}</span></div></div>`, actions: [{ title: "Düzenle", id: "edit-tesis", className: "esri-icon-edit" }, { title: "Tesisi Sil", id: "delete-tesis", className: "esri-icon-trash" }] };

    function handlePopupAction(event) {
        const seciliGrafik = activeView.popup.selectedFeature; const dbId = seciliGrafik.attributes.Id;
        if (event.action.id === "delete-tesis") { if (confirm("Silmek istediğinize emin misiniz?")) { fetch('/api/tesis/' + dbId, { method: 'DELETE' }).then(res => { if (res.ok) { tesislerKatmani.remove(seciliGrafik); activeView.popup.close(); } }); } }
        else if (event.action.id === "edit-tesis") { document.getElementById("eId").value = dbId; document.getElementById("eAdi").value = seciliGrafik.attributes.Name; document.getElementById("eTuru").value = seciliGrafik.attributes.Type; document.getElementById("eIl").value = seciliGrafik.attributes.City; document.getElementById("eEnlem").value = seciliGrafik.attributes.Lat; document.getElementById("eBoylam").value = seciliGrafik.attributes.Lon; editFormKutusu.style.display = "block"; activeView.popup.close(); }
    }
    reactiveUtils.on(() => view2D.popup, "trigger-action", handlePopupAction); reactiveUtils.on(() => view3D.popup, "trigger-action", handlePopupAction);

    function handleMapClick(event) {
        if (tesisEklemeModu || analizModu || poligonModu) { event.stopPropagation(); }
        if (tesisEklemeModu) { document.getElementById("tEnlem").value = event.mapPoint.latitude.toFixed(6); document.getElementById("tBoylam").value = event.mapPoint.longitude.toFixed(6); document.getElementById("tIl").value = "Hesaplanıyor..."; const query = ilSinirlariLayer.createQuery(); query.geometry = event.mapPoint; query.spatialRelationship = "intersects"; query.outFields = ["feature_name"]; ilSinirlariLayer.queryFeatures(query).then(function (response) { document.getElementById("tIl").value = response.features.length > 0 ? response.features[0].attributes.feature_name : "Sınır Dışı"; tesisFormKutusu.style.display = "block"; modlariSifirla(); }); return; }
        if (analizModu) {
            const lat = event.mapPoint.latitude; const lon = event.mapPoint.longitude; const girilenDeger = prompt("Hedef noktayı seçtiniz.\nKaç kilometrelik yarıçap içinde arama yapmak istiyorsunuz?", "50"); if (girilenDeger === null || girilenDeger.trim() === "") return; const yariCapKm = parseFloat(girilenDeger); if (isNaN(yariCapKm) || yariCapKm <= 0) { alert("Hata: Lütfen sıfırdan büyük bir kilometre değeri giriniz!"); return; }
            analizKatmani.removeAll(); const cemberGeometrisi = new Circle({ center: [lon, lat], radius: yariCapKm, radiusUnit: "kilometers" }); const cemberGrafigi = new Graphic({ geometry: cemberGeometrisi, symbol: { type: "simple-fill", color: [0, 112, 255, 0.2], outline: { color: [0, 112, 255, 0.8], width: 2 } } }); analizKatmani.add(cemberGrafigi);
            fetch(`/api/tesis/analiz/yakindakiler?enlem=${lat}&boylam=${lon}&mesafeKm=${yariCapKm}`).then(res => res.json()).then(bulunanTesisler => { const bulunanIdler = bulunanTesisler.map(t => t.id); tesislerKatmani.graphics.forEach(g => { g.visible = bulunanIdler.includes(g.attributes.Id); }); let popupIcerik = `<div style="font-family: sans-serif; padding: 5px;"><p style="margin-top:0; font-size:14px; color:#0079c1; font-weight:bold;">📍 Bu alanda toplam <b>${bulunanTesisler.length}</b> tesis bulundu.</p><hr style="border:0; border-top:1px solid #eee; margin:10px 0;">`; if (bulunanTesisler.length > 0) { popupIcerik += `<ul style="list-style:none; padding:0; margin:0; max-height: 200px; overflow-y: auto;">`; bulunanTesisler.forEach(t => { popupIcerik += `<li style="padding: 6px 0; border-bottom: 1px solid #f0f0f0;"><span style="font-size:12px;">⚡</span> <b>${t.tesisAdi}</b> <span style="color:#666; font-size:12px; float:right;">${t.tesisTuru} - ${t.il}</span></li>`; }); popupIcerik += `</ul>`; } popupIcerik += `</div>`; activeView.popup.open({ title: `🎯 ${yariCapKm} km Yarıçaplı Analiz`, content: popupIcerik, location: event.mapPoint }); }).catch(err => console.error("Analiz Hatası:", err)); return;
        }
        if (!poligonModu) {
            // 1. Önce tıklanan yerde parsel veya tesis var mı diye kontrol et (HitTest)
            activeView.hitTest(event).then(function (response) {

                // Tıklanan şey bizim parsel veya tesis katmanlarımızdan biri mi?
                const grafikTiklandi = response.results.some(function (result) {
                    return result.graphic && (result.graphic.layer === parsellerKatmani || result.graphic.layer === tesislerKatmani);
                });

                // Eğer parsele veya tesise tıklandıysa, DUR! İl popup'ını açma.
                if (grafikTiklandi) {
                    return;
                }

                // 2. Eğer parsel veya tesise tıklanmadıysa (boş bir yere tıklandıysa) il bilgisini göster
                const tiklananLat = event.mapPoint.latitude; const tiklananLon = event.mapPoint.longitude; const ilQuery = ilSinirlariLayer.createQuery(); ilQuery.geometry = event.mapPoint; ilQuery.spatialRelationship = "intersects"; ilQuery.outFields = ["feature_name", "feature_id"];

                ilSinirlariLayer.queryFeatures(ilQuery).then(function (response) {
                    let ilAdi = "Sınır Dışı"; let plakaKodu = "--";
                    if (ilHighlightHandle) { ilHighlightHandle.remove(); ilHighlightHandle = null; }
                    if (response.features.length > 0) {
                        ilAdi = response.features[0].attributes.feature_name; plakaKodu = String(response.features[0].attributes.feature_id).padStart(2, "0");
                        activeView.whenLayerView(ilSinirlariLayer).then(function (ilLayerView) { ilHighlightHandle = ilLayerView.highlight(response.features[0]); }).catch(function (err) { console.error("Highlight Hatası:", err); });
                    }
                    const ilPopupIcerik = `<div class="ozel-popup-icerik"><div class="popup-satir"><span class="popup-etiket">🚗 Plaka Kodu</span><span class="rozet" style="background:linear-gradient(135deg,#0079c1,#00549c);">${plakaKodu}</span></div><div class="popup-satir"><span class="popup-etiket">📍 İl</span><span class="popup-deger">${ilAdi}</span></div><div class="popup-satir"><span class="popup-etiket">🧭 Enlem</span><span class="popup-deger">${tiklananLat.toFixed(6)}</span></div><div class="popup-satir"><span class="popup-etiket">🧭 Boylam</span><span class="popup-deger">${tiklananLon.toFixed(6)}</span></div></div>`;
                    activeView.popup.open({ title: ilAdi !== "Sınır Dışı" ? `📍 ${ilAdi} (${plakaKodu})` : "📍 Sınır Dışı Nokta", content: ilPopupIcerik, location: event.mapPoint });
                }).catch(err => console.error("İl Sorgu Hatası:", err));
            });
        }
    }
    view2D.on("click", handleMapClick); view3D.on("click", handleMapClick);

    function updateCoords(event) { const point = activeView.toMap({ x: event.x, y: event.y }); if (point) { coordDiv.innerHTML = `Koordinat: ${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`; } else { coordDiv.innerHTML = `Koordinat: Harita Dışı`; } }
    let pointerEvt = activeView.on("pointer-move", updateCoords);

    // CRUD İŞLEMLER
    document.getElementById("btnGuncelle").addEventListener("click", () => { const gId = document.getElementById("eId").value; const gTesis = { id: parseInt(gId), tesisAdi: document.getElementById("eAdi").value, tesisTuru: document.getElementById("eTuru").value, il: document.getElementById("eIl").value, enlem: parseFloat(document.getElementById("eEnlem").value), boylam: parseFloat(document.getElementById("eBoylam").value) }; fetch('/api/tesis/' + gId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(gTesis) }).then(res => { if (res.ok) { tesislerKatmani.graphics.forEach(g => { if (g.attributes.Id == gId) { g.attributes.Name = gTesis.tesisAdi; g.attributes.Type = gTesis.tesisTuru; let sRengi; switch (gTesis.tesisTuru) { case "HES": sRengi = [0, 112, 255]; break; case "GES": sRengi = [255, 204, 0]; break; case "RES": sRengi = [50, 205, 50]; break; case "Termik": sRengi = [105, 105, 105]; break; default: sRengi = [255, 0, 0]; } const yeniGrafik = g.clone(); yeniGrafik.symbol = { type: "simple-marker", color: sRengi, outline: { color: [255, 255, 255], width: 1.5 }, size: "14px" }; tesislerKatmani.remove(g); tesislerKatmani.add(yeniGrafik); } }); editFormKutusu.style.display = "none"; } }); });
    document.getElementById("btnKaydet").addEventListener("click", () => { const yeniTesis = { tesisAdi: document.getElementById("tAdi").value, tesisTuru: document.getElementById("tTuru").value, il: document.getElementById("tIl").value, enlem: parseFloat(document.getElementById("tEnlem").value), boylam: parseFloat(document.getElementById("tBoylam").value) }; fetch('/api/tesis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(yeniTesis) }).then(res => { if (!res.ok) throw new Error("Hata"); return res.json(); }).then(kaydedilenVeri => { let sRengi; switch (yeniTesis.tesisTuru) { case "HES": sRengi = [0, 112, 255]; break; case "GES": sRengi = [255, 204, 0]; break; case "RES": sRengi = [50, 205, 50]; break; case "Termik": sRengi = [105, 105, 105]; break; default: sRengi = [255, 0, 0]; } const pointGraphic = new Graphic({ geometry: { type: "point", longitude: kaydedilenVeri.boylam, latitude: kaydedilenVeri.enlem }, symbol: { type: "simple-marker", color: sRengi, outline: { color: [255, 255, 255], width: 1.5 }, size: "14px" }, attributes: { Id: kaydedilenVeri.id, Name: kaydedilenVeri.tesisAdi, Type: kaydedilenVeri.tesisTuru, City: kaydedilenVeri.il, Lat: kaydedilenVeri.enlem, Lon: kaydedilenVeri.boylam }, popupTemplate: tesisPopupSablonu }); tesislerKatmani.add(pointGraphic); tesisFormKutusu.style.display = "none"; document.getElementById("tAdi").value = ""; }); });
    fetch('/api/tesis?' + new Date().getTime()).then(res => res.json()).then(kayitliTesisler => { kayitliTesisler.forEach(tesis => { if (!tesis.enlem || !tesis.boylam) return; let sRengi; switch (tesis.tesisTuru) { case "HES": sRengi = [0, 112, 255]; break; case "GES": sRengi = [255, 204, 0]; break; case "RES": sRengi = [50, 205, 50]; break; case "Termik": sRengi = [105, 105, 105]; break; default: sRengi = [255, 0, 0]; } const pointGraphic = new Graphic({ geometry: { type: "point", longitude: tesis.boylam, latitude: tesis.enlem }, symbol: { type: "simple-marker", color: sRengi, outline: { color: [255, 255, 255], width: 1.5 }, size: "14px" }, attributes: { Id: tesis.id, Name: tesis.tesisAdi, Type: tesis.tesisTuru, City: tesis.il, Lat: tesis.enlem, Lon: tesis.boylam }, popupTemplate: tesisPopupSablonu }); tesislerKatmani.add(pointGraphic); }); });

    // --- UI YERLEŞİMİ DÜZENİ ---
    const uiAraclariSol = [fullscreen, homeWidget, basemapExpand, layerListExpand, tesisEkleBtn, analizBtn, poligonBtn, toggleButton];
    const uiAraclariSag = [sorguExpand]; // Arama kutusu sağ üstte
    const uiAraclariSag3D = [weatherExpand, daylightExpand]; // 3D araçları sağ üstte

    activeView.ui.add(uiAraclariSol, "top-left");
    activeView.ui.add(uiAraclariSag, "top-right");
    activeView.ui.add(uiAraclariSag3D, "top-right");

    toggleButton.addEventListener("click", function () {
        const isCurrently3D = activeView.type === "3d"; const currentViewpoint = activeView.viewpoint.clone();
        if (pointerEvt) { pointerEvt.remove(); } if (ilHighlightHandle) { ilHighlightHandle.remove(); ilHighlightHandle = null; }

        activeView.container = null; activeView = isCurrently3D ? view2D : view3D; activeView.viewpoint = currentViewpoint; activeView.container = "viewDiv";
        sketchVM.view = activeView;

        [fullscreen, homeWidget, basemapExpand.content, layerListExpand.content].forEach(w => w.view = activeView);
        [basemapExpand, layerListExpand, sorguExpand].forEach(e => e.view = activeView);

        if (activeView.type === "3d") {
            weatherExpand.content.view = activeView; daylightExpand.content.view = activeView;
            weatherExpand.view = activeView; daylightExpand.view = activeView;
            activeView.ui.add(uiAraclariSol, "top-left");
            activeView.ui.add(uiAraclariSag, "top-right");
            activeView.ui.add(uiAraclariSag3D, "top-right");
        } else {
            activeView.ui.add(uiAraclariSol, "top-left");
            activeView.ui.add(uiAraclariSag, "top-right");
        }

        const suankiTur = activeView.type === "3d" ? "3D" : "2D"; const hedefTur = suankiTur === "3D" ? "2D" : "3D";
        toggleButton.innerHTML = hedefTur; toggleButton.title = hedefTur + " Görünüme Geç";
        pointerEvt = activeView.on("pointer-move", updateCoords);
    });

    // --- MEVCUT PARSELLERİ ÇİZME ---
    // --- MEVCUT PARSELLERİ ÇİZME ---
    function parselleriYukle() {
        fetch('/api/parsel').then(res => res.json()).then(data => {
            data.forEach(parsel => {
                const polygonGeometry = { type: "polygon", rings: [parsel.koordinatlar], spatialReference: { wkid: 4326 } };
                const fillSymbol = { type: "simple-fill", color: [51, 51, 204, 0.4], outline: { color: [255, 255, 255], width: 1 } };
                const popupTemplate = {
                    title: "Tapu Parsel Bilgisi",
                    content: function () {
                        return fetch(`/api/parsel/${parsel.id}/tesisler`).then(res => res.json()).then(tesisler => {

                            
                            let html = `<b>Sistem ID:</b> ${parsel.id} <br>
                                    <b>İl:</b> ${parsel.il} <br>
                                    <b>İlçe:</b> ${parsel.ilce} <br>
                                    <b>Ada No:</b> ${parsel.adaNo} <br>
                                    <b>Parsel No:</b> ${parsel.parselNo} <br>
                                    <hr><b>Parsel İçindeki Tesisler:</b><br>`;

                            if (tesisler.length === 0) { html += "<i>Bu parsel sınırları içinde tesis bulunamadı.</i>"; } else { html += "<ul>"; tesisler.forEach(t => { html += `<li>${t.tesisAdi}</li>`; }); html += "</ul>"; } return html;
                        });
                    }
                };
                const parselGraphic = new Graphic({ geometry: polygonGeometry, symbol: fillSymbol, attributes: parsel, popupTemplate: popupTemplate });
                parsellerKatmani.add(parselGraphic);
            });
        }).catch(err => console.error("Parseller yüklenirken hata:", err));
    }
    parselleriYukle();
});