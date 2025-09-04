// Initialize the map
const map = L.map('map').setView([-33.68, -71.22], 13);

// Add a tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let allPoints = [];
const markers = L.layerGroup().addTo(map);

// Define a color palette
const colors = ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd', '#ccebc5', '#ffed6f'];

// Load and process KML data
fetch('Mapaterrtorios.kml')
    .then(response => response.text())
    .then(kmltext => {
        const parser = new DOMParser();
        const kml = parser.parseFromString(kmltext, 'text/xml');
        const geojson = toGeoJSON.kml(kml);

        // Build neighborhood graph
        const features = geojson.features;
        const neighbors = {};
        features.forEach((feature, i) => {
            neighbors[i] = [];
            for (let j = 0; j < features.length; j++) {
                if (i === j) continue;
                const otherFeature = features[j];
                if (turf.booleanIntersects(feature, otherFeature)) {
                    neighbors[i].push(j);
                }
            }
        });

        // Greedy coloring
        const featureColors = {};
        features.forEach((feature, i) => {
            const neighborColors = neighbors[i].map(neighborIndex => featureColors[neighborIndex]).filter(color => color);
            const availableColor = colors.find(color => !neighborColors.includes(color));
            featureColors[i] = availableColor || colors[0];
        });

        const territoryLayer = L.geoJSON(geojson, {
            style: function(feature) {
                const featureIndex = features.indexOf(feature);
                return {
                    color: featureColors[featureIndex],
                    weight: 2,
                    opacity: 0.7,
                    fillOpacity: 0.5
                };
            },
            onEachFeature: function(feature, layer) {
                if (feature.properties.name) {
                    layer.bindPopup(feature.properties.name);
                }
            }
        }).addTo(map);

        // Populate and sort filter dropdown
        const filter = document.getElementById('territorio-filter');
        const territoryNames = geojson.features.map(feature => parseInt(feature.properties.name, 10)).filter(name => !isNaN(name));
        const uniqueTerritoryNames = [...new Set(territoryNames)];
        uniqueTerritoryNames.sort((a, b) => a - b);

        uniqueTerritoryNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            filter.appendChild(option);
        });
    });

// Load and process CSV data
Papa.parse('https://docs.google.com/spreadsheets/d/e/2PACX-1vQzsGUUp_L0sCTUtFUR6dlVe3t6R2LzlWlA8BegK9__LqLFR8_UkG2N0y-H68FeQycZ3ykWXpItPasA/pub?output=csv', {
    download: true,
    header: true,
    dynamicTyping: false,
    complete: function(results) {
        allPoints = results.data.map(point => {
            return {
                ...point,
                latitud: parseFloat(point.latitud),
                longitud: parseFloat(point.longitud),
                Name: parseInt(point.Name, 10),
                Numb: point.Nº
            };
        });
        // No se llama a updateMapAndTable(allPoints) aquí.
    }
});

function updateMapAndTable(points) {
    markers.clearLayers();
    const tableBody = document.querySelector('#data-table tbody');
    tableBody.innerHTML = '';

    points.forEach(point => {
        if (point.latitud && point.longitud) {
            const number = point.Numb;
            const iconHtml = `<div class="marker-body">${number}</div><div class="marker-tail"></div>`;
            const numberIcon = L.divIcon({
                className: 'custom-marker',
                html: iconHtml,
                iconSize: [28, 40],
                iconAnchor: [14, 40], // bottom center
                popupAnchor: [0, -40]
            });

            const marker = L.marker([point.latitud, point.longitud], { icon: numberIcon });
            const popupContent = `<b>${point.Numb} - ${point.ADRéS}</b><br>${point.ENFOMASYON}<br><a href="https://www.google.com/maps/search/?api=1&query=${point.latitud},${point.longitud}" target="_blank">Ver en Google Maps</a>`;
            marker.bindPopup(popupContent);
            marker.on('click', () => {
                const rows = document.querySelectorAll('#data-table tbody tr');
                rows.forEach(row => row.classList.remove('highlight'));
                const rowToHighlight = document.getElementById(`row-${point.ID}`);
                if (rowToHighlight) {
                    rowToHighlight.classList.add('highlight');
                    rowToHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
            markers.addLayer(marker);

            const row = document.createElement('tr');
            row.id = `row-${point.ID}`;
            row.innerHTML = `
                <td>${point.Name}${point.Numb}</td>
                <td>${point.ENFOMASYON}</td>
                <td>${point.ADRéS}</td>
            `;
            tableBody.appendChild(row);
        }
    });
}

// Filter logic
const filter = document.getElementById('territorio-filter');
filter.addEventListener('change', (event) => {
    const selectedTerritory = event.target.value;
    if (selectedTerritory === 'all') {
        // Si se selecciona "todos", borra los marcadores y la tabla.
        markers.clearLayers();
        const tableBody = document.querySelector('#data-table tbody');
        tableBody.innerHTML = '';
    } else {
        // Si se selecciona un territorio específico, filtra y muestra los puntos.
        const filteredPoints = allPoints.filter(point => {
            return point.Name === parseInt(selectedTerritory, 10);
        });
        updateMapAndTable(filteredPoints);
    }
});

// ... tu código existente
const geolocateButton = document.getElementById('geolocate-button');
geolocateButton.addEventListener('click', () => {
    // Verifica si el navegador soporta geolocalización
    if (navigator.geolocation) {
        // Obtiene la posición actual del usuario
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const userLocation = [lat, lon];
                
                // Centra el mapa en la ubicación del usuario y lo acerca
                map.setView(userLocation, 16); 
                
                // Opcional: añade un marcador en la ubicación del usuario
                L.marker(userLocation).addTo(map)
                    .bindPopup("¡Estás aquí!").openPopup();
            },
            (error) => {
                // Maneja los errores si el usuario no permite la ubicación
                console.error("Error al obtener la ubicación:", error);
                alert("No se pudo obtener tu ubicación. Por favor, asegúrate de que la geolocalización esté habilitada en tu navegador.");
            }
        );
    } else {
        // Navegadores que no soportan la geolocalización
        alert("Tu navegador no soporta la geolocalización.");
    }
});