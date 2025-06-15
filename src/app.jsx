import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMapEvents } from 'react-leaflet';
import togeojson from '@mapbox/togeojson'
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './app.css';

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

function App() {
  const [layers, setLayers] = useState([]);
  const [map, setMap] = useState(null);

  // Default center (New York City)
  const defaultCenter = [40.7589, -73.9851];

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    
    if (file) {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        console.log('File contents:', e.target.result);
        const gpxString = e.target.result;
        
        try {
          const gpxXmlDoc = new DOMParser().parseFromString(gpxString, 'application/xml');
          // Check for parsing errors
          const parserError = gpxXmlDoc.querySelector('parsererror');
          if (parserError) {
            throw new Error(`XML parsing error: ${parserError.textContent}`);
          }
          const gpxGeoJson = togeojson.gpx(gpxXmlDoc);

          setLayers(prev => [...prev, gpxGeoJson]);
          const layer = L.geoJson(gpxGeoJson);
          map.fitBounds(layer.getBounds());

        } catch (error) {
          throw new Error(`Failed to parse XML: ${error.message}`);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <input
          type="file"
          onChange={handleFileSelect}
        />
      </header>

      <div className="map-container">
        <MapContainer
          center={defaultCenter}
          zoom={12}
          style={{ height: '500px', width: '100%' }}
          ref={setMap}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />


          {layers ? 
            layers.map((data, index) => (
              <GeoJSON key={index} data={data} />
            )) 
            : null
          } 

          {/* {geoJsonData ? 
             <GeoJSON data={geoJsonData} />
            : null
          } */}
          
          
          
          
          {/*           
          <MapClickHandler onMapClick={handleMapClick} />
           */}
        
        </MapContainer>
      </div>
    </div>
  );
}

export default App;