
// Initialize the map
const map = L.map('map').setView([-33.68, -71.22], 13);

// Add a tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let allPoints = [];
const markers = L.layerGroup().addTo(map);

// Load and process KML data
fetch('Mapaterrtorios.kml')
    .then(response => response.text())
    .then(kmltext => {
        const parser = new DOMParser();
        const kml = parser.parseFromString(kmltext, 'text/xml');
        const geojson = toGeoJSON.kml(kml);

        const territoryLayer = L.geoJSON(geojson, {
            style: function(feature) {
                return {
                    color: 'blue',
                    weight: 2,
                    opacity: 0.7,
                    fillOpacity: 0.1
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
Papa.parse('archivo final - puntos_salida 2.csv', {
    download: true,
    header: true,
    dynamicTyping: false, // Disable dynamic typing to handle parsing manually
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
        updateMapAndTable(allPoints);
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
        updateMapAndTable(allPoints);
    } else {
        const filteredPoints = allPoints.filter(point => {
            return point.Name === parseInt(selectedTerritory, 10);
        });
        updateMapAndTable(filteredPoints);
    }
});
