import React, { useState, useEffect, useRef, type ChangeEventHandler } from 'react';
import { MapContainer, TileLayer, GeoJSON, type MarkerProps, Popup, Polyline, useMapEvents, Marker } from 'react-leaflet';
import { gpx } from '@tmcw/togeojson'
import L, { LatLng, LayerGroup, Map, type LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';
import type { FeatureCollection, LineString } from 'geojson';
import { VALHALLA_REQUEST_TYPE } from "./consts";

// Type definitions
interface GpxCoordinateArray
 {
  features: Array<{
    geometry: {
      coordinates: number[][];
    };
  }>;
}

export interface RequestBody {
  shape: Array<{ lat: number; lon: number }>;
  costing: string;
  shape_match: string;
}

export interface MatchedPoint {
  lat: number;
  lon: number;
  edge_index: number | null;  //null means this point doesn't map to an edge
  name?: string;
}

interface MapMarker {
  text: null;
  lat: number;
  lon: number;
}

export interface Edge {
  names: string[];
}

export interface MapMatchingResponse {
  matched_points: MatchedPoint[];
  edges: Edge[];
}

export interface GeoJsonFeature {
  type: "Feature";
  properties: {
    name: string;
  };
  geometry: {
    type: "LineString";
    coordinates: number[][];
  };
}

export interface MapMatchedGeoJson {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

export interface ValhallaRequest {
  type: VALHALLA_REQUEST_TYPE;
  coordinates: number[][];
}

function App() {
  const defaultCenter: LatLngTuple = [40.7589, -73.9851];  // Default center (New York City)
  const map = useRef<Map>(null);
  const uploadButtonRef = useRef<HTMLInputElement>(null);
  const [workerResult, setWorkerResult] = useState(null);
  const [workerInstance, setWorkerInstance] = useState<Worker | null>(null);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [routePoints, setRoutePoints] = useState([]);
  const [wayPoints, setWayPoints] = useState([]);
  const [mousePosition, setMousePosition] = useState<LatLng | null>(null);
  const shouldShowLine = markers.length > 0 && mousePosition;

  const getLastMarkerPosition = () => {
    if (markers.length === 0) return null;
    return [markers[markers.length - 1].lat, markers[markers.length - 1].lon]
  };
  const lastMarkerAndMousePositions: any = shouldShowLine ? [getLastMarkerPosition(), mousePosition] : [];
  const markerPositions: any = markers.length > 1 ? 
    markers.map(marker => [marker.lat, marker.lon]) : [];

  useEffect(() => {
      const workerUrl = new URL("./workers/mapMatchWorker.ts", import.meta.url);
      const worker = new Worker(workerUrl, {
        type: "module"
      })

      worker.onmessage = (event) => {
        setWorkerResult(event.data);
        const mapMatchedGeoJsonLayer = L.geoJSON(event.data, {
          style: function(feature: any) {
            console.log(JSON.stringify(feature));
            switch (feature.properties.name) {
              case 'Unmatched': 
                return { color: "#ff0000" };
              default:
                return { color: "#0000ff" };
            }
          }
        }).addTo(map.current!);        
        map.current!.fitBounds(mapMatchedGeoJsonLayer.getBounds());
      };

      setWorkerInstance(worker);

      // Clean up worker on component unmount
      return () => {
        worker.terminate();
        URL.revokeObjectURL(workerUrl.toString());
      };
  }, []);

  const handleUploadClick = (event: React.MouseEvent<HTMLElement>): void => {
    uploadButtonRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {  
    const target = event.currentTarget as HTMLInputElement;
    const file: File = target.files![0];    
    const reader = new FileReader();
    
    reader.onload = async (e: ProgressEvent<FileReader>) => {
      const gpxString = e.target?.result as string;
      
      try {
        const gpxXmlDoc = new DOMParser().parseFromString(gpxString, 'application/xml');
        const parserError = gpxXmlDoc.querySelector('parsererror');
        if (parserError) {
          throw new Error(`XML parsing error: ${parserError.textContent}`);
        }
        const gpxGeoJson: FeatureCollection = gpx(gpxXmlDoc);
        const coordinateArray = (gpxGeoJson.features[0].geometry as LineString).coordinates

        const valhallaRequest: ValhallaRequest = {
          type: VALHALLA_REQUEST_TYPE.MATCH,
          coordinates: coordinateArray
        };
        workerInstance!.postMessage(valhallaRequest);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to parse XML: ${errorMessage}`);
      }
    }
    reader.readAsText(file);
  }

  const handleMapClick: any = (latlng: LatLng) => {
    const newMarker: MapMarker = {
      text: null,
      lat: latlng.lat,
      lon: latlng.lng
    };
    setMarkers(prev => [...prev, newMarker]);
  };

  const handleMouseMove: any = (latlng: LatLng) => {
    if(markers.length > 0){
      setMousePosition(latlng);
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
                <Marker key={marker.text} position={[marker.lat, marker.lon]}>
                  <Popup>
                    Marker at {marker.lat.toFixed(4)}, {marker.lon.toFixed(4)}
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




function MapEventHandler({ onMapClick, onMouseMove } : { onMapClick: any, onMouseMove: any }) {
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
