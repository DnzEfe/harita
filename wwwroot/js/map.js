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
    "esri/widgets/LayerList",
    "esri/layers/TileLayer",
    "esri/widgets/Weather",
    "esri/core/reactiveUtils"
], function (Map, MapView, SceneView, Graphic, GraphicsLayer, Fullscreen, BasemapGallery, Expand, Basemap, Search, DistanceMeasurement2D, DirectLineMeasurement3D, Daylight, Home, GeoJSONLayer, LayerList, TileLayer, Weather, reactiveUtils) {

    const map = new Map({ basemap: "satellite", ground: "world-elevation" });

    const geojsonUrl = "/js/iller.json";
    const ilSinirlariLayer = new GeoJSONLayer({
        url: geojsonUrl,
        spatialReference: { wkid: 4326 }, // Kaymayı önleyen sihirli ayar
        renderer: { type: "simple", symbol: { type: "simple-fill", color: [0, 0, 0, 0], outline: { color: [255, 204, 0, 1], width: 1.5 } } },
        title: "Türkiye İl Sınırları",
        popupTemplate: { title: "🌍 İl Sınırı", content: `<div style="padding:15px; text-align:center; border-radius:8px; background:linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);"><h2 style="margin:0; color:#2c3e50; font-size:22px; font-weight:bold;">{name}</h2></div>` }
    });

    const ulasimLayer = new TileLayer({ url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer", title: "Otobanlar", visible: false });
    const sehirlerLayer = new TileLayer({ url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer", title: "Şehirler", visible: false });

    const apiNoktalariLayer = new GraphicsLayer({ title: "API'den Gelen Şehirler" });
    const tesislerKatmani = new GraphicsLayer({ title: "Enerji Tesisleri" });

    map.addMany([sehirlerLayer, ulasimLayer, ilSinirlariLayer, apiNoktalariLayer, tesislerKatmani]);

    const baslangicAyarlari = { map: map, center: [35.2433, 38.9637], zoom: 6 };
    const view2D = new MapView(baslangicAyarlari);
    const view3D = new SceneView({ ...baslangicAyarlari, qualityProfile: "high", environment: { lighting: { type: "sun", date: new Date(), directShadowsEnabled: true } } });

    let activeView = view3D;
    activeView.container = "viewDiv";

    // --- UI ARAÇLARI ---
    const toggleButton = document.createElement("div");
    toggleButton.className = "esri-widget esri-widget--button esri-interactive";
    toggleButton.innerHTML = "3D"; toggleButton.style.fontWeight = "bold"; toggleButton.style.fontFamily = "sans-serif";

    const fullscreen = new Fullscreen({ view: activeView });
    const homeWidget = new Home({ view: activeView });
    const basemapExpand = new Expand({ view: activeView, content: new BasemapGallery({ view: activeView, source: [Basemap.fromId("satellite"), Basemap.fromId("hybrid"), Basemap.fromId("topo-vector")] }), expandIconClass: "esri-icon-basemap" });
    const searchExpand = new Expand({ view: activeView, content: new Search({ view: activeView }), expandIconClass: "esri-icon-search" });
    const layerListExpand = new Expand({ view: activeView, content: new LayerList({ view: activeView }), expandIconClass: "esri-icon-layers" });
    const measure2D = new DistanceMeasurement2D({ view: view2D }); const measureExpand2D = new Expand({ view: view2D, content: measure2D, expandIconClass: "esri-icon-measure-line" });
    const measure3D = new DirectLineMeasurement3D({ view: view3D }); const measureExpand3D = new Expand({ view: view3D, content: measure3D, expandIconClass: "esri-icon-measure-line" });
    const daylightExpand = new Expand({ view: view3D, content: new Daylight({ view: view3D, dateOrSeason: "season" }), expandIconClass: "esri-icon-lightbulb" });
    const weatherExpand = new Expand({ view: view3D, content: new Weather({ view: view3D }), expandIconClass: "esri-icon-cloudy" });

    // --- FORM HTML YAPILARI (EKLEME VE DÜZENLEME) ---
    const tesisEkleBtn = document.createElement("div");
    tesisEkleBtn.className = "esri-widget esri-widget--button esri-interactive";
    tesisEkleBtn.title = "Haritaya Tesis Ekle";
    tesisEkleBtn.innerHTML = '<span class="esri-icon-plus"></span>';

    const formHtml = `
    <div id="tesisFormKutusu" style="display:none; position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); background:white; padding:20px; z-index:99; box-shadow:0 4px 15px rgba(0,0,0,0.3); border-radius:8px; width: 300px; font-family: sans-serif;">
        <h3 style="margin-top:0; color:#0079c1;">Yeni Tesis Ekle</h3>
        <label>Tesis Adı:</label><br><input type="text" id="tAdi" style="width:100%; margin-bottom:10px; padding:5px;"><br>
        <label>Tesis Türü:</label><br><select id="tTuru" style="width:100%; margin-bottom:10px; padding:5px;"><option value="HES">HES</option><option value="GES">GES</option><option value="RES">RES</option><option value="Termik">Termik</option></select><br>
        <label>Kurulu Güç (MW):</label><br><input type="number" id="tGuc" style="width:100%; margin-bottom:10px; padding:5px;"><br>
        <label>İl (Otomatik):</label><br><input type="text" id="tIl" readonly style="width:100%; margin-bottom:10px; padding:5px; background:#f0f0f0;"><br>
        <label>Enlem:</label><br><input type="text" id="tEnlem" readonly style="width:100%; margin-bottom:10px; padding:5px; background:#f0f0f0;"><br>
        <label>Boylam:</label><br><input type="text" id="tBoylam" readonly style="width:100%; margin-bottom:15px; padding:5px; background:#f0f0f0;"><br>
        <button id="btnKaydet" style="width:100%; padding:10px; background:#0079c1; color:white; border:none; cursor:pointer; font-weight:bold; border-radius:4px;">Kaydet</button>
        <button id="btnIptal" style="width:100%; padding:10px; background:#ccc; color:black; border:none; cursor:pointer; font-weight:bold; margin-top:8px; border-radius:4px;">İptal</button>
    </div>`;

    const editFormHtml = `
    <div id="editFormKutusu" style="display:none; position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); background:white; padding:20px; z-index:99; box-shadow:0 4px 15px rgba(0,0,0,0.3); border-radius:8px; width: 300px; font-family: sans-serif;">
        <h3 style="margin-top:0; color:#28a745;">Tesisi Düzenle</h3>
        <input type="hidden" id="eId">
        <label>Tesis Adı:</label><br><input type="text" id="eAdi" style="width:100%; margin-bottom:10px; padding:5px;"><br>
        <label>Tesis Türü:</label><br><select id="eTuru" style="width:100%; margin-bottom:10px; padding:5px;"><option value="HES">HES</option><option value="GES">GES</option><option value="RES">RES</option><option value="Termik">Termik</option></select><br>
        <label>Kurulu Güç (MW):</label><br><input type="number" id="eGuc" style="width:100%; margin-bottom:10px; padding:5px;"><br>
        <label>İl:</label><br><input type="text" id="eIl" readonly style="width:100%; margin-bottom:10px; padding:5px; background:#f0f0f0;"><br>
        <label>Enlem:</label><br><input type="text" id="eEnlem" readonly style="width:100%; margin-bottom:10px; padding:5px; background:#f0f0f0;"><br>
        <label>Boylam:</label><br><input type="text" id="eBoylam" readonly style="width:100%; margin-bottom:15px; padding:5px; background:#f0f0f0;"><br>
        <button id="btnGuncelle" style="width:100%; padding:10px; background:#28a745; color:white; border:none; cursor:pointer; font-weight:bold; border-radius:4px;">Güncelle</button>
        <button id="btnEditIptal" style="width:100%; padding:10px; background:#ccc; color:black; border:none; cursor:pointer; font-weight:bold; margin-top:8px; border-radius:4px;">İptal</button>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', formHtml + editFormHtml);

    const tesisFormKutusu = document.getElementById("tesisFormKutusu");
    const editFormKutusu = document.getElementById("editFormKutusu");
    let tesisEklemeModu = false;

    tesisEkleBtn.addEventListener("click", () => {
        tesisEklemeModu = !tesisEklemeModu;
        tesisEkleBtn.style.backgroundColor = tesisEklemeModu ? "#e2f1fb" : "";
        document.body.style.cursor = tesisEklemeModu ? "crosshair" : "default";
    });

    document.getElementById("btnIptal").addEventListener("click", () => { tesisFormKutusu.style.display = "none"; });
    document.getElementById("btnEditIptal").addEventListener("click", () => { editFormKutusu.style.display = "none"; });

    // --- TEMİZ VE ESTETİK POPUP ŞABLONU (Index.cshtml içindeki CSS'i kullanır) ---
    const tesisPopupSablonu = {
        title: "⚡ {Name}",
        content: `
            <div class="ozel-popup-icerik">
                <div class="popup-satir">
                    <span class="popup-etiket">⚙️ Tesis Türü</span>
                    <span class="rozet rozet-{Type}">{Type}</span>
                </div>
                <div class="popup-satir">
                    <span class="popup-etiket">🔋 Kurulu Güç</span>
                    <span class="popup-deger">{Power} MW</span>
                </div>
                <div class="popup-satir">
                    <span class="popup-etiket">📍 İl</span>
                    <span class="popup-deger">{City}</span>
                </div>
                <div class="popup-satir">
                    <span class="popup-etiket">🧭 Koordinat</span>
                    <span class="popup-deger" style="font-size:12px; color:#94a3b8; font-weight:500;">{Lat}, {Lon}</span>
                </div>
            </div>
        `,
        actions: [
            { title: "Düzenle", id: "edit-tesis", className: "esri-icon-edit" },
            { title: "Tesisi Sil", id: "delete-tesis", className: "esri-icon-trash" }
        ]
    };

    // --- POPUP AKSİYONLARI (SİLME VE DÜZENLEME) ---
    function handlePopupAction(event) {
        const seciliGrafik = activeView.popup.selectedFeature;
        const dbId = seciliGrafik.attributes.Id;

        if (event.action.id === "delete-tesis") {
            if (confirm("Bu tesisi kalıcı olarak silmek istediğinize emin misiniz?")) {
                fetch('/api/tesis/' + dbId, { method: 'DELETE' }).then(res => {
                    if (res.ok) { tesislerKatmani.remove(seciliGrafik); activeView.popup.close(); }
                    else alert("Silme işlemi başarısız oldu.");
                }).catch(err => console.error("Silme hatası:", err));
            }
        }
        else if (event.action.id === "edit-tesis") {
            document.getElementById("eId").value = dbId;
            document.getElementById("eAdi").value = seciliGrafik.attributes.Name;
            document.getElementById("eTuru").value = seciliGrafik.attributes.Type;
            document.getElementById("eGuc").value = seciliGrafik.attributes.Power;
            document.getElementById("eIl").value = seciliGrafik.attributes.City;
            document.getElementById("eEnlem").value = seciliGrafik.attributes.Lat;
            document.getElementById("eBoylam").value = seciliGrafik.attributes.Lon;

            editFormKutusu.style.display = "block";
            activeView.popup.close();
        }
    }

    reactiveUtils.on(() => view2D.popup, "trigger-action", handlePopupAction);
    reactiveUtils.on(() => view3D.popup, "trigger-action", handlePopupAction);

    // --- TESİS GÜNCELLEME (PUT) ---
    document.getElementById("btnGuncelle").addEventListener("click", () => {
        const guncellenecekId = document.getElementById("eId").value;
        const guncelTesis = {
            id: parseInt(guncellenecekId),
            tesisAdi: document.getElementById("eAdi").value,
            tesisTuru: document.getElementById("eTuru").value,
            kuruluGuc: parseFloat(document.getElementById("eGuc").value) || 0,
            il: document.getElementById("eIl").value,
            enlem: parseFloat(document.getElementById("eEnlem").value),
            boylam: parseFloat(document.getElementById("eBoylam").value)
        };

        fetch('/api/tesis/' + guncellenecekId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(guncelTesis) })
            .then(res => {
                if (res.ok) {
                    tesislerKatmani.graphics.forEach(g => {
                        if (g.attributes.Id == guncellenecekId) {
                            g.attributes.Name = guncelTesis.tesisAdi; g.attributes.Type = guncelTesis.tesisTuru; g.attributes.Power = guncelTesis.kuruluGuc;
                            let sembolRengi;
                            switch (guncelTesis.tesisTuru) { case "HES": sembolRengi = [0, 112, 255]; break; case "GES": sembolRengi = [255, 204, 0]; break; case "RES": sembolRengi = [50, 205, 50]; break; case "Termik": sembolRengi = [105, 105, 105]; break; default: sembolRengi = [255, 0, 0]; }
                            const yeniGrafik = g.clone();
                            yeniGrafik.symbol = { type: "simple-marker", color: sembolRengi, outline: { color: [255, 255, 255], width: 1.5 }, size: "14px" };
                            tesislerKatmani.remove(g); tesislerKatmani.add(yeniGrafik);
                        }
                    });
                    editFormKutusu.style.display = "none";
                } else alert("Güncelleme başarısız oldu.");
            }).catch(err => console.error("Güncelleme hatası:", err));
    });

    // --- TESİS KAYDETME (POST) ---
    document.getElementById("btnKaydet").addEventListener("click", () => {
        const yeniTesis = { tesisAdi: document.getElementById("tAdi").value, tesisTuru: document.getElementById("tTuru").value, kuruluGuc: parseFloat(document.getElementById("tGuc").value) || 0, il: document.getElementById("tIl").value, enlem: parseFloat(document.getElementById("tEnlem").value), boylam: parseFloat(document.getElementById("tBoylam").value) };
        fetch('/api/tesis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(yeniTesis) })
            .then(res => res.json()).then(responseObj => {
                const kaydedilenVeri = responseObj.data || responseObj;
                let sembolRengi;
                switch (yeniTesis.tesisTuru) { case "HES": sembolRengi = [0, 112, 255]; break; case "GES": sembolRengi = [255, 204, 0]; break; case "RES": sembolRengi = [50, 205, 50]; break; case "Termik": sembolRengi = [105, 105, 105]; break; default: sembolRengi = [255, 0, 0]; }
                const pointGraphic = new Graphic({
                    geometry: { type: "point", longitude: kaydedilenVeri.boylam, latitude: kaydedilenVeri.enlem },
                    symbol: { type: "simple-marker", color: sembolRengi, outline: { color: [255, 255, 255], width: 1.5 }, size: "14px" },
                    attributes: { Id: kaydedilenVeri.id, Name: kaydedilenVeri.tesisAdi, Type: kaydedilenVeri.tesisTuru, Power: kaydedilenVeri.kuruluGuc, City: kaydedilenVeri.il, Lat: kaydedilenVeri.enlem, Lon: kaydedilenVeri.boylam },
                    popupTemplate: tesisPopupSablonu
                });
                tesislerKatmani.add(pointGraphic);
                tesisFormKutusu.style.display = "none";
                document.getElementById("tAdi").value = ""; document.getElementById("tGuc").value = "";
            });
    });

    // --- MENÜ DİZİLİMİ VE 2D/3D GEÇİŞİ ---
    activeView.ui.add([fullscreen, homeWidget, basemapExpand, layerListExpand, searchExpand, measureExpand3D, daylightExpand, weatherExpand, tesisEkleBtn, toggleButton], "top-left");
    toggleButton.addEventListener("click", function () {
        const isCurrently3D = activeView.type === "3d";
        const currentViewpoint = activeView.viewpoint.clone();
        activeView.container = null; activeView = isCurrently3D ? view2D : view3D;
        activeView.viewpoint = currentViewpoint; activeView.container = "viewDiv";
        [fullscreen, homeWidget, basemapExpand.content, searchExpand.content, layerListExpand.content].forEach(w => w.view = activeView);
        [basemapExpand, searchExpand, layerListExpand].forEach(e => e.view = activeView);
        if (activeView.type === "3d") activeView.ui.add([fullscreen, homeWidget, basemapExpand, layerListExpand, searchExpand, measureExpand3D, daylightExpand, weatherExpand, tesisEkleBtn, toggleButton], "top-left");
        else activeView.ui.add([fullscreen, homeWidget, basemapExpand, layerListExpand, searchExpand, measureExpand2D, tesisEkleBtn, toggleButton], "top-left");
    });

    // --- DB'DEN VERİ ÇEKME (GET) ---
    fetch('/api/tesis?' + new Date().getTime()).then(res => res.json()).then(kayitliTesisler => {
        kayitliTesisler.forEach(tesis => {
            const tId = tesis.id || tesis.Id; const tTuru = tesis.tesisTuru || tesis.TesisTuru; const tAdi = tesis.tesisAdi || tesis.TesisAdi; const tGuc = tesis.kuruluGuc || tesis.KuruluGuc; const tIl = tesis.il || tesis.Il; const tLat = tesis.enlem || tesis.Enlem; const tLon = tesis.boylam || tesis.Boylam;
            if (!tLat || !tLon) return;
            let sembolRengi;
            switch (tTuru) { case "HES": sembolRengi = [0, 112, 255]; break; case "GES": sembolRengi = [255, 204, 0]; break; case "RES": sembolRengi = [50, 205, 50]; break; case "Termik": sembolRengi = [105, 105, 105]; break; default: sembolRengi = [255, 0, 0]; }
            const pointGraphic = new Graphic({ geometry: { type: "point", longitude: tLon, latitude: tLat }, symbol: { type: "simple-marker", color: sembolRengi, outline: { color: [255, 255, 255], width: 1.5 }, size: "14px" }, attributes: { Id: tId, Name: tAdi, Type: tTuru, Power: tGuc, City: tIl, Lat: tLat, Lon: tLon }, popupTemplate: tesisPopupSablonu });
            tesislerKatmani.add(pointGraphic);
        });
    });

    // --- HARİTAYA TIKLAMA VE İL BULMA ---
    function handleMapClick(event) {
        if (!tesisEklemeModu) return;
        document.getElementById("tEnlem").value = event.mapPoint.latitude.toFixed(6);
        document.getElementById("tBoylam").value = event.mapPoint.longitude.toFixed(6);
        document.getElementById("tIl").value = "Hesaplanıyor...";

        const query = ilSinirlariLayer.createQuery(); query.geometry = event.mapPoint; query.spatialRelationship = "intersects"; query.outFields = ["name"];
        ilSinirlariLayer.queryFeatures(query).then(function (response) {
            document.getElementById("tIl").value = response.features.length > 0 ? response.features[0].attributes.name : "Deniz / Sınır Dışı";
            tesisFormKutusu.style.display = "block"; tesisEklemeModu = false; tesisEkleBtn.style.backgroundColor = ""; document.body.style.cursor = "default";
        }).catch(() => { document.getElementById("tIl").value = "Bilinmiyor"; tesisFormKutusu.style.display = "block"; });
    }
    view2D.on("click", handleMapClick); view3D.on("click", handleMapClick);

    // --- FARE HAREKETİ İLE ANLIK KOORDİNAT GÖSTERİMİ (EKSİK OLAN KISIM) ---
    function showCoords(event, view) {
        const point = view.toMap({ x: event.x, y: event.y });
        if (point) {
            const coordDiv = document.getElementById("coordDiv");
            if (coordDiv) {
                coordDiv.innerText = "Koordinat: " + point.latitude.toFixed(4) + " , " + point.longitude.toFixed(4);
            }
        }
    }
    view2D.on("pointer-move", (e) => showCoords(e, view2D));
    view3D.on("pointer-move", (e) => showCoords(e, view3D));

});