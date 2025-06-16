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
  const [map, setMap] = useState(null);
  const defaultCenter = [40.7589, -73.9851];  // Default center (New York City)

  const mapMatchApi = async (gpxGeoJson) => {
    
    try {

      const body = {
              "shape":[],
              "costing":"auto",
              "shape_match":"walk_or_snap"
            }


      const coords = gpxGeoJson.features[0].geometry.coordinates;
      coords.forEach((coord) => {
        const point = { "lat":coord[1],"lon":coord[0]};
        body.shape.push(point)
      });

      const response = await fetch('https://valhalla1.openstreetmap.de/trace_attributes ', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const mapMatchingResponse = await response.json();
      const matchedPoints = [];

      mapMatchingResponse.matched_points.forEach((matchedPoint) => {
        const edge_index = matchedPoint.edge_index;
        const road_name = edge_index 
        &&  mapMatchingResponse.edges 
        && mapMatchingResponse.edges[edge_index]
        && mapMatchingResponse.edges[edge_index].names ? 
          mapMatchingResponse.edges[edge_index].names[0] : "none";
        const point = [matchedPoint.lon, matchedPoint.lat];
        matchedPoints.push(point)
      });

      const mapMatchedGeoJson = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: matchedPoints
            }
          }
        ]
      }


      const style = {
          style: {
            color: 'red',
            weight: 13,
            opacity: 1
          }
      }

      const mapMatchedGeoJsonLayer = L.geoJson(mapMatchedGeoJson, style).addTo(map);;
      map.fitBounds(mapMatchedGeoJsonLayer.getBounds());
    } catch (error) {
      console.error('API Error:', error);
    } finally {
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    
    if (file) {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const gpxString = e.target.result;
        
        try {
          //parse xml and check for errors
          const gpxXmlDoc = new DOMParser().parseFromString(gpxString, 'application/xml');
          const parserError = gpxXmlDoc.querySelector('parsererror');
          if (parserError) {
            throw new Error(`XML parsing error: ${parserError.textContent}`);
          }

          const gpxGeoJson = togeojson.gpx(gpxXmlDoc);
          mapMatchApi(gpxGeoJson);

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
          
          {/*           
          <MapClickHandler onMapClick={handleMapClick} />
           */}
        
        </MapContainer>
      </div>
    </div>
  );
}

export default App;