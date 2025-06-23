import React, { useState, useEffect, useRef, type ChangeEventHandler } from 'react';
import { MapContainer, TileLayer, GeoJSON, type MarkerProps, Popup, Polyline, useMapEvents, Marker } from 'react-leaflet';
import { gpx } from '@tmcw/togeojson'
import L, { LatLng, LayerGroup, Map, type LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';
import type { FeatureCollection, GeoJsonObject, LineString } from 'geojson';
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

export interface ValhallaMapMatchRequestBody {
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

export interface FeatureCollectionGeoJson {
  type: string;
  features: GeoJsonFeature[];
}

export interface ValhallaRequest {
  type: VALHALLA_REQUEST_TYPE;
  coordinates: number[][];
  files: FileList;
}

export interface ValhallaResponse {
  type: VALHALLA_REQUEST_TYPE;
  geojson: FeatureCollectionGeoJson;
}

function App() {
  const defaultCenter: LatLngTuple = [40.7589, -73.9851];  // Default center (New York City)
  const map = useRef<Map>(null);
  const uploadButtonRef = useRef<HTMLInputElement>(null);
  const [valhallaWorkerInstance, setValhallaWorkerInstance] = useState<Worker>();
  const [fileWorkerInstance, setFileWorkerInstance] = useState<Worker>();
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [valhallaResponse, setValhallaReponse] = useState<ValhallaResponse>();
  const [mousePosition, setMousePosition] = useState<LatLng>();
  const shouldShowLine = markers.length > 0 && mousePosition;

  const getLastMarkerPosition = () => {
    if (markers.length === 0) return null;
    return [markers[markers.length - 1].lat, markers[markers.length - 1].lon]
  };
  const lastMarkerAndMousePositions: any = shouldShowLine ? [getLastMarkerPosition(), mousePosition] : [];
  const markerPositions: any = markers.length > 1 ? 
    markers.map(marker => [marker.lat, marker.lon]) : [];


  useEffect(() => {
      //create a worker thread to interact with Valhalla server
      // TODO: when workerUrl is instantiated separately, mime type for worker is wrong in /dist
      // const workerUrl = new URL("./workers/valhallaWorker.ts", import.meta.url);
      const worker = new Worker(new URL("./workers/valhallaWorker.ts", import.meta.url), {
        type: "module"
      })
      worker.onmessage = (event) => {
        setValhallaReponse(event.data as ValhallaResponse)
      };
      
      setValhallaWorkerInstance(worker);

      // Clean up worker on component unmount
      return () => {
        worker.terminate();
        URL.revokeObjectURL(new URL("./workers/valhallaWorker.ts", import.meta.url).toString());
      };
  }, []);


  useEffect(() => {
    if(valhallaResponse){
      const mapMatchedGeoJsonLayer = L.geoJSON(valhallaResponse.geojson.features, {
          style: function(feature: any) {
            switch (feature.properties.name) {
              case 'Unmatched': 
                return { color: "#ff0000" };
              default:
                return { color: "#0000ff" };
            }
          }
        }).addTo(map.current!);        
        map.current!.fitBounds(mapMatchedGeoJsonLayer.getBounds());    
    }
  }, [valhallaResponse]);

  const handleUploadClick = (event: React.MouseEvent<HTMLElement>): void => {
    uploadButtonRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {  
    const target = event.currentTarget as HTMLInputElement;
    const fileList: FileList = target.files!;    
    valhallaWorkerInstance?.postMessage(fileList[0]);
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
            <div  id="mapcontainer">
              <button id="refreshButton">Refresh Button</button>
              <MapContainer
                id="leafletmapcontainer"
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
