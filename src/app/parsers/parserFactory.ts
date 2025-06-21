import GeoJsonParser from "./geoJsonParser";
import KmlParser from "./kmlParser";

export default function createParser(files: FileList, mapRef: any) {
    if (files[0].name.endsWith('.json')) {
        return new GeoJsonParser(files, mapRef);
    } else if (files[0].name.endsWith('.kml')) {
        return new KmlParser(files, mapRef);
    } 
    throw new Error("No parser available for file type!");
}