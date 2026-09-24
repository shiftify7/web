import { build } from 'esbuild';
const res = await build({ entryPoints: ['src/lib/estimate.ts'], bundle: true, write: false, format: 'esm', external: [], alias: { '@': '/home/user/shiftify/src' } });
const code = res.outputFiles[0].text;
const mod = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const { resolveMove, computeEstimate, buildEstimateMessage } = mod;
const cities = [
  { slug:'gurgaon', name:'Gurgaon', lat:28.4595, lng:77.0266 },
  { slug:'mumbai', name:'Mumbai', lat:19.076, lng:72.8777 },
];
const routes = [{ from:'Gurgaon', to:'Mumbai', distanceKm:1420, transitDays:[4,6] }];
const input = { from:'Gurgaon', to:'Mumbai', homeSize:'2 BHK', date:'2026-09-25', addons:['packing'], vehicleType:'bike' };
const m1 = resolveMove(input.from, input.to, cities, routes);
const e1 = computeEstimate(input, m1);
const m2 = resolveMove(input.from, input.to, cities, routes);
const e2 = computeEstimate(input, m2);
console.log('move:', m1.type, m1.distanceKm + 'km', m1.transit);
console.log('band:', e1.low, '–', e1.high, ' base:', e1.base);
console.log('DETERMINISTIC:', e1.low === e2.low && e1.high === e2.high ? 'PASS ✓' : 'FAIL ✗');
console.log('expected base 17500 + 1420*12(17040) + packing 2500 = 37040 →', e1.base === 37040 ? 'PASS ✓' : `GOT ${e1.base}`);
console.log('expected band round500(0.92|1.1*37040): 34050–40700 →', (e1.low===34050 && e1.high===40700) ? 'PASS ✓' : `GOT ${e1.low}–${e1.high}`);
console.log('--- whatsapp ---'); console.log(buildEstimateMessage(input, e1));
// local move check + same city allowed
const m3 = resolveMove('Mumbai','Mumbai',cities,routes); const e3 = computeEstimate({...input, to:'Mumbai', from:'Mumbai', addons:[]}, m3);
console.log('local band:', e3.low, '–', e3.high, '→', e3.base === 17500*0+8200 ? 'local 2BHK 8200 ✓' : e3.base);
// unknown city → unsupported
const m4 = resolveMove('Pune','Mumbai',[...cities],routes); console.log('unsupported Pune:', m4.ok===false && m4.unsupported ? 'PASS ✓' : 'FAIL');
