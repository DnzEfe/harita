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
    "esri/core/reactiveUtils",
    "esri/rest/route",
    "esri/rest/support/RouteParameters",
    "esri/rest/support/FeatureSet",
    "esri/geometry/Circle" // YENİ: Analiz çemberi için
], function (esriConfig, Map, MapView, SceneView, Graphic, GraphicsLayer, Fullscreen, BasemapGallery, Expand, Basemap, Home, GeoJSONLayer, LayerList, TileLayer, reactiveUtils, route, RouteParameters, FeatureSet, Circle) {

    // ArcGIS API Key (Rota çizimi için gereklidir, developers.arcgis.com'dan alınabilir)
    esriConfig.apiKey = "AAPK_BURAYA_KENDI_API_ANAHTARINI_YAZABILIRSIN";

    // --- HARİTA VE KATMAN KURULUMU ---
    const map = new Map({ basemap: "satellite", ground: "world-elevation" });

    const ilSinirlariLayer = new GeoJSONLayer({
        url: "/js/iller.json", // Kendi il sınırları dosyanın yolu
        spatialReference: { wkid:    4326 },
        renderer: { type: "simple", symbol: { type: "simple-fill", color: [0, 0, 0, 0], outline: { color: [255, 204, 0, 1], width: 1.5 } } },
        title: "Türkiye İl Sınırları"
    });

    const ulasimLayer = new TileLayer({ url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer", title: "Otobanlar", visible: false });
    const tesislerKatmani = new GraphicsLayer({ title: "Enerji Tesisleri" });
    const rotaKatmani = new GraphicsLayer({ title: "Bakım Rotası" });
    const analizKatmani = new GraphicsLayer({ title: "50km Analiz Çemberi" }); // YENİ: Analiz Katmanı

    map.addMany([ulasimLayer, ilSinirlariLayer, tesislerKatmani, rotaKatmani, analizKatmani]);

    const baslangicAyarlari = { map: map, center: [35.2433, 38.9637], zoom: 6 };
    const view2D = new MapView(baslangicAyarlari);
    const view3D = new SceneView({ ...baslangicAyarlari, qualityProfile: "high" });

    let activeView = view3D;
    activeView.container = "viewDiv";

    // --- ARAYÜZ (UI) ARAÇLARI ---
    const toggleButton = document.createElement("div");
    toggleButton.className = "esri-widget esri-widget--button esri-interactive";
    toggleButton.innerHTML = "3D"; toggleButton.style.fontWeight = "bold";

    const fullscreen = new Fullscreen({ view: activeView });
    const homeWidget = new Home({ view: activeView });
    const basemapExpand = new Expand({ view: activeView, content: new BasemapGallery({ view: activeView, source: [Basemap.fromId("satellite"), Basemap.fromId("hybrid"), Basemap.fromId("topo-vector")] }), expandIconClass: "esri-icon-basemap" });
    const layerListExpand = new Expand({ view: activeView, content: new LayerList({ view: activeView }), expandIconClass: "esri-icon-layers" });

    // --- ÖZEL FONKSİYON BUTONLARI ---
    const tesisEkleBtn = document.createElement("div");
    tesisEkleBtn.className = "esri-widget esri-widget--button esri-interactive"; tesisEkleBtn.title = "Haritaya Tesis Ekle"; tesisEkleBtn.innerHTML = '<span class="esri-icon-plus"></span>';

    const rotaBtn = document.createElement("div");
    rotaBtn.className = "esri-widget esri-widget--button esri-interactive"; rotaBtn.title = "İki Tesis Arası Rota Çiz"; rotaBtn.innerHTML = '<span class="esri-icon-routing"></span>';

    const analizBtn = document.createElement("div"); // YENİ: Analiz Butonu
    analizBtn.className = "esri-widget esri-widget--button esri-interactive"; analizBtn.title = "50 km Çapındaki Tesisleri Bul"; analizBtn.innerHTML = '<span class="esri-icon-dial"></span>';

    // --- HTML FORMLARI (DTO Güvenliğine Göre Kurulu Güç Çıkarıldı) ---
    const formHtml = `
    <div id="tesisFormKutusu" style="display:none; position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); background:white; padding:20px; z-index:99; box-shadow:0 4px 15px rgba(0,0,0,0.3); border-radius:8px; width: 300px; font-family: sans-serif;">
        <h3 style="margin-top:0; color:#0079c1;">Yeni Tesis Ekle</h3>
        <label>Tesis Adı:</label><br><input type="text" id="tAdi" style="width:100%; margin-bottom:10px; padding:5px;"><br>
        <label>Tesis Türü:</label><br><select id="tTuru" style="width:100%; margin-bottom:10px; padding:5px;"><option value="HES">HES</option><option value="GES">GES</option><option value="RES">RES</option><option value="Termik">Termik</option></select><br>
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
        <label>İl:</label><br><input type="text" id="eIl" readonly style="width:100%; margin-bottom:10px; padding:5px; background:#f0f0f0;"><br>
        <label>Enlem:</label><br><input type="text" id="eEnlem" readonly style="width:100%; margin-bottom:10px; padding:5px; background:#f0f0f0;"><br>
        <label>Boylam:</label><br><input type="text" id="eBoylam" readonly style="width:100%; margin-bottom:15px; padding:5px; background:#f0f0f0;"><br>
        <button id="btnGuncelle" style="width:100%; padding:10px; background:#28a745; color:white; border:none; cursor:pointer; font-weight:bold; border-radius:4px;">Güncelle</button>
        <button id="btnEditIptal" style="width:100%; padding:10px; background:#ccc; color:black; border:none; cursor:pointer; font-weight:bold; margin-top:8px; border-radius:4px;">İptal</button>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', formHtml + editFormHtml);
    const tesisFormKutusu = document.getElementById("tesisFormKutusu");
    const editFormKutusu = document.getElementById("editFormKutusu");

    // Uygulama Durumları (State)
    let tesisEklemeModu = false;
    let rotaModu = false;
    let analizModu = false;
    let rotaDuraklari = [];

    // --- BUTON TIKLAMA YÖNETİMİ ---
    function modlariSifirla() {
        tesisEklemeModu = false; rotaModu = false; analizModu = false;
        tesisEkleBtn.style.backgroundColor = ""; rotaBtn.style.backgroundColor = ""; analizBtn.style.backgroundColor = "";
        document.body.style.cursor = "default";
        rotaDuraklari = [];
        rotaKatmani.removeAll();
        analizKatmani.removeAll();
        tesislerKatmani.graphics.forEach(g => g.visible = true); // Gizlenenleri geri getir
    }

    tesisEkleBtn.addEventListener("click", () => {
        const aktifMi = tesisEklemeModu; modlariSifirla();
        if (!aktifMi) { tesisEklemeModu = true; tesisEkleBtn.style.backgroundColor = "#e2f1fb"; document.body.style.cursor = "crosshair"; }
    });

    rotaBtn.addEventListener("click", () => {
        const aktifMi = rotaModu; modlariSifirla();
        if (!aktifMi) { rotaModu = true; rotaBtn.style.backgroundColor = "#e2f1fb"; document.body.style.cursor = "pointer"; alert("Rota: Haritadaki birinci ve ikinci tesise tıklayın."); }
    });

    analizBtn.addEventListener("click", () => {
        const aktifMi = analizModu; modlariSifirla();
        if (!aktifMi) { analizModu = true; analizBtn.style.backgroundColor = "#e2f1fb"; document.body.style.cursor = "crosshair"; }
    });

    document.getElementById("btnIptal").addEventListener("click", () => { tesisFormKutusu.style.display = "none"; });
    document.getElementById("btnEditIptal").addEventListener("click", () => { editFormKutusu.style.display = "none"; });

    // --- POPUP VE AKSİYONLAR ---
    const tesisPopupSablonu = {
        title: "⚡ {Name}",
        content: `
            <div class="ozel-popup-icerik">
                <div class="popup-satir"><span class="popup-etiket">⚙️ Tesis Türü</span><span class="rozet rozet-{Type}">{Type}</span></div>
                <div class="popup-satir"><span class="popup-etiket">📍 İl</span><span class="popup-deger">{City}</span></div>
                <div class="popup-satir"><span class="popup-etiket">🧭 Koordinat</span><span class="popup-deger" style="font-size:12px; color:#94a3b8; font-weight:500;">{Lat}, {Lon}</span></div>
            </div>
        `,
        actions: [
            { title: "Düzenle", id: "edit-tesis", className: "esri-icon-edit" },
            { title: "Tesisi Sil", id: "delete-tesis", className: "esri-icon-trash" }
        ]
    };

    function handlePopupAction(event) {
        const seciliGrafik = activeView.popup.selectedFeature;
        const dbId = seciliGrafik.attributes.Id;
        if (event.action.id === "delete-tesis") {
            if (confirm("Silmek istediğinize emin misiniz?")) {
                fetch('/api/tesis/' + dbId, { method: 'DELETE' }).then(res => {
                    if (res.ok) { tesislerKatmani.remove(seciliGrafik); activeView.popup.close(); }
                });
            }
        } else if (event.action.id === "edit-tesis") {
            document.getElementById("eId").value = dbId;
            document.getElementById("eAdi").value = seciliGrafik.attributes.Name;
            document.getElementById("eTuru").value = seciliGrafik.attributes.Type;
            document.getElementById("eIl").value = seciliGrafik.attributes.City;
            document.getElementById("eEnlem").value = seciliGrafik.attributes.Lat;
            document.getElementById("eBoylam").value = seciliGrafik.attributes.Lon;
            editFormKutusu.style.display = "block"; activeView.popup.close();
        }
    }

    reactiveUtils.on(() => view2D.popup, "trigger-action", handlePopupAction);
    reactiveUtils.on(() => view3D.popup, "trigger-action", handlePopupAction);

    // --- HARİTAYA TIKLAMA OLAYI (CLEAN CODE - ERKEN ÇIKIŞ) ---
    function handleMapClick(event) {

        // 1. DURUM: Tesis Ekleme Modu
        if (tesisEklemeModu) {
            document.getElementById("tEnlem").value = event.mapPoint.latitude.toFixed(6);
            document.getElementById("tBoylam").value = event.mapPoint.longitude.toFixed(6);
            document.getElementById("tIl").value = "Hesaplanıyor...";

            const query = ilSinirlariLayer.createQuery(); query.geometry = event.mapPoint; query.spatialRelationship = "intersects"; query.outFields = ["name"];
            ilSinirlariLayer.queryFeatures(query).then(function (response) {
                document.getElementById("tIl").value = response.features.length > 0 ? response.features[0].attributes.name : "Sınır Dışı";
                tesisFormKutusu.style.display = "block";
                modlariSifirla(); // İşlem bitince formu açık bırak, modları kapat
            });
            return;
        }

        // 2. DURUM: Rota Çizme Modu
        if (rotaModu) {
            activeView.hitTest(event).then(function (response) {
                const tesisSonuclari = response.results.filter(result => result.graphic.layer === tesislerKatmani);
                if (tesisSonuclari.length > 0) {
                    const tiklananTesis = tesisSonuclari[0].graphic;
                    rotaDuraklari.push(tiklananTesis);

                    const durakIsareti = new Graphic({ geometry: tiklananTesis.geometry, symbol: { type: "simple-marker", style: "cross", color: "red", size: "18px", outline: { color: "white", width: 2 } } });
                    rotaKatmani.add(durakIsareti);

                    if (rotaDuraklari.length === 2) {
                        rotaHesapla(rotaDuraklari[0], rotaDuraklari[1]);
                        modlariSifirla();
                    }
                }
            });
            return;
        }

        // 3. DURUM: Mekansal Analiz (50km) Modu
        // 3. DURUM: Mekansal Analiz Modu
        // 3. DURUM: Mekansal Analiz Modu
        if (analizModu) {
            const lat = event.mapPoint.latitude;
            const lon = event.mapPoint.longitude;

            const girilenDeger = prompt("Hedef noktayı seçtiniz.\nKaç kilometrelik yarıçap içinde arama yapmak istiyorsunuz?", "50");

            if (girilenDeger === null || girilenDeger.trim() === "") {
                return;
            }

            const yariCapKm = parseFloat(girilenDeger);

            if (isNaN(yariCapKm) || yariCapKm <= 0) {
                alert("Hata: Lütfen sıfırdan büyük, geçerli bir kilometre değeri giriniz!");
                return;
            }

            analizKatmani.removeAll();

            const cemberGeometrisi = new Circle({ center: [lon, lat], radius: yariCapKm, radiusUnit: "kilometers" });
            const cemberGrafigi = new Graphic({ geometry: cemberGeometrisi, symbol: { type: "simple-fill", color: [0, 112, 255, 0.2], outline: { color: [0, 112, 255, 0.8], width: 2 } } });
            analizKatmani.add(cemberGrafigi);

            fetch(`/api/tesis/analiz/yakindakiler?enlem=${lat}&boylam=${lon}&mesafeKm=${yariCapKm}`)
                .then(res => res.json())
                .then(bulunanTesisler => {
                    const bulunanIdler = bulunanTesisler.map(t => t.id);

                    // Sadece çember içindekileri görünür yapıyoruz
                    tesislerKatmani.graphics.forEach(g => {
                        g.visible = bulunanIdler.includes(g.attributes.Id);
                    });

                    // --- YENİ: ALERT YERİNE ŞIK BİR HTML POPUP OLUŞTURUYORUZ ---
                    let popupIcerik = `
                        <div style="font-family: sans-serif; padding: 5px;">
                            <p style="margin-top:0; font-size:14px; color:#0079c1; font-weight:bold;">
                                📍 Bu alanda toplam <b>${bulunanTesisler.length}</b> adet tesis bulundu.
                            </p>
                            <hr style="border:0; border-top:1px solid #eee; margin:10px 0;">
                    `;

                    // Eğer tesis bulunduysa, bunları alt alta listeleyen bir HTML döngüsü kuruyoruz
                    if (bulunanTesisler.length > 0) {
                        // max-height ve overflow-y sayesinde liste çok uzunsa kaydırma çubuğu (scroll) çıkar
                        popupIcerik += `<ul style="list-style:none; padding:0; margin:0; max-height: 200px; overflow-y: auto;">`;

                        bulunanTesisler.forEach(t => {
                            popupIcerik += `
                                <li style="padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                                    <span style="font-size:12px;">⚡</span> <b>${t.tesisAdi}</b> 
                                    <span style="color:#666; font-size:12px; float:right;">${t.tesisTuru} - ${t.il}</span>
                                </li>
                            `;
                        });

                        popupIcerik += `</ul>`;
                    }

                    popupIcerik += `</div>`;

                    // Hazırladığımız bu HTML arayüzünü tam tıklanılan noktada (event.mapPoint) açıyoruz
                    activeView.popup.open({
                        title: `🎯 ${yariCapKm} km Yarıçaplı Analiz`,
                        content: popupIcerik,
                        location: event.mapPoint
                    });
                })
                .catch(err => console.error("Analiz Hatası:", err));

            return;
        }
    }
    view2D.on("click", handleMapClick); view3D.on("click", handleMapClick);

    // --- ROTA HESAPLAMA (ArcGIS Routing) ---
    function rotaHesapla(baslangic, bitis) {
        const routeUrl = "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World";
        const routeParams = new RouteParameters({
            stops: new FeatureSet({ features: [new Graphic({ geometry: baslangic.geometry }), new Graphic({ geometry: bitis.geometry })] }),
            returnDirections: true, directionsLanguage: "tr"
        });

        route.solve(routeUrl, routeParams).then(function (data) {
            if (data.routeResults.length > 0) {
                const rotaSonucu = data.routeResults[0].route;
                rotaSonucu.symbol = { type: "simple-line", color: [0, 121, 193, 0.8], width: 5, style: "solid" };
                rotaKatmani.add(rotaSonucu);
                alert(`🚗 Rota Çizildi!\nMesafe: ${data.routeResults[0].route.attributes.Total_Kilometers.toFixed(2)} km.`);
            }
        }).catch(function (error) { console.error("Rota Hatası: ", error); alert("Rota hesaplanamadı! Geçerli bir ArcGIS API Key girilmemiş olabilir."); });
    }

    // --- VERİ ÇEKME, KAYDETME VE GÜNCELLEME (CRUD) İŞLEMLERİ ---
    document.getElementById("btnGuncelle").addEventListener("click", () => {
        const gId = document.getElementById("eId").value;
        const gTesis = { id: parseInt(gId), tesisAdi: document.getElementById("eAdi").value, tesisTuru: document.getElementById("eTuru").value, il: document.getElementById("eIl").value, enlem: parseFloat(document.getElementById("eEnlem").value), boylam: parseFloat(document.getElementById("eBoylam").value) };
        fetch('/api/tesis/' + gId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(gTesis) }).then(res => {
            if (res.ok) {
                tesislerKatmani.graphics.forEach(g => {
                    if (g.attributes.Id == gId) {
                        g.attributes.Name = gTesis.tesisAdi; g.attributes.Type = gTesis.tesisTuru;
                        let sRengi; switch (gTesis.tesisTuru) { case "HES": sRengi = [0, 112, 255]; break; case "GES": sRengi = [255, 204, 0]; break; case "RES": sRengi = [50, 205, 50]; break; case "Termik": sRengi = [105, 105, 105]; break; default: sRengi = [255, 0, 0]; }
                        const yeniGrafik = g.clone(); yeniGrafik.symbol = { type: "simple-marker", color: sRengi, outline: { color: [255, 255, 255], width: 1.5 }, size: "14px" };
                        tesislerKatmani.remove(g); tesislerKatmani.add(yeniGrafik);
                    }
                });
                editFormKutusu.style.display = "none";
            }
        });
    });

    document.getElementById("btnKaydet").addEventListener("click", () => {
        const yeniTesis = { tesisAdi: document.getElementById("tAdi").value, tesisTuru: document.getElementById("tTuru").value, il: document.getElementById("tIl").value, enlem: parseFloat(document.getElementById("tEnlem").value), boylam: parseFloat(document.getElementById("tBoylam").value) };
        fetch('/api/tesis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(yeniTesis) }).then(res => res.json()).then(kaydedilenVeri => {
            let sRengi; switch (yeniTesis.tesisTuru) { case "HES": sRengi = [0, 112, 255]; break; case "GES": sRengi = [255, 204, 0]; break; case "RES": sRengi = [50, 205, 50]; break; case "Termik": sRengi = [105, 105, 105]; break; default: sRengi = [255, 0, 0]; }
            const pointGraphic = new Graphic({ geometry: { type: "point", longitude: kaydedilenVeri.boylam, latitude: kaydedilenVeri.enlem }, symbol: { type: "simple-marker", color: sRengi, outline: { color: [255, 255, 255], width: 1.5 }, size: "14px" }, attributes: { Id: kaydedilenVeri.id, Name: kaydedilenVeri.tesisAdi, Type: kaydedilenVeri.tesisTuru, City: kaydedilenVeri.il, Lat: kaydedilenVeri.enlem, Lon: kaydedilenVeri.boylam }, popupTemplate: tesisPopupSablonu });
            tesislerKatmani.add(pointGraphic); tesisFormKutusu.style.display = "none"; document.getElementById("tAdi").value = "";
        });
    });

    // Açılışta Tesisleri Getir
    fetch('/api/tesis?' + new Date().getTime()).then(res => res.json()).then(kayitliTesisler => {
        kayitliTesisler.forEach(tesis => {
            if (!tesis.enlem || !tesis.boylam) return;
            let sRengi; switch (tesis.tesisTuru) { case "HES": sRengi = [0, 112, 255]; break; case "GES": sRengi = [255, 204, 0]; break; case "RES": sRengi = [50, 205, 50]; break; case "Termik": sRengi = [105, 105, 105]; break; default: sRengi = [255, 0, 0]; }
            const pointGraphic = new Graphic({ geometry: { type: "point", longitude: tesis.boylam, latitude: tesis.enlem }, symbol: { type: "simple-marker", color: sRengi, outline: { color: [255, 255, 255], width: 1.5 }, size: "14px" }, attributes: { Id: tesis.id, Name: tesis.tesisAdi, Type: tesis.tesisTuru, City: tesis.il, Lat: tesis.enlem, Lon: tesis.boylam }, popupTemplate: tesisPopupSablonu });
            tesislerKatmani.add(pointGraphic);
        });
    });

    // --- GÖRÜNÜM GEÇİŞİ (2D/3D) VE MENÜ EKLENTİLERİ ---
    activeView.ui.add([fullscreen, homeWidget, basemapExpand, layerListExpand, tesisEkleBtn, rotaBtn, analizBtn, toggleButton], "top-left");
    toggleButton.addEventListener("click", function () {
        const isCurrently3D = activeView.type === "3d"; const currentViewpoint = activeView.viewpoint.clone();
        activeView.container = null; activeView = isCurrently3D ? view2D : view3D; activeView.viewpoint = currentViewpoint; activeView.container = "viewDiv";
        [fullscreen, homeWidget, basemapExpand.content, layerListExpand.content].forEach(w => w.view = activeView);[basemapExpand, layerListExpand].forEach(e => e.view = activeView);
        activeView.ui.add([fullscreen, homeWidget, basemapExpand, layerListExpand, tesisEkleBtn, rotaBtn, analizBtn, toggleButton], "top-left");
    });
});