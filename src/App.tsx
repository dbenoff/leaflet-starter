import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMapEvents } from 'react-leaflet';
import togeojson from '@mapbox/togeojson'
import L, { LatLng } from 'leaflet';
import createParser from './app/parsers/parserFactory';
import 'leaflet/dist/leaflet.css';
import './App.css';
import Button from 'react-bootstrap/Button';

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
  const map = useRef(null);
  const uploadButtonRef = useRef(null);

  const defaultCenter = [40.7589, -73.9851];  // Default center (New York City)

  const [workerResult, setWorkerResult] = useState(null);
  const [workerInstance, setWorkerInstance] = useState(null);


  useEffect(() => {
      const workerUrl = new URL("./worker.js", import.meta.url);
      const worker = new Worker(workerUrl, {
        type: "module"
      })

      worker.onmessage = (event) => {
        console.log(event.data);
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
        workerInstance.postMessage(gpxGeoJson);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to parse XML: ${errorMessage}`);
      }
    }
    reader.readAsText(file);
  }


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
              
              {/*           
              <MapClickHandler onMapClick={handleMapClick} />
              */}
            
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

interface MapClickHandlerProps {
  onMapClick: (latlng: LatLng) => void;
}

function MapClickHandler({ onMapClick }: MapClickHandlerProps): null {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

export default App
