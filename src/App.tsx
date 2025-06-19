import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import togeojson from '@mapbox/togeojson'
import L, { LatLng } from 'leaflet';
import createParser from './app/parsers/parserFactory';
import 'leaflet/dist/leaflet.css';
import './App.css';
import Button from 'react-bootstrap/Button';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Type definitions
interface GpxCoordinateArray
 {
  features: Array<{
    geometry: {
      coordinates: number[][];
    };
  }>;
}

interface RequestBody {
  shape: Array<{ lat: number; lon: number }>;
  costing: string;
  shape_match: string;
}

interface MatchedPoint {
  lat: number;
  lon: number;
  edge_index: number | null;
  name?: string;
}

interface Edge {
  names?: string[];
}

interface MapMatchingResponse {
  matched_points: MatchedPoint[];
  edges: Edge[];
}

interface GeoJsonFeature {
  type: "Feature";
  properties: {
    name: string;
  };
  geometry: {
    type: "LineString";
    coordinates: number[][];
  };
}

interface MapMatchedGeoJson {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

function App() {
  const defaultCenter = [40.7589, -73.9851];  // Default center (New York City)
  const map = useRef(null);
  const uploadButtonRef = useRef(null);
  const [workerResult, setWorkerResult] = useState(null);
  const [workerInstance, setWorkerInstance] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [routePoints, setRoutePoints] = useState([]);
  const [mousePosition, setMousePosition] = useState(null);
  const shouldShowLine = markers.length > 0 && mousePosition;

  const getLastMarkerPosition = () => {
    if (markers.length === 0) return null;
    return markers[markers.length - 1].position;
  };
  const lastMarkerAndMousePositions = shouldShowLine ? [getLastMarkerPosition(), mousePosition] : [];
  const markerPositions = markers.length > 1 ? 
    markers.map(marker => [marker.position[0], marker.position[1]]) : [];

  useEffect(() => {
      const workerUrl = new URL("./mapMatchWorker.ts", import.meta.url);
      const worker = new Worker(workerUrl, {
        type: "module"
      })

      worker.onmessage = (event) => {
        setWorkerResult(event.data);
        const mapMatchedGeoJsonLayer = L.geoJSON(event.data, {
          style: function(feature: any) {
            switch (feature.properties.name) {
              case 'Unmatched': 
                return { color: "#ff0000" };
              default:
                return { color: "#0000ff" };
            }
          }
        }).addTo(map.current);        
        map.current.fitBounds(mapMatchedGeoJsonLayer.getBounds());
      };

      setWorkerInstance(worker);

      // Clean up worker on component unmount
      return () => {
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
      };
  }, []);

  const handleLayerCreated = (event: React.MouseEvent<HTMLElement>): void => {
    uploadButtonRef.current?.click();
  };

  const handleUploadClick = (event: React.MouseEvent<HTMLElement>): void => {
    uploadButtonRef.current?.click();
  };

  const handleFileSelect = async (event: Event): void => {  
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];    
    const reader = new FileReader();
    
    reader.onload = async (e: ProgressEvent<FileReader>): void => {
      const gpxString = e.target?.result as string;
      
      try {
        const gpxXmlDoc = new DOMParser().parseFromString(gpxString, 'application/xml');
        const parserError = gpxXmlDoc.querySelector('parsererror');
        if (parserError) {
          throw new Error(`XML parsing error: ${parserError.textContent}`);
        }
        const gpxGeoJson = togeojson.gpx(gpxXmlDoc);
        const coordinateArray = gpxGeoJson.features[0].geometry.coordinates;
        workerInstance.postMessage(coordinateArray);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to parse XML: ${errorMessage}`);
      }
    }
    reader.readAsText(file);
  }

  const handleMapClick = (latlng) => {
    
      
    const newMarker = {
      id: Date.now(),
      position: [latlng.lat, latlng.lng]
    };
    setMarkers(prev => [...prev, newMarker]);
  };

  const handleMouseMove = (latlng) => {
    if(markers.length > 0){
      setMousePosition([latlng.lat, latlng.lng]);
    }  
  };

  return (
    <div className="app">
      <div className="container">
        <div className="row">
          <div className="col-9">
            <MapContainer
              center={defaultCenter}
              zoom={12}
              style={{ borderRadius: '6px', height: '500px', width: '100%' }}
              ref={map}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
                    
              <MapEventHandler 
                onMapClick={handleMapClick} 
                onMouseMove={handleMouseMove}
                hasMarkers={markers.length > 0}
              />
              
              {shouldShowLine && (
                <div>
                  <Polyline 
                    positions={lastMarkerAndMousePositions}
                    color="red"
                    weight={2}
                    opacity={0.7}
                    dashArray="5, 10"
                  />
                  <Polyline 
                    positions={markerPositions}
                    color="red"
                    weight={2}
                    opacity={1}
                  />
                </div>
              )}
              
              {markers.map((marker) => (
                <Marker key={marker.id} position={marker.position}>
                  <Popup>
                    Marker at {marker.position[0].toFixed(4)}, {marker.position[1].toFixed(4)}
                  </Popup>
                </Marker>
              ))}

            
            </MapContainer>
          </div>
          <div className="rounded col-3 p-3 bg-primary bg-gradient text-break">
            <input type="file" ref={uploadButtonRef} style={{ display: 'none' }} onChange={handleFileSelect}/>
            <button className="rounded btn btn-light" onClick={handleUploadClick}>Open File Dialog</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MapEventHandler({ onMapClick, onMouseMove, hasMarkers }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
    mousemove: (e) => {
      onMouseMove(e.latlng);  
    }
  });
  return null;
}

export default App
