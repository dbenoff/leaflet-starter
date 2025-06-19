
export const GetMapMaptchedGeoJson = async (coordinateArray): Promise<void> => {

  try {
    const body: RequestBody = {
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
          mapMatchingResponse.edges[edgeIndex].names![0] : "No edge name";
        geometryArray.forEach((point: MatchedPoint) => {
          point.name = edgeName;
        });
      } else {
        geometryArray.forEach((point: MatchedPoint) => {
          point.name = "Unmatched";
        });
      }
    });

    const mapMatchedGeoJson: MapMatchedGeoJson = {
      type: "FeatureCollection",
      features: []
    };

    geometryArraysGroupedByEdgeIndex.forEach((geometryArray: MatchedPoint[], index: number) => {
      const pointsArray: number[][] = [];
      if (index > 0) {
        const lastPointFromPreviousLine = geometryArraysGroupedByEdgeIndex[index - 1].at(-1)!;
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

    return mapMatchedGeoJson;


  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('API Error:', errorMessage);
  }
};




export const GetRoutedGeoJson = async (coordinateArray): Promise<void> => {

  try {
    const body: RequestBody = {
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
          mapMatchingResponse.edges[edgeIndex].names![0] : "No edge name";
        geometryArray.forEach((point: MatchedPoint) => {
          point.name = edgeName;
        });
      } else {
        geometryArray.forEach((point: MatchedPoint) => {
          point.name = "Unmatched";
        });
      }
    });

    const mapMatchedGeoJson: MapMatchedGeoJson = {
      type: "FeatureCollection",
      features: []
    };

    geometryArraysGroupedByEdgeIndex.forEach((geometryArray: MatchedPoint[], index: number) => {
      const pointsArray: number[][] = [];
      if (index > 0) {
        const lastPointFromPreviousLine = geometryArraysGroupedByEdgeIndex[index - 1].at(-1)!;
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

    return mapMatchedGeoJson;


  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.log('API Error:', errorMessage);
  }
};

self.onmessage = async function(event) {
  const valhallaRequest: ValhallaRequest = event.data;
  if(valhallaRequest.type === 'match'){
    const result = await GetMapMaptchedGeoJson(valhallaRequest.coordinates);
    self.postMessage(result);
  }else if(valhallaRequest.type === 'route'){
    const result = await GetRoutedGeoJson(valhallaRequest.coordinates);
    self.postMessage(result);
  }else{
    console.log('API Error:', "unknown Valhalla request type");
  }
  
};