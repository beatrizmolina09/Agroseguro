// Envolvemos todo el código en una función autoejecutable (IIFE)
// para evitar contaminar el scope global.
(async function() {
    // --- 1. CONFIGURACIÓN INICIAL ---
    const MAP_CONFIG = {
        centro: [40.4167, -3.70325],
        zoom: 6,
        urlBase: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        atribucionBase: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        urlGeotiff: "mosaico_20251013_Rmax.tif"
    };

    const COLOR_RAMP = [
        { threshold: 84.0, color: [240, 240, 240] },
        { threshold: 78.0, color: [128, 0, 128] },
        { threshold: 72.0, color: [200, 0, 90] },
        { threshold: 66.0, color: [255, 0, 0] },
        { threshold: 60.0, color: [255, 127, 0] },
        { threshold: 54.0, color: [255, 187, 0] },
        { threshold: 48.0, color: [255, 255, 0] },
        { threshold: 42.0, color: [0, 255, 0] },
        { threshold: 36.0, color: [0, 192, 0] },
        { threshold: 30.0, color: [67, 131, 35] },
        { threshold: 24.0, color: [0, 252, 252] },
        { threshold: 18.0, color: [0, 148, 252] },
        { threshold: 12.0, color: [0, 0, 252] }
    ];

    // --- 2. INICIALIZACIÓN DEL MAPA ---
    const map = L.map('map').setView(MAP_CONFIG.centro, MAP_CONFIG.zoom);

    L.tileLayer(MAP_CONFIG.urlBase, { attribution: MAP_CONFIG.atribucionBase }).addTo(map);
    L.control.scale({ metric: true, imperial: false }).addTo(map);
    map.createPane('rasterPane');

    // --- 3. FUNCIÓN DE SIMBOLOGÍA ---
    function getColorForValue(value, noDataValue) {
        if (noDataValue !== undefined && value === noDataValue) {
            return null; // Transparente para valores NoData
        }

        for (const entry of COLOR_RAMP) {
            if (value >= entry.threshold) {
                const [r, g, b] = entry.color;
                return `rgba(${r}, ${g}, ${b}, 1)`;
            }
        }

        return null; // Transparente para valores por debajo de la rampa
    }

    // --- 4. CARGA Y VISUALIZACIÓN DEL GEOTIFF ---
    try {
        // Usamos async/await para un código más legible
        const response = await fetch(MAP_CONFIG.urlGeotiff);
        if (!response.ok) {
            throw new Error(`Error al descargar el GeoTIFF: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const georaster = await parseGeoraster(arrayBuffer);

        console.log("GeoRaster cargado:", georaster);

        const geoTiffLayer = new GeoRasterLayer({
            georaster: georaster,
            opacity: 1.0,
            resolution: 256,
            pane: 'rasterPane',
            pixelValuesToColorFn: (pixelValues) => {
                return getColorForValue(pixelValues[0], georaster.noDataValue);
            }
        });

        geoTiffLayer.addTo(map);
        map.fitBounds(geoTiffLayer.getBounds());

        // --- 5. INTERACTIVIDAD (EVENTO DE CLIC) ---
        map.on('click', function(e) {
            // getValues puede devolver undefined si se clica fuera del raster
            const values = georaster.getValues(e.latlng, null, 0);
            
            if (values) {
                const value = values[0];
                if (value !== undefined && value !== georaster.noDataValue) {
                    const formattedValue = parseFloat(value).toFixed(2);
                    L.popup()
                        .setLatLng(e.latlng)
                        .setContent(`<b>Valor:</b> ${formattedValue}`)
                        .openOn(map);
                }
            }
        });

    } catch (error) {
        console.error("Error al inicializar el mapa con GeoTIFF:", error);
        alert("No se pudo cargar la capa del mapa. Revisa la consola para más detalles.");
    }
})();