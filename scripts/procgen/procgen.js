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
      if (v && v > 0) tupl.push([k, v]);
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
  
  isFill() { return (this.type == "fill"); }

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

  cover() {
    this.type = "cover";
  }

  isCover() { return (this.type == "cover"); }

  window() {
    this.type = "window";
  }

  isWindow() { return (this.type == "window"); }

  mountain() {
    this.type = "mountain";
  }

  isMountain() { return (this.type == "mountain"); }

  //
  // Element Navigation 
  //

  // x
  left() {
    if (this.x <= 0) return null;
    return this.saturn.getAt(this.x-1, this.y, this.z);
  }

  right() {
    if (this.x >= this.saturn.width()-1) return null;
    return this.saturn.getAt(this.x+1, this.y, this.z);
  }

  // y
  up() {
    if (this.y <= 0) return null;
    return this.saturn.getAt(this.x, this.y-1, this.z);
  }

  down() {
    if (this.y >= this.saturn.height()-1) return null;
    return this.saturn.getAt(this.x, this.y+1, this.z);
  }

  // z
  top() {
    if (this.z >= this.saturn.depth()-1) return null;
    return this.saturn.getAt(this.x, this.y, this.z+1);
  }

  bottom() {
    if (this.z <= 0) return null;
    return this.saturn.getAt(this.x, this.y, this.z-1);
  }
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
    // Iterate over all unvisited nodes until they're all visited.
    let unvisited_nodes = [];
    do {
      unvisited_nodes = saturn2D.elements.filter((element) => 
	(!element.visited && element.sentinel !== null));
      unvisited_nodes.forEach((e) => this._calculateCost(saturn2D, e.x, e.y));
    } while(unvisited_nodes.length > 0);
    return saturn2D;
  }

  _calculateCost(saturn2D, x, y) {
    let element = saturn2D.getAt(x, y);
    element.visited = true;
    
    this._scoreTop(saturn2D, x, y);
    this._scoreRight(saturn2D, x, y);
    this._scoreBottom(saturn2D, x, y);
    this._scoreLeft(saturn2D, x, y);
  }

  _elementCalculateTypeCost(type) {
    switch(type) {
      case "floor":    return 10;
      case "bridge":   return 20;
      case "mountain": return 120;
      case "cover":    return 180;
      case "fill":     return 200;
      case "window":   return 210;
      case "empty":    return 1000;
      default: throw new Error("Unknown Type: " + type);
    }
  }

  // Returns the traversal cost between elements.
  _traversalCost(e1, e2) {
    let cost1 = this._elementCalculateTypeCost(e1.getType());
    let cost2 = this._elementCalculateTypeCost(e2.getType());
    return (cost1 + cost2) / 2;
  }

  _compareElements(e1, e2) {
    if (e2.visited) return;
    let traversal_cost = (e1.sentinel || 0) + this._traversalCost(e1, e2);
    if (traversal_cost > (e2.sentinel || 0)) {
      e2.sentinel = traversal_cost;
      e2.parent = [e1.x, e1.y];
    }
  }

  _scoreTop(saturn2D, x, y) {
    if (y <= 0) return;
    let element = saturn2D.getAt(x, y);
    let other_element = saturn2D.getAt(x, y-1);
    this._compareElements(element, other_element);
  }
 
  _scoreRight(saturn2D, x, y) {
    if (x >= (saturn2D.width()-1)) return;
    let element = saturn2D.getAt(x, y);
    let other_element = saturn2D.getAt(x+1, y);
    this._compareElements(element, other_element);
  }

  _scoreBottom(saturn2D, x, y) {
    if (y >= (saturn2D.height()-1)) return;
    let element = saturn2D.getAt(x, y);
    let other_element = saturn2D.getAt(x, y+1);
    this._compareElements(element, other_element);
  }

  _scoreLeft(saturn2D, x, y) {
    if (x <= 0) return;
    let element = saturn2D.getAt(x, y);
    let other_element = saturn2D.getAt(x-1, y);
    this._compareElements(element, other_element);
  }

  _prepareSaturn2D(saturn2D) {
    saturn2D.forEachIndex((i, j) => {
      let element = saturn2D.getAt(i, j);
      element.sentinel = null;
      element.parent = null;
      element.visited = false;
    });
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
	else if (element.getType() == "empty") {
	  s += " ";
	}
	else if (element.getType() == "cover") {
	  s += "c";
	}
	else if (element.getType() == "window") {
	  s += "W";
	}
	else if (element.getType() == "mountain") {
	  s += "M";
	}
	else {
	  s += "?";
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
    this.starting_point = this.options.starting_point || this._generateStartingPoint();
    this.splotch_type = this.options.splotch_type || "floor";

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
      saturn.getAt(splotch.x, splotch.y, 0).setType(this.splotch_type);
    });
  }

  seek(x, y) {
    return this.splotch_listing.find((splotch) => {
      return (splotch.x == x && splotch.y == y);
    });
  }

  process() {
    if (!this.enabled) return;
    let starting_point = this.starting_point;
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
    this.pathfinding = new Pathfinding(
      this.procgen,
      this.options.Pathfinding,
    );
  }

  _getRoomsAveragePosition() {
    let placed_rooms = this.procgen.roomPlacement.getPlacedRooms();
    let room_total = placed_rooms.reduce((sum, room) => {
      sum.x += room.x + (room.w/2);
      sum.y += room.y + (room.h/2);
      return sum;
    }, {x: 0, y: 0});
    let num_rooms = this.procgen.roomPlacement.num_rooms;
    let average_position = {x: Math.round(room_total.x/num_rooms),
			    y: Math.round(room_total.y/num_rooms)};
    return average_position;
  }

  _crawlShortestPath(saturn2D, x, y, options) {
    let current_position = [x, y];
    while (current_position !== null) {
      let px = current_position[0];
      let py = current_position[1];
      let element = this.saturn.getAt(px, py, 0).floor();
      current_position = saturn2D.getAt(px, py).parent;
    }
  }

  _cellAutomata_ExpandRooms() {
    this.saturn.forEachIndex((i,j,k) => {
      let getAt = (x, y) => this.saturn.getAt(x, y, 0);
      let element = getAt(i, j);
      if (k !== 0) return;
      if (i <= 0 || i >= this.saturn.width()-1) return;
      if (j <= 0 || j >= this.saturn.height()-1) return;

      // Find room borders that are openings and expand them.
      if (this.procgen.roomPlacement.isInRoomBorder(i, j, 0) &&
	  element.isFloor()) {
	// Check for Vertical Opening
	if (getAt(i-1, j).isFill() &&
	    getAt(i+1, j).isFill() &&
	    getAt(i, j-1).isFloor() &&
	    getAt(i, j+1).isFloor()) {
	  getAt(i-1, j).floor();
	  getAt(i+1, j).floor();
	}
	// Check for Horizontal Opening
	else if (getAt(i-1, j).isFloor() &&
		 getAt(i+1, j).isFloor() &&
		 getAt(i, j-1).isFill() &&
		 getAt(i, j+1).isFill()) {
	  getAt(i, j-1).floor();
	  getAt(i, j+1).floor();
	}
      }
    });
  }

  _cellAutomata_BuildJunctions() {
    this.saturn.forEachIndex((i,j,k) => {
      let getAt = (x, y) => this.saturn.getAt(x, y, 0);
      let element = getAt(i, j);
      if (k !== 0) return;
      if (i <= 0 || i >= this.saturn.width()-1) return;
      if (j <= 0 || j >= this.saturn.height()-1) return;
      
      // Find L & T-Junctions, and fill them in.
      if (element.isFloor() &&
	  getAt(i-1, j-1).isEmpty() &&
	  getAt(i+1, j-1).isEmpty() &&
	  getAt(i+1, j+1).isEmpty() &&
	  getAt(i-1, j+1).isEmpty()) {
	let junctions = 0;
	junctions += getAt(i, j-1).isFloor() ? 1 : 0;
	junctions += getAt(i+1, j).isFloor() ? 1 : 0;
	junctions += getAt(i-1, j).isFloor() ? 1 : 0;
	junctions += getAt(i, j+1).isFloor() ? 1 : 0;
	if (junctions >= 2) {
	  getAt(i-1, j-1).floor();
	  getAt(i, j-1).floor();
	  getAt(i+1, j-1).floor();
	  getAt(i+1, j).floor();
	  getAt(i+1, j+1).floor();
	  getAt(i, j+1).floor();
	  getAt(i-1, j+1).floor();
	  getAt(i-1, j).floor();
	}
      }
    });
  }

  _cellAutomata_BridgeExpand() {
    this.saturn.forEachIndex((i,j,k) => {
      let getAt = (x, y) => this.saturn.getAt(x, y, 0);
      let element = getAt(i, j);
      if (k !== 0) return;
      if (i <= 0 || i >= this.saturn.width()-1) return;
      if (j <= 0 || j >= this.saturn.height()-1) return;
      if (!element.isFloor()) return;
      // Check Vertical
      if (getAt(i-1, j).isEmpty() &&
	  getAt(i+1, j).isEmpty() &&
	  getAt(i, j-1).isFloor() &&
	  getAt(i, j+1).isFloor()) {
	getAt(i-1, j).floor();
	getAt(i+1, j).floor();
      }
      // Check Horizontal
      else if (getAt(i-1, j).isFloor() &&
	       getAt(i+1, j).isFloor() &&
	       getAt(i, j-1).isEmpty() &&
	       getAt(i, j+1).isEmpty()) {
	getAt(i, j-1).floor();
	getAt(i, j+1).floor();
      }
    });
  }

  _cellAutomata_ExpandWallLedges() {
    this.saturn.forEachIndex((i,j,k) => {
      let getAt = (x, y) => this.saturn.getAt(x, y, 0);
      let element = getAt(i, j);
      if (k !== 0) return;
      if (i <= 1 || i >= this.saturn.width()-2) return;
      if (j <= 1 || j >= this.saturn.height()-2) return;
      if (!element.isFill()) return;
      
      // Check Top
      if (getAt(i, j-1).isFloor())
	getAt(i, j-2).floor();

      // Check Right
      if (getAt(i+1, j).isFloor())
	getAt(i+2, j).floor();

      // Check Bottom
      if (getAt(i, j+1).isFloor())
	getAt(i, j+2).floor();

      // Check Left
      if (getAt(i-1, j).isFloor())
	getAt(i-2, j).floor();

    });
  }

  process() {
    if (this.enabled === false) return;
    
    // Find a good center point to have all paths converge on...
    let average_position = this._getRoomsAveragePosition();
    // Generate shortest path to this point.
    let shortest_path = this.pathfinding.getShortestPaths(average_position.x,
							  average_position.y);
    // Create Crawlers that traverse the Shortest pathing from
    // each room placement.
    let placed_rooms = this.procgen.roomPlacement.getPlacedRooms();
    placed_rooms.forEach((room) => {
      let room_x = Math.round(room.x + room.w/2);
      let room_y = Math.round(room.y + room.h/2);
      this._crawlShortestPath(shortest_path, room_x, room_y, {});
    });

    // Form random paths between different rooms to add randomness/variety.
    // TODO
    
    // Cell Automata, make room entrances 3 wide
    this._cellAutomata_ExpandRooms();
    // Build out any T and L Junctions
    this._cellAutomata_BuildJunctions();
    // Build all of the Bridges.
    this._cellAutomata_BridgeExpand();
    // Extend out Wall ledges into paths
    this._cellAutomata_ExpandWallLedges();
    
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
      case "top": this._crawlTop(); break;
      case "right": this._crawlRight(); break;
      case "bottom": this._crawlBottom(); break;
      case "left": this._crawlLeft(); break;
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

class DiffusionLimitedAggregation {
  constructor(procgen, options) {
    this.procgen = procgen;
    this.saturn = procgen.saturn;
    this.srng = procgen.srng;
    this.options = options || {};
    this.cycles = this.options.cycles || 50000;
    this.max_aggregate = this.options.max_aggregate || 6;
    this.fill_type = this.options.fill_type || "cover";
    this.filter_whitelist = this.options.filter_whitelist || ["empty"];
    this.seed_point = this.options.seed_point || this._generateParticle();

    // [SaturnElement, ...]
    this.current_aggregates = [this.seed_point];

    this.particle = null;
  }

  _generateParticle() {
    while(true) {
      let x = this.srng.randomInteger(0, this.saturn.width()-1);
      let y = this.srng.randomInteger(0, this.saturn.height()-1);
      let element = this.saturn.getAt(x, y, 0);
      if (this.filter_whitelist.includes(element.getType())) {
	return element;
      }
    }
  }

  _iterateCycle() {
    if (this.particle === null)
      this.particle = this._generateParticle();

    // Check if we reached the maximum number of aggregates.
    if (this.current_aggregates.length >= this.max_aggregate) return true; 

    // Check if the particle is near any aggregates
    if (this.current_aggregates.includes(this.particle.up()) ||
	this.current_aggregates.includes(this.particle.right()) ||
	this.current_aggregates.includes(this.particle.down()) ||
	this.current_aggregates.includes(this.particle.left())) {
      // Check if I can place an aggregate here, otherwise fire a new particle.
      if (this.filter_whitelist.includes(this.particle.getType())) {
	this.current_aggregates.push(this.particle);
	this.particle = null;
	return false;
      }
      else {
	this.particle = null;
	return false;
      }
    }

    let distribution = {
      up: 1,
      right: 1,
      down: 1,
      left: 1,
    };

    switch(this.srng.randomDistribution(distribution)) {
      case "up": this.particle = this.particle.up(); break;
      case "right": this.particle = this.particle.right(); break;
      case "down": this.particle = this.particle.down(); break;
      case "left": this.particle = this.particle.left(); break;
    }
    return false;
  }

  process() {
    let bMaxAggregates = false;
    for (let i = 0; i < this.cycles; i++) {
      bMaxAggregates = this._iterateCycle();
      if (bMaxAggregates) break;
    }

    this.current_aggregates.forEach((element) => element.setType(this.fill_type));
  }
}

class RayTracing {
  constructor(procgen, options) {
    this.procgen = procgen;
    this.saturn = procgen.saturn;
    this.srng = procgen.srng;
    this.options = options || {};
    this.func_collision = this.options.func_collision || ((element) => element.isFill());
    this.func_negation = this.options.func_negation || ((element) => false);
    this.starting_point = this.options.starting_point || this._generatePoint();
    this.starting_direction = this.options.starting_direction || this._generateDirection();
    this.max_distance = this.options.max_distance ||
      Math.floor((this.saturn.width() + this.saturn.height()) * 2);
    this.propagation_distance = this.options.propagation_distance || 0.1;

    this.current_point = this.starting_point;
    this.current_element = this.locateElement(this.starting_point[0], this.starting_point[1], 0);
  }

  locateElement(x, y, z) {
    x = (x >= 0) ? x : 0;
    x = (x <= this.saturn.width()-1) ? x : this.saturn.width()-1;
    x = Math.floor(x);

    y = (y >= 0) ? y : 0;
    y = (y <= this.saturn.height()-1) ? y : this.saturn.height()-1;
    y = Math.floor(y);

    z = (z !== undefined) ? z : 0;
    z = (z >= 0) ? z : 0;
    z = (z <= this.saturn.depth()-1) ? z : this.saturn.depth()-1;
    z = Math.floor(z);

    let element = this.saturn.getAt(x, y, z);
    return element;
  }
  
  _generatePoint() {
    while(true) {
      let x = this.srng.randomFloat(0, this.saturn.width()-1);
      let y = this.srng.randomFloat(0, this.saturn.height()-1);
      let element = this.saturn.getAt(Math.floor(x), Math.floor(y), 0);
      if (!this.func_collision(element) &&
	  !this.func_negation(element)) {
	return [x, y];
      }
    }
  }

  // Direction Vector / Unit Vector
  _generateDirection() {
    let x = this.srng.randomFloat(-1, 1);
    let y = this.srng.randomFloat(-1, 1);
    let mag = Math.sqrt((x*x) + (y*y));
    return [ x / mag, y / mag ];
  }

  _getDistance() {
    let p1 = this.starting_point;
    let p2 = this.current_point;
    let pt = [p1[0] - p2[0], p1[1] - p2[1]];
    return Math.sqrt(pt[0]*pt[0]+pt[1]*pt[1]);
  }

  _propagateRay() {
    let x_c = this.starting_direction[0] * this.propagation_distance;
    let y_c = this.starting_direction[1] * this.propagation_distance;
    this.current_point[0] += x_c;
    this.current_point[1] += y_c;
    this._applyLoopAround(this.current_point);
  }

  _applyLoopAround(p) {
    let w = this.saturn.width();
    let h = this.saturn.height();
    p[0] = (p[0] >= 0) ? p[0] : w-1;
    p[0] = (p[0] <= w-1) ? p[0] : 0;
    p[1] = (p[1] >= 0) ? p[1] : h-1;
    p[1] = (p[1] <= h-1) ? p[1] : 0;
    return p;
  }

  // Returns null if func_negation --> true
  getRayCollision() {
    let element = null;
    while(this._getDistance() < this.max_distance) {
      this._propagateRay();
      element = this.locateElement(this.current_point[0],
				   this.current_point[1]);
      if (this.current_element !== element) {
	this.current_element = element;
	if (this.func_collision(element)) {
	  return element;
	}
	else if (this.func_negation(element)) {
	  return null;
	}
      }
    }
    return element;
  }
}

// Centralized DLA
// Voronoi Diagrams
// Perlin or Simplex Noise

class CoverPlacement {
  constructor(procgen, options) {
    this.procgen = procgen;
    this.saturn = procgen.saturn;
    this.srng = procgen.srng;
    this.options = options || {};
    this.enabled = (this.options.enabled !== undefined) ? this.options.enabled : true;
    this.num_cover = this.options.num_cover || 10;
  }

  process() {
    if (!this.enabled) return;
    for (let i = 0; i < this.num_cover; i++) {
      let dLA = new DiffusionLimitedAggregation(this.procgen);
      dLA.process();
    }
  }
}

class WindowPlacement {
  constructor(procgen, options) {
    this.procgen = procgen;
    this.saturn = procgen.saturn;
    this.options = options || {};
    this.enabled = (this.options.enabled !== undefined) ? this.options.enabled : true;
    this.num_windows = this.options.num_windows || 10;
    this.penetration = this.options.penetration || 1;
  }

  _cellAutomata_WindowExpand() {
    this.saturn.forEachIndex((i, j, k) => {
      if (k > 0) return;
      let element = this.saturn.getAt(i,j,0);
      if (!element.isWindow()) return;
      if (i <= 0 || i >= this.saturn.width()-1) return;
      if (j <= 0 || j >= this.saturn.height()-1) return;

      // Vertical
      if (element.up().isFill() && element.down().isFill()) {
	element.up().window();
	element.down().window();
      }
      // Horizontal
      else if (element.left().isFill() && element.right().isFill()) {
	element.left().window();
	element.right().window();
      }
      // Corner Up-Left
      else if (element.down().isFill() && element.right().isFill()) {
	element.down().window();
	element.right().window();
      }
      // Corner Up-Right
      else if (element.down().isFill() && element.left().isFill()) {
	element.down().window();
	element.left().window();
      }
      // Corner Down-Left
      else if (element.up().isFill() && element.right().isFill()) {
	element.up().window();
	element.right().window();
      }
      // Corner Down-Right
      else if (element.up().isFill() && element.left().isFill()) {
	element.up().window();
	element.left().window();
      }
    });
  }

  process() {
    if (!this.enabled) return;
    // Number of iterations is based on the number of rays and it's level of penetration.
    let num_iterations = Math.ceil(this.num_windows / this.penetration);
    for (let i = 0; i < num_iterations; i++) {
      let raytracing = new RayTracing(this.procgen, {func_collision: ((e) => e.isFill())});
      for (let p = 0; p < this.penetration; p++) {
	// Collide rays against the side of the buildings to make windows.
	let element = raytracing.getRayCollision();
	if (element !== null && element.isFill()) element.window();
      }
    }
    this._cellAutomata_WindowExpand();
  }
}

class SimplexNoise {
  constructor(procgen, options) {
    
  }
}

class MountainPlacement {
  constructor(procgen, options) {
    this.procgen = procgen;
    this.saturn = procgen.saturn;
    this.options = options || {};
    this.enabled = (this.options.enabled !== undefined) ? this.options.enabled : true;
    this.num_mountains = this.options.num_mountains || 2;
  }

  process() {
    if (!this.enabled) return;
    for (let i = 0; i < this.num_mountains; i++) {
      let checkCollision = (element) => ["floor", "cover"].includes(element.getType());
      let checkNegation = (element) => ["fill", "window"].includes(element.getType());
      let raytracing = new RayTracing(this.procgen, {
	func_collision: checkCollision,
	func_negation: checkNegation,
      });
      let element = raytracing.getRayCollision();
      if (element !== null && checkCollision(element)) {
	element.mountain();
	let splotchSystem = new SplotchSystem(this.procgen, {
	  splotch_type: "mountain",
	  starting_point: [element.x, element.y],
	});
	splotchSystem.process();
      }
    }
  }
}

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

    this.coverPlacement = new CoverPlacement(
      this,
      this.options.CoverPlacement,
    );
    
    this.windowPlacement = new WindowPlacement(
      this,
      this.options.WindowPlacement,
    );

    this.mountainPlacement = new MountainPlacement(
      this,
      this.options.MountainPlacement,
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
    // Stage 3.5 - CellAutomata to cleanup bridge construction.
    this.bridgePlacement.process();

    // Stage 4 - Add Cover using DLA
    this.coverPlacement.process();

    // Stage 5 - Add windows to the buildings using raycasting
    this.windowPlacement.process();

    // Stage 6 - Raycast a starting point, and splotch some mountains.
    this.mountainPlacement.process();

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
let args = process.argv;
let seed = args.length > 2 ? args[2] : null;
let procgen = new ProcGen(seed, {
  RoomPlacement: {
    num_rooms: 8,
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
    num_mountains: 4,
  },
})
.process()
.display2d();
