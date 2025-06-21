import type {
  FeatureCollectionGeoJson,
  GeoJsonFeature,
  MapMatchingResponse,
  MatchedPoint,
  ValhallaResponse,
} from '../App';
import type { FeatureCollection, LineString } from 'geojson';
import { gpx } from '@tmcw/togeojson';
import { DOMParser } from 'xmldom';
import { VALHALLA_REQUEST_TYPE } from '../consts';


export interface ValhallaMapMatchRequestBody {
  shape: Array<{ lat: number; lon: number }>;
  costing: string;
  shape_match: string;
}

const parseGpxFileGeometry = (file: File): Promise<number[][]> => {
  return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e: ProgressEvent<FileReader>) => {
        const gpxString = e.target?.result as string;

        try {
          const gpxXmlDoc: Document = new DOMParser().parseFromString(gpxString, 'application/xml');
          const gpxGeoJson: FeatureCollection = gpx(gpxXmlDoc);
          const coordinateArray = (gpxGeoJson.features[0].geometry as LineString).coordinates
          resolve(coordinateArray);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          throw new Error(`Failed to parse XML: ${errorMessage}`);
        }
      }

      reader.onerror = (error) => {
          reject(error);
      };

      reader.readAsText(file);
  });
};

const getMapMatchedRouteGeoJson = async (coordinateArray: number[][]): Promise<ValhallaResponse> => {

  try {
    const body: ValhallaMapMatchRequestBody = {
      shape: [],
      costing: "auto",
      shape_match: "walk_or_snap"
    };

    coordinateArray.forEach((coord: number[]) => {
      const point = { lat: coord[1], lon: coord[0] };
      body.shape.push(point);
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

    const mapMatchingResponse: MapMatchingResponse = await response.json();

    // Ordered array of coordinate arrays grouped by edge ID.
    // There can be multiple arrays with null edge IDs
    // if there are multiple unmatched segments in the route.
    const geometryArraysGroupedByEdgeIndex: MatchedPoint[][] = [];
    let previousPoint = mapMatchingResponse.matched_points[0];
    let currentSegment: MatchedPoint[] = [];
    currentSegment.push(previousPoint);
    
    mapMatchingResponse.matched_points.forEach((matchedPoint: MatchedPoint, index: number) => {
      if (index > 0) {
        if (previousPoint && matchedPoint.edge_index === previousPoint.edge_index) {
          currentSegment.push(matchedPoint);
        } else {
          geometryArraysGroupedByEdgeIndex.push(currentSegment);
          currentSegment = [];
          currentSegment.push(matchedPoint);
        }
        previousPoint = matchedPoint;
      }
    });

    // Now append edge names to points
    geometryArraysGroupedByEdgeIndex.forEach((geometryArray: MatchedPoint[]) => {
      if (geometryArray[0].edge_index !== null) {
        const edgeIndex = geometryArray[0].edge_index!;
        const edge = mapMatchingResponse.edges[edgeIndex];
        const edgeName = edge && edge.names && edge.names.length > 0 ? 
          mapMatchingResponse.edges[edgeIndex].names![0] : "Unmatched";
        geometryArray.forEach((point: MatchedPoint) => {
          point.name = edgeName;
        });
      } else {
        geometryArray.forEach((point: MatchedPoint) => {
          point.name = "Unmatched";
        });
      }
    });

    const mapMatchedGeoJson: FeatureCollectionGeoJson = {
      type: "FeatureCollection",
      features: []
    };

    
    geometryArraysGroupedByEdgeIndex.forEach((geometryArray: MatchedPoint[], index: number) => {
      const pointsArray: number[][] = [];
      if (index > 0) {
        const lastPointFromPreviousLine :MatchedPoint = geometryArraysGroupedByEdgeIndex[index - 1].at(-1)!;
        pointsArray.push([lastPointFromPreviousLine.lon, lastPointFromPreviousLine.lat]);
      }
      geometryArray.forEach((matchedPoint: MatchedPoint) => {
        const pointArray = [matchedPoint.lon, matchedPoint.lat];
        pointsArray.push(pointArray);
      });

      const feature: GeoJsonFeature = {
        type: "Feature",
        properties: {
          name: geometryArray[0].name!
        },
        geometry: {
          type: "LineString",
          coordinates: pointsArray
        }
      };

      mapMatchedGeoJson.features.push(feature);
    });


    const valhallaResponse: ValhallaResponse = {
      type: VALHALLA_REQUEST_TYPE.MATCH,
      geojson: mapMatchedGeoJson
    };

    return valhallaResponse;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('API Error:', errorMessage);
    throw new Error("Something went wrong!");
  }
};

self.onmessage = async function(event) {
  const gpxCoordinateArray: number[][] = await parseGpxFileGeometry(event.data as File);
  const valhallaResponse: ValhallaResponse = await getMapMatchedRouteGeoJson(gpxCoordinateArray);
  self.postMessage(valhallaResponse);
};