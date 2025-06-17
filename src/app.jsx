import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMapEvents } from 'react-leaflet';
import togeojson from '@mapbox/togeojson'
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './app.css';
import Button from 'react-bootstrap/Button';


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
  const uploadButtonRef = useRef(null);

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

      const response = await fetch('https://valhalla1.openstreetmap.de/trace_attributes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      //console.log(JSON.stringify(body));

      const mapMatchingResponse = await response.json();

      console.log(JSON.stringify(mapMatchingResponse));

      // ordered array of coordinate arrays grouped by edge ID.
      // there can be multiple arrays with null (unmatched) edge IDs
      // if there are multiple unmatched segments in the route.
      const geometryArraysGroupedByEdgeIndex = [];
      let previousPoint = mapMatchingResponse.matched_points[0];
      let currentSegment = [];
      currentSegment.push(previousPoint);
      mapMatchingResponse.matched_points.forEach((matchedPoint, index) => {
        if(index > 0){
          if(previousPoint && matchedPoint.edge_index == previousPoint.edge_index){
            currentSegment.push(matchedPoint);
          }else{
            geometryArraysGroupedByEdgeIndex.push(currentSegment);
            currentSegment = [];
            currentSegment.push(matchedPoint);
          }
          previousPoint = matchedPoint;
        }
      });

      //now append edge  points
      geometryArraysGroupedByEdgeIndex.forEach((geometryArray, index) => {
        if(geometryArray[0].edge_index){
          const edgeIndex = geometryArray[0].edge_index;
          const edge = mapMatchingResponse.edges[edgeIndex];
          const edgeName = edge && edge.names && edge.names.length >  0 ? 
            mapMatchingResponse.edges[edgeIndex].names[0] : "No edge name";
          geometryArray.forEach((point, index) => {
            point.name = edgeName;
          });
        }else{
          geometryArray.forEach((point, index) => {
            point.name = "Unmatched";
          });
        }
      });

      const mapMatchedGeoJson = {
        type: "FeatureCollection",
        features: []
      }

      geometryArraysGroupedByEdgeIndex.forEach((geometryArray, index) => {
        const pointsArray = [];
        if(index > 0){
          const lastPointFromPreviousLine = geometryArraysGroupedByEdgeIndex[index - 1].at(-1);
          pointsArray.push([lastPointFromPreviousLine.lon, lastPointFromPreviousLine.lat])
        }
        geometryArray.forEach((matchedPoint, index) => {
          const pointArray = [matchedPoint.lon, matchedPoint.lat];
          pointsArray.push(pointArray)
        })

        const feature = {
            type: "Feature",
            properties: {
              name: geometryArray[0].name
            },
            geometry: {
              type: "LineString",
              coordinates: pointsArray
            }
          }

           mapMatchedGeoJson.features.push(feature);
      })
  

      const mapMatchedGeoJsonLayer = L.geoJSON(mapMatchedGeoJson, {
        style: function(feature) {
            switch (feature.properties.name) {
                case 'Unmatched': return {color: "#ff0000"};
                return {color: "#0000ff"};
            }
        }
      }).addTo(map);
      map.fitBounds(mapMatchedGeoJsonLayer.getBounds());
    } catch (error) {
      console.error('API Error:', error);
    } finally {
    }
  };


  const handleUploadClick = (event) => {
    uploadButtonRef.current.click();
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
      <div className="container">
        <div className="row">
          <div className="col-9">
            <MapContainer
              center={defaultCenter}
              zoom={12}
              style={{ borderRadius: '6px', height: '500px', width: '100%' }}
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
          <div className="rounded col-3 p-3 bg-primary bg-gradient text-break">
            <input type="file" ref={uploadButtonRef} style={{ display: 'none' }} onChange={handleFileSelect}/>
            <button className="rounded btn btn-light" onClick={handleUploadClick}>Open File Dialog</button>
          </div>
        </div>
      </div>










    </div>
  );
}

export default App;