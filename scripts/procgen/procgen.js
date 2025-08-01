 //@ts-nocheck
//
// Procedural Generation Library
//

/*
  Utility Libraries
 */

function DeepCopy(o) {
  return JSON.parse(JSON.stringify(o));
}


/*
   Unseeded Random Generator
*/


function RandomInteger(start, end) {
  if (end === undefined) {
    end = start;
    start = 0;
  }
  let rf = Math.random() * (end - start) + start;
  return Math.round(rf);
}

function RandomWord() {
  let word_array = [
    "Alfa","Bravo","Charlie",
    "Delta","Echo","Foxtrot",
    "Golf", "Hotel", "India",
    "Juliet", "Kilo", "Lima",
    "Mike", "November", "Orb",
    "Papa", "Quebec", "Romeo",
    "Sierra", "Tango", "Uniform",
    "Victor", "Whiskey", "Xray",
    "Yankee", "Zulu",
  ];
  let random_index = RandomInteger(word_array.length-1);
  return word_array[random_index];
}

function RandomSeed() {
  let s = RandomWord() + "-";
  for (let i = 0; i < 3; i++)
    s += RandomInteger(0,9);
  return s;
}


/*
   Seeded Random Generator

   Notes:
   - https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript

*/ 


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

  _getDistribution(tupl, norm_factor) {
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
    let gen = () => { return srng.randomDistribution(dist); };
    console.log(gen()); // Head
    console.log(gen()); // Head
    console.log(gen()); // Legs
    console.log(gen()); // Chest
    console.log(gen()); // Chest
    console.log(gen()); // Chest
    */

  // Get random distribution based on tuple 
  randomDistribution(o) {
    let tupl = [];
    for (const [k, v] of Object.entries(o)) {
      tupl.push([k, v]);
    }
    let percent_total = tupl.reduce((sum, pair) => {
      return (pair[1] + sum);
    }, 0);

    let norm_factor = this.total_distribution / percent_total;
    let distribution = this._getDistribution(tupl, norm_factor);
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
    let coinFlip = () => { return srng.randomChance(0.5); };
    let quarter = () => { return coinFlip() && coinFlip(); };
    let deca = () => { return srng.randomChance(0.1); };
  */
  randomChance(norm) {
    return (this.generator() <= norm);
  }

  randomFloat(start, end) {
    if (end === undefined) {
      end = start || 1;
      start = 0;
    }
    let result = (end - start) * this.generator() + start;
    return result;
  }

  randomInteger(start, end) {
    return Math.round(this.randomFloat(start, end));
  }
}



//
// SATURN
//

//  x --+
// y z
// |  \
// |   \
// +    -

let SaturnDimensions = [6, 6];       // [Width, Height]
let CubeDimensions = [8, 8, 8];      // [Width, Height, Depth]
let ElementWidth = SaturnDimensions[0] * CubeDimensions[0];
let ElementHeight = SaturnDimensions[1] * CubeDimensions[1];
let ElementDepth = CubeDimensions[2];
let ElementDimensions = [ElementWidth, ElementHeight, ElementDepth];

// Individual Elements that make up Saturn
class SaturnElement {
  constructor(saturn, x, y, z) {
    this.saturn = saturn;
    this.x = x;
    this.y = y;
    this.z = z;
    this.type = "empty";
  }

  // Return a deep copy, or clone of the element.
  clone() {
    let element_clone = new SaturnElement(this.saturn, this.x, this.y, this.z);
    element_clone.setType(this.getType());
    return element_clone;
  }

  getType() { return this.type; }
  setType(_type) { this.type = _type; }
  getParentCube() {
    return this.saturn.getCubeFromElement(this.x, this.y, this.z);
  }

  fill() {
    this.type = "fill";
  }

  empty() {
    this.type = "empty";
  }

  isEmpty() { return (this.type == "empty"); }

  floor() {
    this.type = "floor";
  }

  isFloor() { return (this.type == "floor"); }

  bridge() {
    this.type = "bridge";
  }

  isBridge() { return (this.type == "bridge"); }
}

// Individual Cube Elements that make up Saturn's Cube.
class SaturnCubeElement {
  constructor(saturn, x, y) {
    this.saturn = saturn;
    this.x = x;
    this.y = y;
    this.player_spawn = false;
  }
}

// Handles the 'Cube' elements that comprise the map.
class SaturnCube {
  constructor(saturn) {
    this.saturn = saturn;
    this.elements = [];
    this.forEachIndex((i, j) => {
      this.elements.push(new SaturnCubeElement(this.saturn, i, j));
    });
  }

  width() { return SaturnDimensions[0]; }
  height() { return SaturnDimensions[1]; }
  size() { return (this.width() * this.height()); }
  index(x, y) {
    let array_index = this.width() * y + x;
    return array_index;
  }
  
  forEachIndex(f) {
    for (let j = 0; j < this.height(); j++) {
      for (let i = 0; i < this.width(); i++) {
	f.bind(this)(i, j);
      }
    }
  }

  getAt(x, y) {
    return this.cubes[this.index(x, y)];
  }

  getAtIndex(idx) {
    return this.cubes[idx];
  }
}

// A Deep Copy of Saturn's elements as a (x, y) slice (i, j, 0); k=0
// Implemented as a derivative of Saturn.
class Saturn2D {
  constructor(saturn, options) {
    this.saturn = saturn;
    this.options = options || {};

    this.elements = [];
    this.forEachIndex((i, j) => {
      this.elements.push(this.saturn.getAt(i,j,0).clone());
    });

    return this;
  }

  width() { return this.saturn.width(); }
  height() { return this.saturn.height(); }
  size() { return (this.width() * this.height()); }
  index(x, y) { return this.saturn.index(x,y,0); }
  forEachIndex(f) {
    for (let j = 0; j < this.height(); j++) {
      for (let i = 0; i < this.width(); i++) {
	f.bind(this)(i,j);
      }
    }    
  }

  getAt(x, y) {
    return this.elements[this.index(x,y)];
  }

  getAtIndex(idx) { return this.elements[idx]; }
  display2d() { this.saturn.display2d(); }
}

// Saturn Pathfinding
class Pathfinding {
  constructor(procgen, options) {
    this.procgen = procgen;
    this.saturn = procgen.saturn;
    this.srng = procgen.srng;
    this.options = options || {};
  }

  getShortestPaths(x, y) {
    let saturn2D = new Saturn2D(this.saturn);
    this._prepareSaturn2D(saturn2D);
    let starting_node = saturn2D.getAt(x, y);
    starting_node.sentinel = 0;
    this._calculateCost(saturn2D, x, y);
  }

  _calculateCost(saturn2D, x, y) {
    let element = saturn2D.getAt(x, y);
    element.visited = true;
    
    //top square
    this._scoreTop(saturn2D, x, y);
  }

  _elementCalculateTypeCost(type) {
    if (type == "fill") {
      return 100;
    }
    else if (type == "floor") {
      return 10;
    }

    else if (type == "empty") {
      return 1000;
    }
    else {
      throw new Error("Unknown Type: " + type);
    }    
  }

  // Returns the element cost for sentinel comparison.
  _elementCost(saturn2D, x, y) {
    let element = saturn2D.getAt(x, y);
    let type = element.getType();
    let cost = this._elementCalculateTypeCost(type);
    return cost;
  }

  _scoreTop(saturn2D, x, y) {
    if (y <= 0) return;
    let element = saturn2D.getAt(x, y);
    let other_element = saturn2D.getAt(x, y-1);
    
  }

  _prepareSaturn2D(saturn2D) {
    saturn2D.forEachIndex((i, j) => {
      let element = saturn2D.getAt(i, j);
      element.sentinel = null;
      element.parent = null;
      element.visited = false;
    });
  }

  _djikstraIteration() {
    
  }

}


// Saturn Itself
// - this.elements[SaturnElement, ...,]
// - SaturnCube -> this.cubes[SaturnCubeElement, ...,]
class Saturn {
  constructor() {
    // Populate Elements
    this.elements = [];
    this.forEachIndex((i, j, k) => {
      this.elements.push(new SaturnElement(this, i, j, k));
    });

    // Populate Cubes
    this.cubes = new SaturnCube(this);

    return this;
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

  // Get the parent cube based on an element index.
  getCubeFromElement(x, y, z) {
    let cubeX = Math.floor(x / this.cubes.width());
    let cubeY = Math.floor(y / this.cubes.height());
    return this.cubes.getAt(cubeX, cubeY);
  }

  // Only displays the first z-plane, [i, j, 0]
  display2d() {
    let s = "";
    for (let j = 0; j < this.height(); j++) {
      for (let i = 0; i < this.width(); i++) {
	let element = this.getAt(i,j,0);
	if (element.getType() == "fill") {
	  s += "X";
	}
	else if (element.getType() == "floor") {
	  s += ".";
	}
	else if (element.getType() == "bridge") {
	  s += "b";
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


//
// Room Placement
//


const RP_DEFAULT_HALLWAY_WIDTH = 3;
const RP_DEFAULT_CEILING_HEIGHT = 4;
const RP_DEFAULT_NUM_ROOMS = 6;
class RoomPlacement {
  constructor(procgen, options) {
    this.srng = procgen.srng;
    this.saturn = procgen.saturn;
    this.options = options || {};
    this.enabled = (this.options.enabled !== undefined) ? this.options.enabled : true;
    this.layout_distribution = options.layout_distribution || {
      BigRoom: 20,
      SmallRoom: 50,
      LongRoom: 10,
    };
    this.hallway_width = options.hallway_width ||
      RP_DEFAULT_HALLWAY_WIDTH;
    this.ceiling_height = options.ceiling_height ||
      RP_DEFAULT_CEILING_HEIGHT;
    this.num_rooms = options.num_rooms || RP_DEFAULT_NUM_ROOMS;
    this.placed_rooms = [];
    
    return this;
  }

  // Generate Room Placement
  _generateRooms() {
    while (this.placed_rooms.length < this.num_rooms) {
      let layout_type = this.srng.randomDistribution(this.layout_distribution);
      let room_dimensions = [0, 0];
      if (layout_type == "BigRoom") {
	room_dimensions[0] = this.srng.randomInteger(10,20);
	room_dimensions[1] = this.srng.randomInteger(10,20);
      }
      else if (layout_type == "SmallRoom") {
	room_dimensions[0] = this.srng.randomInteger(5,10);
	room_dimensions[1] = this.srng.randomInteger(5,10);
      }
      else if (layout_type == "LongRoom") {
	// Horizontal
	if (this.srng.randomChance(0.5)) {
	  room_dimensions[0] = this.srng.randomInteger(10,20);
	  room_dimensions[1] = this.srng.randomInteger(5,7);
	}
	// Vertical
	else {
	  room_dimensions[0] = this.srng.randomInteger(5,7);
	  room_dimensions[1] = this.srng.randomInteger(10,20);
	}
      }

      // Get Starting X and Y positions to place the top-left corner
      // of the room.
      let room_position = [
	this.srng.randomInteger(this.saturn.width()-1),
	this.srng.randomInteger(this.saturn.height()-1),
      ];
      
      let room = {
	x: room_position[0],
	y: room_position[1],
	w: room_dimensions[0],
	h: room_dimensions[1],
      };

      // Check if the room is within the world bounds.
      if ((room.x + room.w) > this.saturn.width() ||
	  (room.y + room.h) > this.saturn.height())
	continue;
      
      // Check if it can co-exist with other placed rooms
      let bCollision = false;
      for (let i = 0; i < this.placed_rooms.length; i++) {
	let placed_room = this.placed_rooms[i];
	// BB Checks

	// x-overlap
	if ((room.x + room.w) < placed_room.x ||
	    room.x > (placed_room.x + placed_room.w))
	  continue;

	// y-overlap
	if ((room.y + room.h) < placed_room.y ||
	    room.y > (placed_room.y + placed_room.h))
	  continue;

	bCollision = true;
      }
      if (!bCollision) this.placed_rooms.push(room);
    }
    return this;
  }

  _modifySaturn() {
    this.saturn.forEachIndex((i,j,k) => {
      if (this.isInRoomBorder(i,j,k)) {
	this.saturn.getAt(i, j, k).fill();
      }
      if (this.isInRoom(i,j,k)) {
	let element = this.saturn.getAt(i,j,k);
	if (k == 0) element.floor();
      }
    });

    return this;
  }

  isInRoom(x, y, z) {
    let bCollision = false;
    this.placed_rooms.map((placed_room) => {
      if ((x >= placed_room.x+1 && x <= (placed_room.x + placed_room.w-2)) &&
	  (y >= placed_room.y+1 && y <= (placed_room.y + placed_room.h-2))) {
	bCollision = true;
      }
    });
    return bCollision;
  }

  isInRoomBorder(x, y, z) {
    let bCollision = false;
    this.placed_rooms.map((placed_room) => {
      if ((x == placed_room.x || x == (placed_room.x + placed_room.w-1)) &&
	  (y >= placed_room.y && y <= (placed_room.y + placed_room.h-1)) ||
	  (y == placed_room.y || y == (placed_room.y + placed_room.h-1)) &&
	  (x >= placed_room.x && x <= (placed_room.x + placed_room.w-1))) {
	bCollision = true;
      }
    });
    return bCollision;
  }

  getPlacedRooms() { return this.placed_rooms; }

  process() {
    if (!this.enabled) return;
    this._generateRooms();
    this._modifySaturn();
  }
}

// Animated BSP
// skip...

//
// Cellular Automata
//

class SplotchCell {
  constructor(procgen, x, y) {
    this.procgen = procgen;
    this.saturn = this.procgen.saturn;
    this.splotchSystem = procgen.cellularAutomata.splotchSystem;
    this.x = x;
    this.y = y;

    return this;
  }

  tick() {
    // Heuristics to make the sploosh gravitate towards the center.
    let right_incentive = (1 - (this.x / this.saturn.width())) * this.saturn.width();
    let up_incentive = (1 - (this.y / this.saturn.height())) * this.saturn.height();
    let left_incentive = this.saturn.width() - right_incentive;
    let down_incentive = this.saturn.height() - up_incentive;

    let looky_distribution = {
      up: up_incentive,
      right: right_incentive,
      down: down_incentive,
      left: left_incentive,
    };
    let looky = this.procgen.srng.randomDistribution(looky_distribution);
    if (looky == "up") {
      if (this.y == 0) return [];
      if (this.splotchSystem.seek(this.x, this.y-1)) return [];
      if (!this.saturn.getAt(this.x, this.y-1, 0).isEmpty()) return [];
      return [new SplotchCell(this.procgen, this.x, this.y-1)];
    }
    else if (looky == "right") {
      if (this.x == this.saturn.width()-1) return [];
      if (this.splotchSystem.seek(this.x+1, this.y)) return [];
      if (!this.saturn.getAt(this.x+1, this.y, 0).isEmpty()) return [];
      return [new SplotchCell(this.procgen, this.x+1, this.y)];
    }
    else if (looky == "down") {
      if (this.y == this.saturn.height()-1) return [];
      if (this.splotchSystem.seek(this.x, this.y+1)) return [];
      if (!this.saturn.getAt(this.x, this.y+1, 0).isEmpty()) return [];
      return [new SplotchCell(this.procgen, this.x, this.y+1)];
    }
    else if (looky == "left") {
      if (this.x == 0) return [];
      if (this.splotchSystem.seek(this.x-1, this.y)) return [];
      if (!this.saturn.getAt(this.x-1, this.y, 0).isEmpty()) return [];
      return [new SplotchCell(this.procgen, this.x-1, this.y)];
    }
    return [];
  }
}

const DEFAULT_CA_SPLOTCH_CYCLE = 10; //cycles
class SplotchSystem {
  constructor(procgen, options) {
    this.options = options || {};
    this.enabled = (this.options.enabled !== undefined) ? this.options.enabled : true;
    this.procgen = procgen;
    this.saturn = procgen.saturn;
    this.srng = procgen.srng;
    this.cycles = options.cycles || DEFAULT_CA_SPLOTCH_CYCLE;
    this.splotch_listing = [];

    return this;
  }

  _generateStartingPoint() {
    let starting_point = null;
    let lower_bound_x = Math.floor(this.saturn.width() / 4);
    let upper_bound_x = Math.floor(this.saturn.width() / 4) * 3;
    let lower_bound_y = Math.floor(this.saturn.height() / 4);
    let upper_bound_y = Math.floor(this.saturn.height() / 4) * 3;
    
    while(starting_point === null) {
      let xpos = this.srng.randomInteger(lower_bound_x, upper_bound_x);
      let ypos = this.srng.randomInteger(lower_bound_y, upper_bound_y);
      if (this.saturn.getAt(xpos, ypos, 0).isEmpty()) {
	starting_point = [xpos, ypos];
	break;
      }
    }

    return starting_point;
  }

  _wave(x, y) {
    this.splotch_listing.push(new SplotchCell(this.procgen, x, y));
    for (let ic = 0; ic < this.cycles; ic++) {
      let spawn_wave = this.splotch_listing.reduce((acc, splotch) => {
	let siblings = splotch.tick() || [];
	return acc.concat(siblings);
      }, []);
      this.splotch_listing = this.splotch_listing.concat(spawn_wave);
    }
  }

  _modifySaturn() {
    let saturn = this.procgen.saturn;
    this.splotch_listing.map((splotch) => {
      saturn.getAt(splotch.x, splotch.y, 0).floor();
    });
  }

  seek(x, y) {
    return this.splotch_listing.find((splotch) => {
      return (splotch.x == x && splotch.y == y);
    });
  }

  process() {
    if (!this.enabled) return;
    let starting_point = this._generateStartingPoint();
    let xpos = starting_point[0];
    let ypos = starting_point[1];

    this._wave(xpos, ypos);
    this._modifySaturn();
  }
}

const CA_SOLID_CYCLES = 2;
const CA_SOLID_THRESHOLD = 5;
class SolidifySystem {
  constructor(procgen, options) {
    this.procgen = procgen;
    this.saturn = procgen.saturn;
    this.options = options || {};
    this.enabled = (this.options.enabled !== undefined) ? this.options.enabled : true;
    this.cycles = options.cycles || CA_SOLID_CYCLES;
    this.threshold = options.threshold || CA_SOLID_THRESHOLD;

    return this;
  }

  _tick() {
    this.saturn.forEachIndex((i,j,k) => {
      if (k != 0 ||
	  i <= 0 ||
	  j <= 0 ||
	  i >= this.saturn.width()-1 ||
	  j >= this.saturn.height()-1) return;
      let getAt = (i,j) => this.saturn.getAt(i,j,0);
      let solid_count = 0; // Adjacent walls have double weight.
      if (!getAt(i,j+1).isEmpty()) solid_count += 2;
      if (!getAt(i+1,j+1).isEmpty()) solid_count += 1;
      if (!getAt(i+1,j).isEmpty()) solid_count += 2;
      if (!getAt(i+1,j-1).isEmpty()) solid_count += 1;
      if (!getAt(i,j-1).isEmpty()) solid_count += 2;
      if (!getAt(i-1,j-1).isEmpty()) solid_count += 1;
      if (!getAt(i-1,j).isEmpty()) solid_count += 2;
      if (!getAt(i-1,j+1).isEmpty()) solid_count += 1;


      // Modify Saturn
      let element = getAt(i,j);
      if (solid_count < this.threshold && element.isFloor())
	element.empty();
      if (solid_count >= this.threshold && element.isEmpty())
	element.floor();
    });

    return this;
  }

  process() {
    if (!this.enabled) return;
    for (let i = 0; i < this.cycles; i++) {
      this._tick();
    }
  }
}

class CellularAutomata {
  constructor(procgen, options) {
    this.procgen = procgen;
    this.saturn = procgen.saturn;
    this.srng = procgen.srng;
    this.options = options || {};
    this.enabled = (this.options.enabled !== undefined) ? this.options.enabled : true;
    this.splotchSystem = new SplotchSystem(procgen, this.options.Splotch || {});
    this.solidifySystem = new SolidifySystem(procgen, this.options.Solidify || {});

    return this;
  }

  process() {
    if (!this.enabled) return;
    this.splotchSystem.process();
    this.solidifySystem.process();
  }
}

const BP_DEFAULT_BRIDGE_WIDTH = 4;
const BP_DEFAULT_THRESHOLD = 20;
const BP_DEFAULT_BRIDGE_LENGTH = 10;
class BridgePlacement {
  constructor(procgen, options) {
    this.procgen = procgen;
    this.saturn = procgen.saturn;
    this.options = options || {};
    this.enabled = (this.options.enabled !== undefined) ? this.options.enabled : true;
    this.bridge_width = this.options.bridge_width || BP_DEFAULT_BRIDGE_WIDTH;
    this.bridge_length = this.options.bridge_length || BP_DEFAULT_BRIDGE_LENGTH;
    this.threshold = this.options.threshold || BP_DEFAULT_THRESHOLD;
    this.placed_bridges = [];
  }

  _getRoomOutlierScores() {
    let placed_rooms = this.procgen.roomPlacement.getPlacedRooms();
    let outlier_rooms = DeepCopy(placed_rooms);

    // We score each side of each room in the outlier_rooms.
    for (let ri = 0; ri < outlier_rooms.length; ri++) {
      let room = outlier_rooms[ri];

      //top-left -- top-right
      this._scoreTop(room);

      //bot-left -- bot-right
      this._scoreBottom(room);

      //top-left  -- bot-left
      this._scoreLeft(room);

      //top-right -- bot-right
      this._scoreRight(room);
    }
    return outlier_rooms;
  }

  _getRoomHighestScore(outlier_rooms) {
    let highest_scored_room = {score: 0, room: null};
    if (outlier_rooms.length <= 0) return null;
    for (let ri = 0; ri < outlier_rooms.length; ri++) {
      let room = outlier_rooms[ri];
      let total_score = room.top || 0 + room.right || 0 +
	  room.bottom || 0 + room.left || 0;
      if (total_score > highest_scored_room.score) {
	highest_scored_room.score = total_score;
	highest_scored_room.room = room;
      }
    }
    return highest_scored_room.room;
  }

  _scoreTop(room) {
    if (room.y <= 0) {
      room.top = 0;
      return;
    }
    
    let score = 0;
    for (let i = room.x; i < (room.x+room.w); i++) {
      let element = this.saturn.getAt(i, room.y-1, 0);
      if (element.isEmpty()) score += 1;
    }

    // Weighted score out of 10
    score /= (room.w + 1);
    score *= 10;
    
    // Additional weighted scoring based on edge location and side.
    let h = this.saturn.height();
    score += (room.y / h) * 10;
    room.top = score;
    return;
  }

  _scoreRight(room) {
    if ((room.x+room.w) >= this.saturn.width()) {
      room.right = 0;
      return;
    }

    let score = 0;
    for (let i = room.x; i < (room.x+room.w); i++) {
      let element = this.saturn.getAt(i, room.y+room.h, 0);
      if (element.isEmpty()) score += 1;
    }

    // Weighted score out of 10
    score /= (room.h + 1);
    score *= 10;
    
    // Additional weighted scoring based on edge location and side.
    let w = this.saturn.width();
    score += ((w-room.x) / w) * 10;
    room.right = score;
    return;
  }

  _scoreBottom(room) {
   if ((room.y+room.h) >= this.saturn.height()) {
      room.bottom = 0;
      return;
    }

    let score = 0;
    for (let j = room.y; j < (room.y+room.h); j++) {
      let element = this.saturn.getAt(room.x+room.w, j, 0);
      if (element.isEmpty()) score += 1;
    }

    // Weighted score out of 10
    score /= (room.w + 1);
    score *= 10;
    
    // Additional weighted scoring based on edge location and side.
    let h = this.saturn.height();
    score += ((h-room.y) / h) * 10;
    room.bottom = score;
    return;
  }

  _scoreLeft(room) {
    if (room.x <= 0) {
      room.left = 0;
      return;
    }

    let score = 0;
    for (let j = room.y; j < (room.y+room.h); j++) {
      let element = this.saturn.getAt(room.x-1, j, 0);
      if (element.isEmpty()) score += 1;
    }

    // Weighted score out of 10
    score /= (room.h + 1);
    score *= 10;
    
    // Additional weighted scoring based on edge location and side.
    let w = this.saturn.width();
    score += (room.x / w) * 10;
    room.left = score;
    return;
  }

  _wormStartingPosition(room, direction) {
    switch(direction) {
      case "top": return [room.x+Math.round(room.w/2), room.y];
      case "bottom": return [room.x+Math.round(room.w/2), room.y+room.h-1];
      case "right": return [room.x+room.w-1, room.y+Math.round(room.h/2)];
      case "left": return [room.x, room.y+Math.round(room.h/2)];
    }
    throw new Error("Unknown Direction: " + direction);
  }

  process() {
    if (this.enabled === false) return;
    console.log("Enabled", this.enabled);
    let calc_score = (room) => Math.max(room.top, room.right, room.bottom, room.left);
    let room = null;
    do {
      let outlier_rooms = this._getRoomOutlierScores();
      room = this._getRoomHighestScore(outlier_rooms);
      let bridge_direction_horizontal = (room.left > room.right) ?
	  "left" : "right";
      let bridge_direction_vertical = (room.top > room.bottom) ?
	  "top" : "bottom";
      let distribution = {
	top: 0,
	right: 0,
	bottom: 0,
	left: 0,
      };
      distribution[bridge_direction_horizontal] = 10;
      distribution[bridge_direction_vertical] = 10;
      
      let starting_direction = 
	  room[bridge_direction_horizontal] > room[bridge_direction_vertical] ?
	  bridge_direction_horizontal :
	  bridge_direction_vertical;

      let starting_position = this._wormStartingPosition(
	room, starting_direction);
      let wormCrawler = new WormCrawler(this.procgen, {
	start_position: starting_position,
	start_direction: starting_direction,
	distribution: distribution,
	steps: this.bridge_length,
	trail_width: this.bridge_width,
      }).process();
    } while (calc_score(room) >= this.threshold);
  }
}

// Drunkard's Walk
class WormCrawler {
  constructor(procgen, options) {
    this.procgen = procgen;
    this.saturn = procgen.saturn;
    this.srng = procgen.srng;
    this.options = options || {};
    this.enabled = (this.options.enabled !== undefined) ? this.options.enabled : true;
    this.start_direction = this.options.start_direction || "top";
    
    let start_x = Math.floor(this.saturn.width() / 2);
    let start_y = Math.floor(this.saturn.height() / 2);
    this.start_position = this.options.start_position || [start_x, start_y];
    this.distribution = this.options.distribution || {
      top: 10,
      right: 10,
      bottom: 10,
      left: 10,
    };
    this.steps = this.options.steps || 10;
    this.trail_type = this.options.trail_type || "floor";
    this.trail_width = this.options.trail_width || 3;
    this.trail_step_interval = this.options.trail_step_interval || 4;

    //
    this.step_num = 0;
    this.current_position = this.start_position;
    this.current_direction = this.start_direction;
    
    return this;
  }
  
  _step() {
    if (this.step_num != 0 &&
	(this.step_num % this.trail_step_interval) == 0)
      this.current_direction = this.srng.randomDistribution(this.distribution);
    switch(this.current_direction) {
      case "top": this._crawlTop();
      case "right": this._crawlRight();
      case "bottom": this._crawlBottom();
      case "left": this._crawlLeft();
    }
    this.step_num += 1;
  }

  _calculateTrailSpread() {
    if (this.trail_width == 1) return [0, 0];
    if (this.trail_width == 2) return this.srng.randomChance(0.5) ? [1,0] : [0, 1];
    if (this.trail_width % 2 == 0) {
      let spread = this.trail_width / 2;
      return [spread, spread];
    }
    else {
      let spread = (this.trail_width-1) / 2;
      return [spread, spread];
    }
  }

  _crawlTop() {
    let x = this.current_position[0];
    let y = this.current_position[1];
    let spread = this._calculateTrailSpread();
    for (let i = (x-spread[0]); i < (x+spread[1]); i++) {
      if (i < 0 || i >= (this.saturn.width()-1)) continue;
      let element = this.saturn.getAt(i, y, 0);
      element.setType(this.trail_type);
    }
    if ((y-1) >= 0)
      this.current_position[1] -= 1;
  }

  _crawlRight() {
    let x = this.current_position[0];
    let y = this.current_position[1];
    let spread = this._calculateTrailSpread();
    for (let j = (y-spread[0]); j < (y+spread[1]); j++) {
      if (j < 0 || j >= (this.saturn.height()-1)) continue;
      let element = this.saturn.getAt(x, j, 0);
      element.setType(this.trail_type);
    }
    if ((x+1) < this.saturn.width())
      this.current_position[0] += 1;
  }

  _crawlBottom() {
    let x = this.current_position[0];
    let y = this.current_position[1];
    let spread = this._calculateTrailSpread();
    for (let i = (x-spread[0]); i < (x+spread[1]); i++) {
      if (i < 0 || i >= (this.saturn.width()-1)) continue;
      let element = this.saturn.getAt(i, y, 0);
      element.setType(this.trail_type);
    }
    if ((y+1) < this.saturn.height())
      this.current_position[1] += 1;
  }

  _crawlLeft() {
    let x = this.current_position[0];
    let y = this.current_position[1];
    let spread = this._calculateTrailSpread();
    for (let j = (y-spread[0]); j < (y+spread[1]); j++) {
      if (j < 0 || j >= (this.saturn.height()-1)) continue;
      let element = this.saturn.getAt(x, j, 0);
      element.setType(this.trail_type);
    }
    if ((x-1) >= 0)
      this.current_position[0] -= 1;
  }

  process() {
    if (!this.enabled) return;
    for (let i = 0; i < this.steps; i++) {
      this._step();
    }
  }
}

// Diffusion Limited Aggregation
// Centralized DLA
// Voronoi Diagrams
// Perlin or Simplex Noise



// Combine Techniques...
class ProcGen {
  constructor(seed, options) {
    this.seed = seed || RandomSeed();
    this.options = options || {};
    this.srng = new SeededRandomNumberGenerator(this.seed);
    this.saturn = new Saturn();

    //
    // ProcGen Strategies
    //
    
    this.roomPlacement = new RoomPlacement(
      this,
      this.options.RoomPlacement,
    );

    this.cellularAutomata = new CellularAutomata(
      this,
      this.options.CellularAutomata,
    );

    this.bridgePlacement = new BridgePlacement(
      this,
      this.options.BridgePlacement,
    );

    this.pathfinding = new Pathfinding(
      this,
      this.options.Pathfinding,
    );

    return this;
  }

  process() {
    // Stage 1 - Generate rooms
    this.roomPlacement.process();

    // Stage 2 - Cellular Automata, Splotch the center of the
    // map. Join the rooms. Solidify.

    this.cellularAutomata.process();

    // Stage 3 - Build bridges from rooms with a emphasis on building
    // to the center.
    this.bridgePlacement.process();

    return this;
  }

  display2d() {
    console.log("Seed: " + this.seed);
    this.saturn.display2d();
    return this;
  }
}


//
// BEGIN
//


let srng = new SeededRandomNumberGenerator("Test4");
let dist = {
  Head: 2,
  Chest: 3,
  Legs: 1,
};
let gen = () => { return srng.randomDistribution(dist); };
let coinFlip = () => { return srng.randomChance(0.5); };


let procgen = new ProcGen(null, {
  RoomPlacement: {
    num_rooms: 6,
  },
  CellularAutomata: {
    Splotch: {
      cycles: 25
    },
    Solidify: {
      cycles: 2,
      threshold: 5,
    },
  },
  BridgePlacement: {
    enabled: false,
    bridge_width: 3,
    bridge_length: 12,
    threshold: 20,
  },
})
.process()
.display2d();
