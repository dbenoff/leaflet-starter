import * as dom from '@xmldom/xmldom';
// @ts-ignore
import { kml, gpx } from '@mapbox/togeojson'
import { expose } from 'threads/worker';
import { readFileAsync } from '../utils';

expose(async function readGpx(inputData, isGpx=true) {
  console.log('readGpx');
  const resultData: any = await readFileAsync(inputData, true);
  const domXML = new dom.DOMParser().parseFromString(resultData);
  return gpx(domXML);
});
