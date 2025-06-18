import * as L from 'leaflet';
import { spawn, Thread, Worker } from 'threads';
import Parser from "./base";
import GeoJsonData from '../geodata/geoJsonData';

export default class GpxParser extends Parser {
    constructor(files: FileList, mapRef: any) {
        super(files, mapRef);
        console.log("GpxParser ")
    }
    async createLayer() {
        console.log("GpxParser createLayer")
        const readGpx = await spawn(new Worker('src/app/workers/readGpx'));
        const geoJsonData = await readGpx(this.files[0]);
        await Thread.terminate(readGpx);      
        const geoJosnOverlay = new L.GeoJSON(geoJsonData);
        const geoJsonBounds = geoJosnOverlay.getBounds();
        const zoom = this.mapRef.current.leafletElement.getBoundsZoom(geoJsonBounds);
        const center = geoJsonBounds.getCenter();
        return new GeoJsonData(geoJsonData, zoom, center);      
    }

}