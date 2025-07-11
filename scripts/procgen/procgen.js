/* Procedural Generation Library */

// https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
// Seeded Random Generator

// Pad the input seed into a hashed value
function cyrb128(str) {
  let h1 = 1779033703, h2 = 3144134277,
      h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= (h2 ^ h3 ^ h4), h2 ^= h1, h3 ^= h1, h4 ^= h1;
  return [h1>>>0, h2>>>0, h3>>>0, h4>>>0];
}

// Seeded Random Number Generator Algorithm
function sfc32(a, b, c, d) {
  return function() {
    a |= 0; b |= 0; c |= 0; d |= 0;
    let t = (a + b | 0) + d | 0;
    d = d + 1 | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = (c << 21 | c >>> 11);
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  };
}

const DEFAULT_TOTAL_DISTRIBUTION = 10_000_000;
class SeededRandomNumberGenerator {
  constructor(_seed, options) {
    // Options
    options = options || {};

    this.total_distribution = options.total_distribution || DEFAULT_TOTAL_DISTRIBUTION;

    // Create cyrb128 state:
    this.seed = _seed;
    this.hashed_seed = cyrb128(_seed);
    // Four 32-bit component hashes provide the seed for sfc32.
    this.generator = sfc32(this.hashed_seed[0], this.hashed_seed[1],
			   this.hashed_seed[2], this.hashed_seed[3]);
  }

  _get_distribution(tupl, norm_factor) {
    let dist = [];
    let cstart = 0;
    for (let i = 0; i < tupl.length; i++) {
      let value =   tupl[i][0];
      let percent = tupl[i][1];
      let cend =    cstart + (percent * norm_factor);
      dist.push([cstart, cend, value]);
      cstart = cend;
    }
    return dist; // [[cstart, cend, value], ...]
  }
  
  /*
    Example:
    
    let srng = new SeededRandomNumberGenerator("Test2");
    let dist = {
      Head: 2,
      Chest: 3,
      Legs: 1,
    }
    let gen = () => { return srng.random_distribution(dist); };
    console.log(gen()); // Head
    console.log(gen()); // Head
    console.log(gen()); // Legs
    console.log(gen()); // Chest
    console.log(gen()); // Chest
    console.log(gen()); // Chest

    // actual output varies by seed.
    */

  // Get random distribution based on tuple 
  random_distribution(o) {
    let tupl = [];
    for (const [k, v] of Object.entries(o)) {
      tupl.push([k, v]);
    }
    let percent_total = tupl.reduce((sum, pair) => {
      return (pair[1] + sum);
    }, 0);

    let norm_factor = this.total_distribution / percent_total;
    let distribution = this._get_distribution(tupl, norm_factor);
    let rpos = this.generator() * this.total_distribution;
    return distribution.find((tupl) => {
      let cstart = tupl[0];
      let cend = tupl[1];
      return (rpos >= cstart && rpos <= cend);
    })[2];
  }

  // `norm` is a value between 0.0 and 1.0, and returns true if the
  // generated value is less than `norm`.
  /*
    Examples
    let srng = new SeededRandomNumberGenerator("Test");
    let coinFlip = () => { return srng.random_normal(0.5); };
    let quarter = () => { return coinFlip() && coinFlip(); };
    let deca = () => { return srng.random_normal(0.1); };
  */
  random_normal(norm) {
    return (this.generator() <= norm);
  }

  random_float(start, end) {
    if (end === undefined) {
      end = start || 1;
      start = 0;
    }
    let result = (end - start) * this.generator() + start;
    return result;
  }

  random_integer(start, end) {
    return Math.round(this.random_float(start, end));
  }
}

// Saturn Phantom
let SaturnDimensions = [6, 6];       // [Width, Height]
let CubeDimensions = [8, 8, 8];      // [Width, Height, Depth]
let ElementDimensions = [48, 48, 8];

class Saturn {
  constructor() {
    // Populate Elements
    this.elements = [];
    this.forEachIndex((i, j, k) => {
      this.elements.push({
        fill: false,
      });
    });

    // Populate Cubes
    this.cubes = [];
    this.forEachCubeIndex((i, j) => {
      this.cubes.push({
	playerSpawn: false,
      });
    });
  }

  width() { return ElementDimensions[0]; }
  height() { return ElementDimensions[1]; }
  depth() { return ElementDimensions[2]; }
  size() {
    return (this.width() * this.height() * this.depth());
  }

  index(x, y, z) {
    let array_index = this.width() * (this.height() * z + y) + x;
    return array_index;
  }

  forEachIndex(f) {
    for (let k = 0; k < this.depth(); k++) {
      for (let j = 0; j < this.height(); j++) {
        for (let i = 0; i < this.width(); i++) {
          f.bind(this)(i,j,k);
        }
      }
    }
  }

  getAt(x, y, z) {
    return this.elements[this.index(x,y,z)];
  }

  getAtIndex(idx) {
    return this.elements[idx];
  }

  // Cube Magic

  cubeWidth() { return SaturnDimensions[0]; }
  cubeHeight() { return SaturnDimensions[1]; }
  cubeSize() { return (this.cubeWidth() * this.cubeHeight()); }
  cubeIndex(x, y) {
    let array_index = this.width() * y + x;
    return array_index;
  }
  
  forEachCubeIndex(f) {
    for (let j = 0; j < this.cubeHeight(); j++) {
      for (let i = 0; i < this.cubeWidth(); i++) {
	f.bind(this)(i, j);
      }
    }
  }

  getCubeAt(x, y) {
    return this.cubes[this.cubeIndex(x, y)];
  }

  getCubeAtIndex(idx) {
    return this.cubes[idx];
  }

  fill(x, y, z) {
    this.getAt(x, y, z).fill = true;
  }

  unfill(x, y, z) {
    this.getAt(x, y, z).fill = false;
  }

  // Only displays the first z-plane, [i, j, 0]
  display2d() {
    let s = "";
    for (let j = 0; j < this.height(); j++) {
      for (let i = 0; i < this.width(); i++) {
	let element = this.getAt(i,j,0);
	if (element.fill) {
	  s += "X";
	}
	else {
	  s += " ";
	}
      }
      s += "\n";
    }
    console.log("\n" + s);
  }
}

/*
  
  Procedural Generation Strategies

 */


// Room Placement
const RP_DEFAULT_BORDER_WIDTH = 1;
const RP_DEFAULT_HALLWAY_WIDTH = 3;
const RP_DEFAULT_CEILING_HEIGHT = 4;
const RP_DEFAULT_NUM_ROOMS = 6;
class RoomPlacement {
  constructor(procgen, options) {
    this.srng = procgen.srng;
    this.saturn = procgen.saturn;
    this.options = options || {};
    this.layout_distribution = options.layout_distribution || {
      BigRoom: 20,
      SmallRoom: 50,
      LongRoom: 10,
    };
    this.borderWidth = options.borderWidth || RP_DEFAULT_BORDER_WIDTH;
    this.hallwayWidth = options.hallwayWidth || RP_DEFAULT_HALLWAY_WIDTH;
    this.ceilingHeight = options.ceilingHeight || RP_DEFAULT_CEILING_HEIGHT;
    this.numRooms = options.numRooms || RP_DEFAULT_NUM_ROOMS;

    //
    this.placedRooms = [];
    this.placedHallways = [];
  }

  // Generate Room Placement
  _generate_rooms() {
    while (this.placedRooms.length < this.numRooms) {
      let layout_type = this.srng.random_distribution(this.layout_distribution);
      let roomDimensions = [0, 0];
      if (layout_type == "BigRoom") {
	roomDimensions[0] = this.srng.random_integer(10,20);
	roomDimensions[1] = this.srng.random_integer(10,20);
      }
      else if (layout_type == "SmallRoom") {
	roomDimensions[0] = this.srng.random_integer(5,10);
	roomDimensions[1] = this.srng.random_integer(5,10);
      }
      else if (layout_type == "LongRoom") {
	// Horizontal
	if (this.srng.random_normal(0.5)) {
	  roomDimensions[0] = this.srng.random_integer(10,20);
	  roomDimensions[1] = this.srng.random_integer(5,7);
	}
	// Vertical
	else {
	  roomDimensions[0] = this.srng.random_integer(5,7);
	  roomDimensions[1] = this.srng.random_integer(10,20);
	}
      }

      // Get Starting X and Y positions to place the top-left corner of the room.
      let roomPosition = [
	this.srng.random_integer(this.saturn.width()-1),
	this.srng.random_integer(this.saturn.height()-1),
      ];
      
      let room = {
	x: roomPosition[0],
	y: roomPosition[1],
	w: roomDimensions[0],
	h: roomDimensions[1],
      };

      // Check if the room is within the world bounds.
      if ((room.x + room.w) > this.saturn.width() ||
	  (room.y + room.h) > this.saturn.height())
	continue;
      
      // Check if it can co-exist with other placed rooms
      let bCollision = false;
      for (let i = 0; i < this.placedRooms.length; i++) {
	let placedRoom = this.placedRooms[i];
	// BB Checks

	// x-overlap
	if ((room.x + room.w) < placedRoom.x || room.x > (placedRoom.x + placedRoom.w))
	  continue;

	// y-overlap
	if ((room.y + room.h) < placedRoom.y || room.y > (placedRoom.y + placedRoom.h))
	  continue;

	bCollision = true;
      }
      if (!bCollision) this.placedRooms.push(room);
    }
  }

  _generate_hallways() {
    
  }

  _modify_saturn() {
    console.log(this.placedRooms);
    this.saturn.forEachIndex((i,j,k) => {
      this.placedRooms.map((placedRoom) => {
	if ((i == placedRoom.x || i == (placedRoom.x + placedRoom.w-1)) &&
	    (j >= placedRoom.y && j <= (placedRoom.y + placedRoom.h-1)) ||
	    (j == placedRoom.y || j == (placedRoom.y + placedRoom.h-1)) &&
	    (i >= placedRoom.x && i <= (placedRoom.x + placedRoom.w-1))) {
	  this.saturn.getAt(i, j, k).fill = true;
	}
      });
    });
  }

  process() {
    this._generate_rooms();
    this._generate_hallways();
    this._modify_saturn();
    return this;
  }
  
}

// Animated BSP
// skip...

// Cellular Automata
class CellularAutomata {
  constructor(procgen, options) {
    this.procgen = procgen;
    this.saturn = procgen.saturn;
    this.srng = procgen.srng;
    this.options = options || {};
  }

  process() {
    
  }
}


// Drunkard's Walk
// Diffusion Limited Aggregation
// Centralized DLA



// Voronoi Diagrams
// Perlin or Simplex Noise


// Combine Techniques...
class ProcGen {
  constructor(seed, options) {
    this.seed = seed || "test";
    this.options = options || {};
    this.srng = new SeededRandomNumberGenerator(seed);
    this.saturn = new Saturn();

    // ProcGen Strategies
    this.roomPlacement = new RoomPlacement(
      this,
      this.options.RoomPlacement,
    );

    this.cellularAutomata = new CellularAutomata(
      this,
      this.options.CellularAutomata,
    );

    return this;
  }

  process() {
    this.roomPlacement.process();
    return this;
  }

  display2d() {
    this.saturn.display2d();
    return this;
  }
}



// BEGIN
let srng = new SeededRandomNumberGenerator("Test4");
let dist = {
  Head: 2,
  Chest: 3,
  Legs: 1,
};
let gen = () => { return srng.random_distribution(dist); };
let coinFlip = () => { return srng.random_normal(0.5); };

let procgen = new ProcGen("test", {
  RoomPlacement: {
    numRooms: 6,
  },
  CellularAutomata: {
    
  },
})
.process()
.display2d();
