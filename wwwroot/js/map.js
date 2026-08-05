require([
    "esri/Map",
    "esri/views/MapView",
    "esri/Graphic",
    "esri/layers/GraphicsLayer"
], function (Map, MapView, Graphic, GraphicsLayer) {

    const map = new Map({
        basemap: "satellite"
    });

    const view = new MapView({
        container: "viewDiv",
        map: map,
        center: [35.2433, 38.9637],
        zoom: 6
    });

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

    view.on("pointer-move", function (event) {
        const point = view.toMap({ x: event.x, y: event.y });
        if (point) {
            document.getElementById("coordDiv").innerText =
                "Lon: " + point.longitude.toFixed(4) + " | Lat: " + point.latitude.toFixed(4);
        }
    });
});
//ata