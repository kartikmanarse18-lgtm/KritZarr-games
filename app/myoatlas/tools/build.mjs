// Convert Svitylo/Z-Anatomy economy GLB chunks into a compact per-structure binary.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import fs from 'node:fs';
import zlib from 'node:zlib';

const REL = process.argv[2];            // .../releases/1.2.0
const OUT = process.argv[3];            // output dir
const SYSTEMS = process.argv[4].split(',');   // e.g. muscular,skeletal
const TAG = process.argv[5];            // output basename

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

const manifest = JSON.parse(fs.readFileSync(REL + '/manifest.json', 'utf8'));
const BMIN = [-0.36, 0.0, -0.12], BMAX = [0.36, 1.76, 0.22];   // world quantisation box (covers bounds with margin)
const Q = 65535;

// global mesh index -> structure id
const meshOwner = new Map();
for (const s of manifest.structures) if (SYSTEMS.includes(s.system) && s.meshes) for (const mi of s.meshes) meshOwner.set(mi, s.id);

const out = [];   // {id, nv, ni, pos: Uint16Array, idx: Uint16Array|Uint32Array}
const chunks = manifest.chunks.filter(c => SYSTEMS.includes(c.system));
let totalTri = 0;
for (const ch of chunks) {
  const f = REL + '/' + ch.files.economy.path;
  const doc = await io.read(f);
  const node = doc.getRoot().listNodes()[0];
  const T = node.getTranslation(), S = node.getScale();
  for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION'), idA = prim.getAttribute('_ID'), ind = prim.getIndices();
    const pc = pos.getCount(), parr = pos.getArray(), norm = pos.getNormalized();
    const wx = new Float32Array(pc), wy = new Float32Array(pc), wz = new Float32Array(pc);
    for (let i = 0; i < pc; i++) {
      let a = parr[i*3], b = parr[i*3+1], c = parr[i*3+2];
      if (norm) { a = Math.max(a/32767,-1); b = Math.max(b/32767,-1); c = Math.max(c/32767,-1); }
      wx[i] = T[0] + S[0]*a; wy[i] = T[1] + S[1]*b; wz[i] = T[2] + S[2]*c;
    }
    const ida = idA.getArray();
    const ia = ind.getArray();
    const groups = new Map();   // meshIndex -> {map:Map, pos:[], idx:[]}
    for (let t = 0; t < ia.length; t += 3) {
      const v0 = ia[t], mi = ida[v0*2];
      let g = groups.get(mi); if (!g) { g = { map: new Map(), pos: [], idx: [] }; groups.set(mi, g); }
      for (let k = 0; k < 3; k++) {
        const v = ia[t+k];
        const qx = Math.round((wx[v]-BMIN[0])/(BMAX[0]-BMIN[0])*Q), qy = Math.round((wy[v]-BMIN[1])/(BMAX[1]-BMIN[1])*Q), qz = Math.round((wz[v]-BMIN[2])/(BMAX[2]-BMIN[2])*Q);
        const key = qx + ',' + qy + ',' + qz;
        let ni = g.map.get(key);
        if (ni === undefined) { ni = g.pos.length/3; g.map.set(key, ni); g.pos.push(qx, qy, qz); }
        g.idx.push(ni);
      }
    }
    for (const [mi, g] of groups) {
      const id = meshOwner.get(mi);
      if (!id) continue;
      // drop degenerate triangles
      const idx = [];
      for (let t = 0; t < g.idx.length; t += 3) { const a=g.idx[t], b=g.idx[t+1], c=g.idx[t+2]; if (a!==b && b!==c && a!==c) idx.push(a,b,c); }
      out.push({ id, mi, nv: g.pos.length/3, ni: idx.length, pos: Uint16Array.from(g.pos), idx: idx.length && g.pos.length/3 < 65536 ? Uint16Array.from(idx) : Uint32Array.from(idx) });
      totalTri += idx.length/3;
    }
  }
  console.error('chunk', ch.id, 'ok');
}

// pack: [pos uint16 x nv*3][idx uint16/32]  — 4-byte aligned
const index = []; const bufs = []; let off = 0;
for (const o of out) {
  const posB = Buffer.from(o.pos.buffer, o.pos.byteOffset, o.pos.byteLength);
  let idxB = Buffer.from(o.idx.buffer, o.idx.byteOffset, o.idx.byteLength);
  const idxBytes = o.idx instanceof Uint32Array ? 4 : 2;
  const e = { id: o.id, nv: o.nv, ni: o.ni, ib: idxBytes, off };
  index.push(e);
  bufs.push(posB); off += posB.length;
  bufs.push(idxB); off += idxB.length;
  const pad = (4 - (off % 4)) % 4; if (pad) { bufs.push(Buffer.alloc(pad)); off += pad; }
}
const bin = Buffer.concat(bufs);
const gz = zlib.gzipSync(bin, { level: 9 });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(`${OUT}/${TAG}.index.json`, JSON.stringify({ bmin: BMIN, bmax: BMAX, items: index }));
fs.writeFileSync(`${OUT}/${TAG}.bin.gz`, gz);
console.error(`${TAG}: ${out.length} meshes, ${totalTri} tris, raw ${(bin.length/1e6).toFixed(2)} MB, gz ${(gz.length/1e6).toFixed(2)} MB`);
