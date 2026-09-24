import type { ImageMetadata } from 'astro';
import amaravati from '@/assets/locations/capitals/amaravati.webp';
import itanagar from '@/assets/locations/capitals/itanagar.webp';
import dispur from '@/assets/locations/capitals/dispur.webp';
import patna from '@/assets/locations/capitals/patna.webp';
import raipur from '@/assets/locations/capitals/raipur.webp';
import panaji from '@/assets/locations/capitals/panaji.webp';
import gandhinagar from '@/assets/locations/capitals/gandhinagar.webp';
import chandigarh from '@/assets/locations/capitals/chandigarh.webp';
import shimla from '@/assets/locations/capitals/shimla.webp';
import ranchi from '@/assets/locations/capitals/ranchi.webp';
import bengaluru from '@/assets/locations/bengaluru.webp';
import thiruvananthapuram from '@/assets/locations/capitals/thiruvananthapuram.webp';
import bhopal from '@/assets/locations/capitals/bhopal.webp';
import mumbai from '@/assets/locations/mumbai.webp';
import imphal from '@/assets/locations/capitals/imphal.webp';
import shillong from '@/assets/locations/capitals/shillong.webp';
import aizawl from '@/assets/locations/capitals/aizawl.webp';
import kohima from '@/assets/locations/capitals/kohima.webp';
import bhubaneswar from '@/assets/locations/capitals/bhubaneswar.webp';
import jaipur from '@/assets/locations/capitals/jaipur.webp';
import gangtok from '@/assets/locations/capitals/gangtok.webp';
import chennai from '@/assets/locations/capitals/chennai.webp';
import hyderabad from '@/assets/locations/capitals/hyderabad.webp';
import agartala from '@/assets/locations/capitals/agartala.webp';
import lucknow from '@/assets/locations/capitals/lucknow.webp';
import dehradun from '@/assets/locations/capitals/dehradun.webp';
import kolkata from '@/assets/locations/capitals/kolkata.webp';
import delhi from '@/assets/locations/delhi.webp';
import sriVijayaPuram from '@/assets/locations/capitals/sri-vijaya-puram.webp';
import daman from '@/assets/locations/capitals/daman.webp';
import srinagar from '@/assets/locations/capitals/srinagar.webp';
import leh from '@/assets/locations/capitals/leh.webp';
import kavaratti from '@/assets/locations/capitals/kavaratti.webp';
import puducherry from '@/assets/locations/capitals/puducherry.webp';
import gurgaon from '@/assets/locations/gurgaon.webp';
import noida from '@/assets/locations/noida.webp';

export type LocationImage = Pick<ImageMetadata, 'src' | 'width' | 'height'>;

function compact(meta: ImageMetadata): LocationImage {
  return { src: meta.src, width: meta.width, height: meta.height };
}

/** Local, build-time image metadata. No location image is fetched at runtime. */
export const LOCATION_IMAGES: Record<string, LocationImage> = {
  amaravati: compact(amaravati),
  itanagar: compact(itanagar),
  dispur: compact(dispur),
  patna: compact(patna),
  raipur: compact(raipur),
  panaji: compact(panaji),
  gandhinagar: compact(gandhinagar),
  chandigarh: compact(chandigarh),
  shimla: compact(shimla),
  ranchi: compact(ranchi),
  bengaluru: compact(bengaluru),
  thiruvananthapuram: compact(thiruvananthapuram),
  bhopal: compact(bhopal),
  mumbai: compact(mumbai),
  imphal: compact(imphal),
  shillong: compact(shillong),
  aizawl: compact(aizawl),
  kohima: compact(kohima),
  bhubaneswar: compact(bhubaneswar),
  jaipur: compact(jaipur),
  gangtok: compact(gangtok),
  chennai: compact(chennai),
  hyderabad: compact(hyderabad),
  agartala: compact(agartala),
  lucknow: compact(lucknow),
  dehradun: compact(dehradun),
  kolkata: compact(kolkata),
  'new-delhi': compact(delhi),
  delhi: compact(delhi),
  'sri-vijaya-puram': compact(sriVijayaPuram),
  daman: compact(daman),
  srinagar: compact(srinagar),
  leh: compact(leh),
  kavaratti: compact(kavaratti),
  puducherry: compact(puducherry),
  gurgaon: compact(gurgaon),
  noida: compact(noida),
};
