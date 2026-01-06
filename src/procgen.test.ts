/* Procgen Integration Test */
import ProcGen from "./procgen.ts";

//
// BEGIN
//
let procgen = new ProcGen(null, {
  RoomPlacement: {
    num_rooms: 9,
  },
  CellularAutomata: {
    Splotch: {
      cycles: 25,
    },
    Solidify: {
      cycles: 2,
      threshold: 5,
    },
  },
  BridgePlacement: {
    enabled: true,
  },
  CoverPlacement: {
    num_cover: 20,
  },
  WindowPlacement: {
    num_windows: 30,
    penetration: 3,
  },
  MountainPlacement: {
    num_mountains: 5,
  },
  PlayerPlacement: {
    enabled: true,
  },
  PropPlacement: {
    
  },
}).process().display2d();

// let voronoiDiagram = new VoronoiDiagram(procgen);
// let getCenterAt = (x, y) => procgen.saturn.getAt(x, y, 0).getBBox().center();
// let points = [
//   getCenterAt(12, 12),
//   getCenterAt(12, 36),
//   getCenterAt(36, 12),
//   getCenterAt(36, 36),
// ];

// voronoiDiagram.compute(points);
// console.log(voronoiDiagram.getEquidistantPoints());


// Simplex Test

// let simplex = new SimplexNoise(procgen, {
//   resolution: [10, 10],
//   offset: [0., 0.],
// });

// simplex.forEachNoiseIndex((i, j, noise) => {
//   if (i != 0) return;
//   console.log(noise);
// });
