import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import {
  flaps, formPose, formStart, packetEnd, sheetEdges, sheetPose, sheetUV,
} from '../models/section-poses.mjs';

const modelIDs = ['crown','paper-boat','kawasaki-rose'];
const poseFile = id => new URL(`../models/${id}/poses.fold`, import.meta.url);
const generated = new URL('../src/lib/fold/generated/', import.meta.url);
const round = n => Math.round(n*10000)/10000;
const samples = 33;

function poseFrame({points,material}) {
  return {
    vertices_coords: points.map(p => p.map(round)),
    'foldJournal:material': material.map(round),
  };
}

// Both topologies carry a frame at the moment the sheet becomes a flat
// packet. FOLD frame numbers count the root as zero. A frame inherits only
// from the root of its own topology.
function sampleModel(id, mesh, elevation) {
  const form = formStart(id,mesh,elevation);
  const stages = [
    {
      faces_vertices: flaps, 'foldJournal:uv':sheetUV,
      edges_vertices: [...sheetEdges.boundary,...sheetEdges.interior],
      edges_assignment: [...sheetEdges.boundary.map(()=>'B'),...sheetEdges.interior.map(()=>'U')],
    },
    {
      faces_vertices:mesh.faces, 'foldJournal:uv':form.uv.map(p=>p.map(round)),
      'foldJournal:shades':mesh.shades,
    },
  ];
  const frames = [];
  for (let stage=0; stage<stages.length; stage++) {
    const parent = frames.length;
    for (let index=0; index<samples; index++) {
      const t = index/(samples-1);
      const pose = stage ? formPose(id,form,t) : sheetPose(id,t);
      const topology = index === 0 ? stages[stage] : {frame_parent:parent, frame_inherit:true};
      frames.push({
        ...topology, frame_classes:parent === 0 && index === 0 ? ['creasePattern'] : ['foldedForm'],
        frame_attributes:['3D'], ...poseFrame(pose),
      });
    }
  }
  return {
    file_spec:1.1, file_creator:'Fold Journal', file_classes:['singleModel'], file_title:id,
    'foldJournal:packetEnd':packetEnd, 'foldJournal:formFrame':samples,
    ...frames[0], file_frames:frames.slice(1),
  };
}

function packStage(frames, firstIndex) {
  if (frames.length < 2) throw Error('A fold stage needs at least two poses');
  const first = frames[0], uv = first['foldJournal:uv'];
  const vertexCount = uv.length;
  if (!vertexCount || !first.faces_vertices.length || !first.faces_vertices.every(tri =>
    tri.length === 3 && tri.every(i => Number.isInteger(i) && i >= 0 && i < vertexCount))) {
    throw Error('Invalid folded panel topology');
  }
  const shades = first['foldJournal:shades'];
  if (shades && (shades.length !== first.faces_vertices.length ||
    shades.some(t => !Number.isInteger(t) || t < 0 || t > 120))) throw Error('Invalid folded face shades');
  const bytes = Buffer.alloc(frames.length*vertexCount*3*2);
  let offset = 0;
  for (const [index,frame] of frames.entries()) {
    if (frame.vertices_coords.length !== vertexCount ||
      (index > 0 && (frame.frame_parent !== firstIndex || !frame.frame_inherit))) {
      throw Error('Fold pose and topology count disagree');
    }
    for (const point of frame.vertices_coords) {
      if (point.length !== 3) throw Error('Expected an XYZ position');
      for (const value of point) {
        const integer = Math.round(value*10000);
        if (!Number.isSafeInteger(integer) || integer < -32768 || integer > 32767) throw Error('Position exceeds int16 precision range');
        bytes.writeInt16LE(integer,offset);
        offset += 2;
      }
    }
  }
  return {
    uv, triangles:first.faces_vertices, ...(shades && {shades}),
    material:frames.map(f=>f['foldJournal:material']), positions:bytes.toString('base64'),
  };
}

function packModel(source) {
  const { file_frames, ...root } = source, frames = [root,...file_frames];
  const split = root['foldJournal:formFrame'];
  const last = frames.at(-1).vertices_coords;
  const xs = last.map(p=>p[0]), ys = last.map(p=>p[1]);
  const form = packStage(frames.slice(split),split);
  const sheet = packStage(frames.slice(0,split),0);
  const scores = root.edges_vertices.filter((_,i) => root.edges_assignment[i] !== 'B');
  return {
    packetEnd:root['foldJournal:packetEnd'], width:Math.max(...xs)-Math.min(...xs),
    height:Math.max(...ys)-Math.min(...ys), scores, sheet, form,
  };
}

async function packFiles(ids) {
  const clips = {};
  for (const id of ids) clips[id] = packModel(JSON.parse(await readFile(poseFile(id),'utf8')));
  const file = new URL('section-clips.js',generated);
  await mkdir(generated,{recursive:true});
  await writeFile(file, '// Generated from models/*/poses.fold by scripts/bake-motion.mjs.\n' +
    'export const sectionClips = ' + JSON.stringify(clips) + ';\n');
}

export async function writeMotionClips(models) {
  if (modelIDs.some(id => !models.some(model => model.id === id)) || models.length !== modelIDs.length) {
    throw Error('Expected crown, paper-boat and kawasaki-rose');
  }
  for (const {id, mesh, elevation=30} of models) {
    const {file_frames, ...root} = sampleModel(id,mesh,elevation);
    const lines = Object.entries(root).map(([key,value]) => '  '+JSON.stringify(key)+': '+JSON.stringify(value)+',');
    const children = file_frames.map(f=>'    '+JSON.stringify(f)).join(',\n');
    await writeFile(poseFile(id), '{\n'+lines.join('\n')+'\n  "file_frames": [\n'+children+'\n  ]\n}\n');
  }
  await packFiles(modelIDs);
}

// Repack edited FOLD snapshots without regenerating their positions.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  if (process.argv[2] !== '--pack') throw Error('Usage: node scripts/bake-motion.mjs --pack');
  await packFiles(modelIDs);
}
