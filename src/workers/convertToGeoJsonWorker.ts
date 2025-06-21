import type { FeatureCollection, LineString } from "geojson";
import type { GeoJsonFeature, FeatureCollectionGeoJson, MapMatchingResponse, MatchedPoint, RequestBody, ValhallaRequest } from "../App";
import { VALHALLA_REQUEST_TYPE } from "../consts";
import { gpx } from '@tmcw/togeojson'
import { DOMParser } from 'xmldom';

export const convertRouteFileToGeoJson = async (files: FileList): Promise<void> => {
    const file: File = files[0];    
    const reader = new FileReader();
    
    reader.onload = async (e: ProgressEvent<FileReader>) => {
      const gpxString = e.target?.result as string;
      
      try {
        const gpxXmlDoc: Document = new DOMParser().parseFromString(gpxString, 'application/xml');
        // TODO: fix error check.  xmldom doesn't support .querySelector
        // const parserError = gpxXmlDoc.querySelector('parsererror');
        // if (parserError) {
        //   throw new Error(`XML parsing error: ${parserError.textContent}`);
        // }
        const gpxGeoJson: FeatureCollection = gpx(gpxXmlDoc);
        const coordinateArray = (gpxGeoJson.features[0].geometry as LineString).coordinates
        self.postMessage(coordinateArray);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to parse XML: ${errorMessage}`);
      }
    }
    reader.readAsText(file);
};

self.onmessage = async function(event) {
  await convertRouteFileToGeoJson(event.data as FileList);
};