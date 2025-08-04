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

  // Returns a random choice from an array.
  // if `bDelete`, remove the element from the array.
  randomChoice(array, bDelete) {
    let idx = this.randomInteger(0, array.length-1);
    let result = array[idx];
    if (bDelete) array.splice(idx, 1);
    return result;
  }

  // Returns a random combination of values from the `array` as a
  // choice of values of size `count`
  // if `bDelete`, remove the elements from the array.
  randomCombination(array, count, bDelete) {
    let a = null;
    if (bDelete) a = array;
    else a = DeepCopy(array);
    let result = [];
    for (let c = 0; c < count; c++) {
      let idx = this.randomInteger(0, a.length-1);
      result.push(a[idx]);
      a.splice(idx, 1);
    }
    return result;
  }

  // Shuffles the elements of an array.
  // if `bCopy`, returns a new array.
  randomShuffle(array, bCopy) {
    let a = null;
    if (bCopy) a = array.map((i) => i);
    else a = array;
    let cIdx = a.length;
    while (cIdx !== 0) {
      let rIdx = this.randomInteger(0, cIdx);
      cIdx -= 1;
      let swp = a[cIdx];
      a[cIdx] = a[rIdx];
      a[rIdx] = swp;
    }
    return a;
  }
}

class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  } 
}

// Bounding Box 2D
class BBox {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  center() {
    return new Point(this.x+this.h/2.,
		     this.y+this.w/2.);
  }

  checkIntersection(bbox) {
    // Box A
    let aMinX = this.x;
    let aMinY = this.y;
    let aMaxX = this.x + this.w;
    let aMaxY = this.x + this.h;

    // Box B
    let bMinX = bbox.x;
    let bMinY = bbox.y;
    let bMaxX = bbox.x + bbox.w;
    let bMaxY = bbox.y + bbox.h;

    if (aMinX <= bMaxX && aMaxX >= bMinX &&
        aMinY <= bMaxY && aMaxY >= bMinY) {
      return true;
    }
    return false;
  }

  checkInside(bbox) {
    let innerBox = this;
    let outerBox = bbox;

    if (innerBox.x >= outerBox.x &&
        innerBox.y >= outerBox.y &&
        (innerBox.x + innerBox.w) <= (outerBox.x + outerBox.w) &&
        (innerBox.y + innerBox.h) <= (outerBox.y + outerBox.h))
      return true;
    return false;
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

const SaturnCubeDimensions = [6, 6];       // [Width, Height], Number of Cubes
const CubeDimensions = [8, 8, 8];      // [Width, Height, Depth], Number of Elements per Cube
const SaturnWidth = SaturnCubeDimensions[0] * CubeDimensions[0];
const SaturnHeight = SaturnCubeDimensions[1] * CubeDimensions[1];
const SaturnDepth = CubeDimensions[2];
const SaturnDimensions = [SaturnWidth, SaturnHeight, SaturnDepth];
const ElementDimensions = [48, 48, 48];

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

  width() { return 1; }
  height() { return 1; }

  getType() { return this.type; }
  setType(_type) { this.type = _type; }
  getParentCube() {
    return this.saturn.getCubeFromElement(this.x, this.y, this.z);
  }

  // BBox representing Element in 'valve units'
  getValveBBox() {
    let x = this.x * ElementDimensions[0];
    let y = this.y * ElementDimensions[1];
    let w = ElementDimensions[0];
    let h = ElementDimensions[1];
    return new BBox(x, y, w, h);
  }

  getBBox() {
    return new BBox(this.x, this.y, 1, 1);
  }

  // Get the center of the Element represented in valve units.
  getValveCenter() {
    return this.getValveBBox().center();
  }

  // Get the center of the Element represented in saturn units.
  getCenter() {
    return this.getBBox().center();
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

const PLAYER_ELEMENT_BOUNDS = [2, 2];
class PlayerSpawn {
  constructor(cube_element, x, y) {
    this.cube_element = cube_element;
    this.saturn = cube_element.saturn;
    this.x = x;
    this.y = y;
    this.enabled = false;
  }

  width() { return PLAYER_ELEMENT_BOUNDS[0]; }
  height() { return PLAYER_ELEMENT_BOUNDS[1]; }

  setEnabled() { this.enabled = true; };
  isDisabled() { return !this.enabled; }

  getPosition() {
    return [this.x * this.cube_element.x,
	    this.y * this.cube_element.y];
  }

  getValvePosition() {
    return [this.x * this.cube_element.x * ElementDimensions[0],
	    this.y * this.cube_element.y * ElementDimensions[1]];
  }

  getBBox() {
    let x = this.x * this.cube_element.x;
    let y = this.y * this.cube_element.y;
    let w = this.width();
    let h = this.height();
    return new BBox(x, y, w, h);
  }

  getValveBBox() {
    let x = this.x * this.cube_element.x * ElementDimensions[0];
    let y = this.y * this.cube_element.y * ElementDimensions[1];
    let w = this.width() * ElementDimensions[0];
    let h = this.height() * ElementDimensions[1];
    return new BBox(x, y, w, h);
  }
}

// Individual Cube Elements that make up Saturn's Cube.
class SaturnCubeElement {
  constructor(cube, x, y) {
    this.cube = cube;
    this.saturn = cube.saturn;
    this.x = x;
    this.y = y;
    this.player_spawns = [
      new PlayerSpawn(this, 2, 2),
      new PlayerSpawn(this, 6, 2),
      new PlayerSpawn(this, 2, 6),
      new PlayerSpawn(this, 6, 6),
    ];
  }

  width() { return CubeDimensions[0]; }
  height() { return CubeDimensions[1]; }
  depth() { return CubeDimensions[2]; }

  getBBox() {
    let x = this.x * this.width();
    let y = this.y * this.height();
    let w = this.width();
    let h = this.height();
    return new BBox(x, y, w, h);
  }
  
  getValveBBox() {
    let x = this.x * this.width() * ElementDimensions[0];
    let y = this.y * this.height() * ElementDimensions[1];
    let w = this.width() * ElementDimensions[0];
    let h = this.height() * ElementDimensions[1];
    return new BBox(x, y, w, h);
  }

  getPlayerSpawns() { return this.player_spawns; }
}

// Handles the 'Cube' elements that comprise the map.
class SaturnCube {
  constructor(saturn) {
    this.saturn = saturn;
    this.elements = [];
    this.forEachIndex((i, j) => {
      this.elements.push(new SaturnCubeElement(this, i, j));
    });
  }

  width() { return SaturnCubeDimensions[0]; }
  height() { return SaturnCubeDimensions[1]; }
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
    return this.elements[this.index(x, y)];
  }

  getAtIndex(idx) {
    return this.elements[idx];
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

  width() { return SaturnDimensions[0]; }
  height() { return SaturnDimensions[1]; }
  depth() { return SaturnDimensions[2]; }
  size() {
    return (this.width() * this.height() * this.depth());
  }

  locateElement(x, y, z) {
    x = (x >= 0) ? x : 0;
    x = (x <= this.width()-1) ? x : this.width()-1;
    x = Math.floor(x);

    y = (y >= 0) ? y : 0;
    y = (y <= this.height()-1) ? y : this.height()-1;
    y = Math.floor(y);

    z = (z !== undefined) ? z : 0;
    z = (z >= 0) ? z : 0;
    z = (z <= this.depth()-1) ? z : this.depth()-1;
    z = Math.floor(z);

    let element = this.getAt(x, y, z);
    return element;
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
class Room {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  getBBox() {
    return new BBox(this.x, this.y, this.w, this.h);
  }

  getValveBBox() {
    let x = this.x * ElementDimensions[0];
    let y = this.y * ElementDimensions[1];
    let w = this.w * ElementDimensions[0];
    let h = this.h * ElementDimensions[1];
    return new BBox(x, y, w, h);
  }

  // Exclude the Room Border.
  getInnerBBox() {
    return new BBox(this.x+1,this.y+1,this.w-1, this.h-1);
  }

  getInnerValveBBox() {
    let x = (this.x+1) * ElementDimensions[0];
    let y = (this.y+1) * ElementDimensions[1];
    let w = (this.w-1) * ElementDimensions[0];
    let h = (this.h-1) * ElementDimensions[1];
    return new BBox(x, y, w, h);
  }
}

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
      
      let room = new Room(
	room_position[0],
	room_position[1],
	room_dimensions[0],
	room_dimensions[1],
      );

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
    this.current_element = this.saturn.locateElement(this.starting_point[0], this.starting_point[1], 0);
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
      element = this.saturn.locateElement(this.current_point[0],
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

// Simplex Noise Implementation
// https://github.com/SRombauts/SimplexNoise/blob/master/references/SimplexNoise.java
//

class Grad {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

class SimplexNoise {
  static grad3 = [
    new Grad(1,1,0),new Grad(-1,1,0),new Grad(1,-1,0),new Grad(-1,-1,0),
    new Grad(1,0,1),new Grad(-1,0,1),new Grad(1,0,-1),new Grad(-1,0,-1),
    new Grad(0,1,1),new Grad(0,-1,1),new Grad(0,1,-1),new Grad(0,-1,-1),
  ];

  static p = [
    151,160,137,91,90,15,
    131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
    190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
    88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,
    77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
    102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,
    135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,
    5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
    223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,
    129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,
    251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,
    49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,
    138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180,
  ];

  static _fill_perm() {
    let p = SimplexNoise.p;
    let perm = [];
    SimplexNoise.p.forEach((v, i) => {
      perm.push(p[i & 255]);
    });
    return perm;
  }
  static perm = SimplexNoise._fill_perm();

  static _fill_permMod12() {
    let p = SimplexNoise.p;
    let permMod12 = [];
    p.forEach((v, i) => {
      permMod12.push(p[i] % 12);
    });
    return permMod12;
  }
  static permMod12 = SimplexNoise._fill_permMod12();

  // Skewing and Unskewing Factors
  static F2 = 0.5*(Math.sqrt(3.0)-1.0);
  static G2 = (3.0-Math.sqrt(3.0))/6.0;

  // Matrix Functions
  static dot(g, x, y) {
    return g.x*x + g.y*y;
  }

  /* Main Method */
  static noise(xin, yin) {
    // Import our static members
    const grad3 = SimplexNoise.grad3;
    const perm = SimplexNoise.perm;
    const permMod12 = SimplexNoise.permMod12;
    const F2 = SimplexNoise.F2;
    const G2 = SimplexNoise.G2;
    let dot = SimplexNoise.dot;
    //
    let n0 = 0.; let n1 = 0.; let n2 = 0.;
    let s = (xin+yin)*F2;
    let i = Math.floor(xin+s);
    let j = Math.floor(yin+s);
    let t = (i+j)*G2;
    let X0 = i-t;
    let Y0 = j-t;
    let x0 = xin-X0;
    let y0 = yin-Y0;

    // Determine which simplex cell we are in.
    let i1 = 0; let j1 = 0;
    if (x0>y0)
      i1 = 1;
    else
      j1 = 1;

    let x1 = x0 - i1 + G2;
    let y1 = y0 - j1 + G2;
    let x2 = x0 - 1.0 + 2.0 * G2;
    let y2 = y0 - 1.0 + 2.0 * G2;
    // Work out the hashed gradient indices of the three simplex corners
    let ii = i & 255;
    let jj = j & 255;
    let gi0 = permMod12[ii+perm[jj]];
    let gi1 = permMod12[ii+i1+perm[jj+j1]];
    let gi2 = permMod12[ii+1+perm[jj+1]];
    // Calculate the contribution from the three corners
    let t0 = 0.5 - x0*x0-y0*y0;
    if (t0 < 0) {
      n0 = 0.;
    }
    else {
      t0 *= t0;
      n0 = t0 * t0 * dot(grad3[gi0], x0, y0);
    }
    let t1 = 0.5 - x1*x1-y1*y1;
    if (t1 < 0) {
      n1 = 0.;
    }
    else {
      t1 *= t1;
      n1 = t1 * t1 * dot(grad3[gi1], x1, y1);
    }
    let t2 = 0.5 - x2*x2-y2*y2;
    if (t2 < 0) {
      n2 = 0.;
    }
    else {
      t2 *= t2;
      n2 = t2 * t2 * dot(grad3[gi2], x2, y2);
    }

    return 70.0 * (n0 + n1 + n2);
  }

  constructor(procgen, options) {
    this.procgen = procgen;
    this.saturn = procgen.saturn;
    this.options = options || {};
    this.resolution = this.options.resolution || [1., 1.];
    this.offset = this.options.offset || [0., 0.];
  }

  // f(x, y, noise), noise -> (-1.0, 1.0)
  forEachNoiseIndex(f) {
    let w = this.saturn.width();
    let h = this.saturn.height();
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
	let xn = i / w * this.resolution[0] + this.offset[0];
	let yn = j / h * this.resolution[1] + this.offset[1];
	f.bind(this)(i, j, SimplexNoise.noise(xn, yn));
      }
    }
  }
}

// Voronoi Implementation
// https://github.com/gorhill/Javascript-Voronoi
// 
// BEGIN filename: rhill-voronoi-core.min.js


/*!
Copyright (C) 2010-2013 Raymond Hill: https://github.com/gorhill/Javascript-Voronoi
MIT License: See https://github.com/gorhill/Javascript-Voronoi/LICENSE.md
*/
;
function Voronoi(){this.vertices=null;this.edges=null;this.cells=null;this.toRecycle=null;this.beachsectionJunkyard=[];this.circleEventJunkyard=[];
this.vertexJunkyard=[];this.edgeJunkyard=[];this.cellJunkyard=[];}Voronoi.prototype.reset=function(){if(!this.beachline){this.beachline=new this.RBTree();
}if(this.beachline.root){var a=this.beachline.getFirst(this.beachline.root);while(a){this.beachsectionJunkyard.push(a);a=a.rbNext;
}}this.beachline.root=null;if(!this.circleEvents){this.circleEvents=new this.RBTree();}this.circleEvents.root=this.firstCircleEvent=null;
this.vertices=[];this.edges=[];this.cells=[];};Voronoi.prototype.sqrt=Math.sqrt;Voronoi.prototype.abs=Math.abs;Voronoi.prototype.ε=Voronoi.ε=1e-9;
Voronoi.prototype.invε=Voronoi.invε=1/Voronoi.ε;Voronoi.prototype.equalWithEpsilon=function(d,c){return this.abs(d-c)<1e-9;
};Voronoi.prototype.greaterThanWithEpsilon=function(d,c){return d-c>1e-9;};Voronoi.prototype.greaterThanOrEqualWithEpsilon=function(d,c){return c-d<1e-9;
};Voronoi.prototype.lessThanWithEpsilon=function(d,c){return c-d>1e-9;};Voronoi.prototype.lessThanOrEqualWithEpsilon=function(d,c){return d-c<1e-9;
};Voronoi.prototype.RBTree=function(){this.root=null;};Voronoi.prototype.RBTree.prototype.rbInsertSuccessor=function(e,a){var d;
if(e){a.rbPrevious=e;a.rbNext=e.rbNext;if(e.rbNext){e.rbNext.rbPrevious=a;}e.rbNext=a;if(e.rbRight){e=e.rbRight;while(e.rbLeft){e=e.rbLeft;
}e.rbLeft=a;}else{e.rbRight=a;}d=e;}else{if(this.root){e=this.getFirst(this.root);a.rbPrevious=null;a.rbNext=e;e.rbPrevious=a;
e.rbLeft=a;d=e;}else{a.rbPrevious=a.rbNext=null;this.root=a;d=null;}}a.rbLeft=a.rbRight=null;a.rbParent=d;a.rbRed=true;var c,b;
e=a;while(d&&d.rbRed){c=d.rbParent;if(d===c.rbLeft){b=c.rbRight;if(b&&b.rbRed){d.rbRed=b.rbRed=false;c.rbRed=true;e=c;}else{if(e===d.rbRight){this.rbRotateLeft(d);
e=d;d=e.rbParent;}d.rbRed=false;c.rbRed=true;this.rbRotateRight(c);}}else{b=c.rbLeft;if(b&&b.rbRed){d.rbRed=b.rbRed=false;c.rbRed=true;
e=c}else{if(e===d.rbLeft){this.rbRotateRight(d);e=d;d=e.rbParent;}d.rbRed=false;c.rbRed=true;this.rbRotateLeft(c);}}d=e.rbParent;
}this.root.rbRed=false;};Voronoi.prototype.RBTree.prototype.rbRemoveNode=function(f){if(f.rbNext){f.rbNext.rbPrevious=f.rbPrevious;
}if(f.rbPrevious){f.rbPrevious.rbNext=f.rbNext;}f.rbNext=f.rbPrevious=null;var e=f.rbParent,g=f.rbLeft,b=f.rbRight,d;if(!g){d=b;
}else{if(!b){d=g;}else{d=this.getFirst(b);}}if(e){if(e.rbLeft===f){e.rbLeft=d;}else{e.rbRight=d;}}else{this.root=d;}var a;if(g&&b){a=d.rbRed;
d.rbRed=f.rbRed;d.rbLeft=g;g.rbParent=d;if(d!==b){e=d.rbParent;d.rbParent=f.rbParent;f=d.rbRight;e.rbLeft=f;d.rbRight=b;b.rbParent=d;
}else{d.rbParent=e;e=d;f=d.rbRight;}}else{a=f.rbRed;f=d;}if(f){f.rbParent=e;}if(a){return;}if(f&&f.rbRed){f.rbRed=false;return;
}var c;do{if(f===this.root){break;}if(f===e.rbLeft){c=e.rbRight;if(c.rbRed){c.rbRed=false;e.rbRed=true;this.rbRotateLeft(e);
c=e.rbRight;}if((c.rbLeft&&c.rbLeft.rbRed)||(c.rbRight&&c.rbRight.rbRed)){if(!c.rbRight||!c.rbRight.rbRed){c.rbLeft.rbRed=false;
c.rbRed=true;this.rbRotateRight(c);c=e.rbRight;}c.rbRed=e.rbRed;e.rbRed=c.rbRight.rbRed=false;this.rbRotateLeft(e);f=this.root;
break;}}else{c=e.rbLeft;if(c.rbRed){c.rbRed=false;e.rbRed=true;this.rbRotateRight(e);c=e.rbLeft;}if((c.rbLeft&&c.rbLeft.rbRed)||(c.rbRight&&c.rbRight.rbRed)){if(!c.rbLeft||!c.rbLeft.rbRed){c.rbRight.rbRed=false;
c.rbRed=true;this.rbRotateLeft(c);c=e.rbLeft;}c.rbRed=e.rbRed;e.rbRed=c.rbLeft.rbRed=false;this.rbRotateRight(e);f=this.root;
break;}}c.rbRed=true;f=e;e=e.rbParent;}while(!f.rbRed);if(f){f.rbRed=false;}};Voronoi.prototype.RBTree.prototype.rbRotateLeft=function(b){var d=b,c=b.rbRight,a=d.rbParent;
if(a){if(a.rbLeft===d){a.rbLeft=c;}else{a.rbRight=c;}}else{this.root=c;}c.rbParent=a;d.rbParent=c;d.rbRight=c.rbLeft;if(d.rbRight){d.rbRight.rbParent=d;
}c.rbLeft=d;};Voronoi.prototype.RBTree.prototype.rbRotateRight=function(b){var d=b,c=b.rbLeft,a=d.rbParent;if(a){if(a.rbLeft===d){a.rbLeft=c;
}else{a.rbRight=c;}}else{this.root=c;}c.rbParent=a;d.rbParent=c;d.rbLeft=c.rbRight;if(d.rbLeft){d.rbLeft.rbParent=d;}c.rbRight=d;
};Voronoi.prototype.RBTree.prototype.getFirst=function(a){while(a.rbLeft){a=a.rbLeft;}return a;};Voronoi.prototype.RBTree.prototype.getLast=function(a){while(a.rbRight){a=a.rbRight
}return a;};Voronoi.prototype.Diagram=function(a){this.site=a;};Voronoi.prototype.Cell=function(a){this.site=a;this.halfedges=[];
this.closeMe=false;};Voronoi.prototype.Cell.prototype.init=function(a){this.site=a;this.halfedges=[];this.closeMe=false;return this;
};Voronoi.prototype.createCell=function(b){var a=this.cellJunkyard.pop();if(a){return a.init(b);}return new this.Cell(b);};
Voronoi.prototype.Cell.prototype.prepareHalfedges=function(){var a=this.halfedges,b=a.length,c;while(b--){c=a[b].edge;if(!c.vb||!c.va){a.splice(b,1);
}}a.sort(function(e,d){return d.angle-e.angle;});return a.length;};Voronoi.prototype.Cell.prototype.getNeighborIds=function(){var a=[],b=this.halfedges.length,c;
while(b--){c=this.halfedges[b].edge;if(c.lSite!==null&&c.lSite.voronoiId!=this.site.voronoiId){a.push(c.lSite.voronoiId);}else{if(c.rSite!==null&&c.rSite.voronoiId!=this.site.voronoiId){a.push(c.rSite.voronoiId);
}}}return a;};Voronoi.prototype.Cell.prototype.getBbox=function(){var i=this.halfedges,d=i.length,a=Infinity,g=Infinity,c=-Infinity,b=-Infinity,h,f,e;
while(d--){h=i[d].getStartpoint();f=h.x;e=h.y;if(f<a){a=f;}if(e<g){g=e;}if(f>c){c=f;}if(e>b){b=e;}}return{x:a,y:g,width:c-a,height:b-g};
};Voronoi.prototype.Cell.prototype.pointIntersection=function(a,h){var b=this.halfedges,c=b.length,f,g,e,d;while(c--){f=b[c];
g=f.getStartpoint();e=f.getEndpoint();d=(h-g.y)*(e.x-g.x)-(a-g.x)*(e.y-g.y);if(!d){return 0;}if(d>0){return -1;}}return 1;};
Voronoi.prototype.Vertex=function(a,b){this.x=a;this.y=b;};Voronoi.prototype.Edge=function(b,a){this.lSite=b;this.rSite=a;
this.va=this.vb=null;};Voronoi.prototype.Halfedge=function(d,e,a){this.site=e;this.edge=d;if(a){this.angle=Math.atan2(a.y-e.y,a.x-e.x);
}else{var c=d.va,b=d.vb;this.angle=d.lSite===e?Math.atan2(b.x-c.x,c.y-b.y):Math.atan2(c.x-b.x,b.y-c.y);}};Voronoi.prototype.createHalfedge=function(b,c,a){return new this.Halfedge(b,c,a);
};Voronoi.prototype.Halfedge.prototype.getStartpoint=function(){return this.edge.lSite===this.site?this.edge.va:this.edge.vb;
};Voronoi.prototype.Halfedge.prototype.getEndpoint=function(){return this.edge.lSite===this.site?this.edge.vb:this.edge.va;
};Voronoi.prototype.createVertex=function(a,c){var b=this.vertexJunkyard.pop();if(!b){b=new this.Vertex(a,c);}else{b.x=a;b.y=c;
}this.vertices.push(b);return b;};Voronoi.prototype.createEdge=function(e,a,d,b){var c=this.edgeJunkyard.pop();if(!c){c=new this.Edge(e,a);
}else{c.lSite=e;c.rSite=a;c.va=c.vb=null;}this.edges.push(c);if(d){this.setEdgeStartpoint(c,e,a,d);}if(b){this.setEdgeEndpoint(c,e,a,b);
}this.cells[e.voronoiId].halfedges.push(this.createHalfedge(c,e,a));this.cells[a.voronoiId].halfedges.push(this.createHalfedge(c,a,e));
return c;};Voronoi.prototype.createBorderEdge=function(d,c,a){var b=this.edgeJunkyard.pop();if(!b){b=new this.Edge(d,null);
}else{b.lSite=d;b.rSite=null;}b.va=c;b.vb=a;this.edges.push(b);return b;};Voronoi.prototype.setEdgeStartpoint=function(b,d,a,c){if(!b.va&&!b.vb){b.va=c;
b.lSite=d;b.rSite=a;}else{if(b.lSite===a){b.vb=c;}else{b.va=c;}}};Voronoi.prototype.setEdgeEndpoint=function(b,d,a,c){this.setEdgeStartpoint(b,a,d,c);
};Voronoi.prototype.Beachsection=function(){};Voronoi.prototype.createBeachsection=function(a){var b=this.beachsectionJunkyard.pop();
if(!b){b=new this.Beachsection();}b.site=a;return b;};Voronoi.prototype.leftBreakPoint=function(e,f){var a=e.site,m=a.x,l=a.y,k=l-f;
if(!k){return m;}var n=e.rbPrevious;if(!n){return -Infinity;}a=n.site;var h=a.x,g=a.y,d=g-f;if(!d){return h;}var c=h-m,j=1/k-1/d,i=c/d;
if(j){return(-i+this.sqrt(i*i-2*j*(c*c/(-2*d)-g+d/2+l-k/2)))/j+m;}return(m+h)/2;};Voronoi.prototype.rightBreakPoint=function(b,c){var d=b.rbNext;
if(d){return this.leftBreakPoint(d,c);}var a=b.site;return a.y===c?a.x:Infinity;};Voronoi.prototype.detachBeachsection=function(a){this.detachCircleEvent(a);
this.beachline.rbRemoveNode(a);this.beachsectionJunkyard.push(a);};Voronoi.prototype.removeBeachsection=function(b){var a=b.circleEvent,j=a.x,h=a.ycenter,e=this.createVertex(j,h),f=b.rbPrevious,d=b.rbNext,l=[b],g=Math.abs;
this.detachBeachsection(b);var m=f;while(m.circleEvent&&g(j-m.circleEvent.x)<1e-9&&g(h-m.circleEvent.ycenter)<1e-9){f=m.rbPrevious;
l.unshift(m);this.detachBeachsection(m);m=f;}l.unshift(m);this.detachCircleEvent(m);var c=d;while(c.circleEvent&&g(j-c.circleEvent.x)<1e-9&&g(h-c.circleEvent.ycenter)<1e-9){d=c.rbNext;
l.push(c);this.detachBeachsection(c);c=d;}l.push(c);this.detachCircleEvent(c);var k=l.length,i;for(i=1;i<k;i++){c=l[i];m=l[i-1];
this.setEdgeStartpoint(c.edge,m.site,c.site,e);}m=l[0];c=l[k-1];c.edge=this.createEdge(m.site,c.site,undefined,e);this.attachCircleEvent(m);
this.attachCircleEvent(c);};Voronoi.prototype.addBeachsection=function(l){var j=l.x,n=l.y;var p,m,v,q,o=this.beachline.root;
while(o){v=this.leftBreakPoint(o,n)-j;if(v>1e-9){o=o.rbLeft;}else{q=j-this.rightBreakPoint(o,n);if(q>1e-9){if(!o.rbRight){p=o;
break;}o=o.rbRight;}else{if(v>-1e-9){p=o.rbPrevious;m=o;}else{if(q>-1e-9){p=o;m=o.rbNext;}else{p=m=o;}}break;}}}var e=this.createBeachsection(l);
this.beachline.rbInsertSuccessor(p,e);if(!p&&!m){return;}if(p===m){this.detachCircleEvent(p);m=this.createBeachsection(p.site);
this.beachline.rbInsertSuccessor(e,m);e.edge=m.edge=this.createEdge(p.site,e.site);this.attachCircleEvent(p);this.attachCircleEvent(m);
return;}if(p&&!m){e.edge=this.createEdge(p.site,e.site);return;}if(p!==m){this.detachCircleEvent(p);this.detachCircleEvent(m);
var h=p.site,k=h.x,i=h.y,t=l.x-k,r=l.y-i,a=m.site,c=a.x-k,b=a.y-i,u=2*(t*b-r*c),g=t*t+r*r,f=c*c+b*b,s=this.createVertex((b*g-r*f)/u+k,(t*f-c*g)/u+i);
this.setEdgeStartpoint(m.edge,h,a,s);e.edge=this.createEdge(h,l,undefined,s);m.edge=this.createEdge(l,a,undefined,s);this.attachCircleEvent(p);
this.attachCircleEvent(m);return;}};Voronoi.prototype.CircleEvent=function(){this.arc=null;this.rbLeft=null;this.rbNext=null;
this.rbParent=null;this.rbPrevious=null;this.rbRed=false;this.rbRight=null;this.site=null;this.x=this.y=this.ycenter=0;};Voronoi.prototype.attachCircleEvent=function(i){var r=i.rbPrevious,o=i.rbNext;
if(!r||!o){return;}var k=r.site,u=i.site,c=o.site;if(k===c){return;}var t=u.x,s=u.y,n=k.x-t,l=k.y-s,f=c.x-t,e=c.y-s;var v=2*(n*e-l*f);
if(v>=-2e-12){return;}var h=n*n+l*l,g=f*f+e*e,m=(e*h-l*g)/v,j=(n*g-f*h)/v,b=j+s;var q=this.circleEventJunkyard.pop();if(!q){q=new this.CircleEvent();
}q.arc=i;q.site=u;q.x=m+t;q.y=b+this.sqrt(m*m+j*j);q.ycenter=b;i.circleEvent=q;var a=null,p=this.circleEvents.root;while(p){if(q.y<p.y||(q.y===p.y&&q.x<=p.x)){if(p.rbLeft){p=p.rbLeft;
}else{a=p.rbPrevious;break;}}else{if(p.rbRight){p=p.rbRight;}else{a=p;break;}}}this.circleEvents.rbInsertSuccessor(a,q);if(!a){this.firstCircleEvent=q;
}};Voronoi.prototype.detachCircleEvent=function(b){var a=b.circleEvent;if(a){if(!a.rbPrevious){this.firstCircleEvent=a.rbNext;
}this.circleEvents.rbRemoveNode(a);this.circleEventJunkyard.push(a);b.circleEvent=null;}};Voronoi.prototype.connectEdge=function(l,a){var b=l.vb;
if(!!b){return true;}var c=l.va,p=a.xl,n=a.xr,r=a.yt,d=a.yb,o=l.lSite,e=l.rSite,i=o.x,h=o.y,k=e.x,j=e.y,g=(i+k)/2,f=(h+j)/2,m,q;
this.cells[o.voronoiId].closeMe=true;this.cells[e.voronoiId].closeMe=true;if(j!==h){m=(i-k)/(j-h);q=f-m*g;}if(m===undefined){if(g<p||g>=n){return false;
}if(i>k){if(!c||c.y<r){c=this.createVertex(g,r);}else{if(c.y>=d){return false;}}b=this.createVertex(g,d);}else{if(!c||c.y>d){c=this.createVertex(g,d);
}else{if(c.y<r){return false;}}b=this.createVertex(g,r);}}else{if(m<-1||m>1){if(i>k){if(!c||c.y<r){c=this.createVertex((r-q)/m,r);
}else{if(c.y>=d){return false;}}b=this.createVertex((d-q)/m,d);}else{if(!c||c.y>d){c=this.createVertex((d-q)/m,d);}else{if(c.y<r){return false;
}}b=this.createVertex((r-q)/m,r);}}else{if(h<j){if(!c||c.x<p){c=this.createVertex(p,m*p+q);}else{if(c.x>=n){return false;}}b=this.createVertex(n,m*n+q);
}else{if(!c||c.x>n){c=this.createVertex(n,m*n+q);}else{if(c.x<p){return false;}}b=this.createVertex(p,m*p+q);}}}l.va=c;l.vb=b;
return true;};Voronoi.prototype.clipEdge=function(d,i){var b=d.va.x,l=d.va.y,h=d.vb.x,g=d.vb.y,f=0,e=1,k=h-b,j=g-l;var c=b-i.xl;
if(k===0&&c<0){return false;}var a=-c/k;if(k<0){if(a<f){return false;}if(a<e){e=a;}}else{if(k>0){if(a>e){return false;}if(a>f){f=a;
}}}c=i.xr-b;if(k===0&&c<0){return false;}a=c/k;if(k<0){if(a>e){return false;}if(a>f){f=a;}}else{if(k>0){if(a<f){return false;
}if(a<e){e=a;}}}c=l-i.yt;if(j===0&&c<0){return false;}a=-c/j;if(j<0){if(a<f){return false;}if(a<e){e=a;}}else{if(j>0){if(a>e){return false;
}if(a>f){f=a;}}}c=i.yb-l;if(j===0&&c<0){return false;}a=c/j;if(j<0){if(a>e){return false;}if(a>f){f=a;}}else{if(j>0){if(a<f){return false;
}if(a<e){e=a;}}}if(f>0){d.va=this.createVertex(b+f*k,l+f*j);}if(e<1){d.vb=this.createVertex(b+e*k,l+e*j);}if(f>0||e<1){this.cells[d.lSite.voronoiId].closeMe=true;
this.cells[d.rSite.voronoiId].closeMe=true;}return true;};Voronoi.prototype.clipEdges=function(e){var a=this.edges,d=a.length,c,b=Math.abs;
while(d--){c=a[d];if(!this.connectEdge(c,e)||!this.clipEdge(c,e)||(b(c.va.x-c.vb.x)<1e-9&&b(c.va.y-c.vb.y)<1e-9)){c.va=c.vb=null;
a.splice(d,1);}}};Voronoi.prototype.closeCells=function(p){var g=p.xl,d=p.xr,m=p.yt,j=p.yb,q=this.cells,a=q.length,n,e,o,c,b,l,k,i,f,h=Math.abs;
while(a--){n=q[a];if(!n.prepareHalfedges()){continue;}if(!n.closeMe){continue;}o=n.halfedges;c=o.length;e=0;while(e<c){l=o[e].getEndpoint();
i=o[(e+1)%c].getStartpoint();if(h(l.x-i.x)>=1e-9||h(l.y-i.y)>=1e-9){switch(true){case this.equalWithEpsilon(l.x,g)&&this.lessThanWithEpsilon(l.y,j):f=this.equalWithEpsilon(i.x,g);
k=this.createVertex(g,f?i.y:j);b=this.createBorderEdge(n.site,l,k);e++;o.splice(e,0,this.createHalfedge(b,n.site,null));c++;
if(f){break;}l=k;case this.equalWithEpsilon(l.y,j)&&this.lessThanWithEpsilon(l.x,d):f=this.equalWithEpsilon(i.y,j);k=this.createVertex(f?i.x:d,j);
b=this.createBorderEdge(n.site,l,k);e++;o.splice(e,0,this.createHalfedge(b,n.site,null));c++;if(f){break;}l=k;case this.equalWithEpsilon(l.x,d)&&this.greaterThanWithEpsilon(l.y,m):f=this.equalWithEpsilon(i.x,d);
k=this.createVertex(d,f?i.y:m);b=this.createBorderEdge(n.site,l,k);e++;o.splice(e,0,this.createHalfedge(b,n.site,null));c++;
if(f){break;}l=k;case this.equalWithEpsilon(l.y,m)&&this.greaterThanWithEpsilon(l.x,g):f=this.equalWithEpsilon(i.y,m);k=this.createVertex(f?i.x:g,m);
b=this.createBorderEdge(n.site,l,k);e++;o.splice(e,0,this.createHalfedge(b,n.site,null));c++;if(f){break;}l=k;f=this.equalWithEpsilon(i.x,g);
k=this.createVertex(g,f?i.y:j);b=this.createBorderEdge(n.site,l,k);e++;o.splice(e,0,this.createHalfedge(b,n.site,null));c++;
if(f){break;}l=k;f=this.equalWithEpsilon(i.y,j);k=this.createVertex(f?i.x:d,j);b=this.createBorderEdge(n.site,l,k);e++;o.splice(e,0,this.createHalfedge(b,n.site,null));
c++;if(f){break;}l=k;f=this.equalWithEpsilon(i.x,d);k=this.createVertex(d,f?i.y:m);b=this.createBorderEdge(n.site,l,k);e++;
o.splice(e,0,this.createHalfedge(b,n.site,null));c++;if(f){break;}default:throw"Voronoi.closeCells() > this makes no sense!";
}}e++;}n.closeMe=false;}};Voronoi.prototype.quantizeSites=function(c){var b=this.ε,d=c.length,a;while(d--){a=c[d];a.x=Math.floor(a.x/b)*b;
a.y=Math.floor(a.y/b)*b;}};Voronoi.prototype.recycle=function(a){if(a){if(a instanceof this.Diagram){this.toRecycle=a;}else{throw"Voronoi.recycleDiagram() > Need a Diagram object.";
}}};Voronoi.prototype.compute=function(i,j){var d=new Date();this.reset();if(this.toRecycle){this.vertexJunkyard=this.vertexJunkyard.concat(this.toRecycle.vertices);
this.edgeJunkyard=this.edgeJunkyard.concat(this.toRecycle.edges);this.cellJunkyard=this.cellJunkyard.concat(this.toRecycle.cells);
this.toRecycle=null;}var h=i.slice(0);h.sort(function(n,m){var o=m.y-n.y;if(o){return o;}return m.x-n.x;});var b=h.pop(),l=0,f,e,k=this.cells,a;
for(;;){a=this.firstCircleEvent;if(b&&(!a||b.y<a.y||(b.y===a.y&&b.x<a.x))){if(b.x!==f||b.y!==e){k[l]=this.createCell(b);b.voronoiId=l++;
this.addBeachsection(b);e=b.y;f=b.x;}b=h.pop();}else{if(a){this.removeBeachsection(a.arc);}else{break;}}}this.clipEdges(j);this.closeCells(j);
var c=new Date();var g=new this.Diagram();g.cells=this.cells;g.edges=this.edges;g.vertices=this.vertices;g.execTime=c.getTime()-d.getTime();
this.reset();return g;};


// END filename: rhill-voronoi-core.min.js
//
//

/*
  Adapter for use with Saturn.
  
  Example:

  let v = new VoronoiDiagram(procgen);
  v.compute([new Point(24, 24),
             new Point(12, 12)]);
 */
class VoronoiDiagram {
  // Bounding Box Representing Valve Units
  static bbox_valve = {
    xl: 0,
    xr: SaturnDimensions[0] * ElementDimensions[0],
    yt: 0,
    yb: SaturnDimensions[1] * ElementDimensions[1],
  };

  // Bounding Box Representing SaturnElement Units
  static bbox_saturn = {
    xl: 0,
    xr: SaturnDimensions[0],
    yt: 0,
    yb: SaturnDimensions[1],
  };

  constructor(procgen, options) {
    this.procgen = procgen;
    this.saturn = procgen.saturn;
    this.options = options || {};
    this.valve_units = this.options.valve_units || false;
    this.bbox = this.valve_units ?
      VoronoiDiagram.bbox_valve : VoronoiDiagram.bbox_saturn;
    this.voronoi = new Voronoi();
    this.diagram = null;
  }

  _convertPointArrayToSites(point_array) {
    let sites = [];
    point_array.forEach((p) => sites.push({x: p.x, y: p.y}));
    return sites;
  }

  compute(point_array) {
    let sites = this._convertPointArrayToSites(point_array);
    if (this.diagram) this.voronoi.recycle(this.diagram);
    this.diagram = this.voronoi.compute(sites, this.bbox);
  }

  isComputed() { return this.diagram !== null; }

  getRawDiagram() {
    return this.diagram;
  }

  getCompleteEdges() {
    if (!this.isComputed()) return null;
    let edges = this.diagram.edges.filter((edge) => edge.rSite && edge.lSite);
    return edges;
  }

  getEquidistantVertices() {
    let onlyUnique = (value, index, array) => array.indexOf(value) === index;
    let edges = this.getCompleteEdges();
    return edges
      .map((edge) => [edge.va, edge.vb])
      .reduce((acc, edge_pair) => {
	acc.push(edge_pair[0]);
	acc.push(edge_pair[1]);
	return acc;
      }, [])
      .filter(onlyUnique);
  }

  getEquidistantElements() {
    let vectors = this.getEquidistantVertices();
    return vectors.map((e) => this.saturn.locateElement(e.x, e.y));
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

class PlayerPlacement {
  constructor(procgen, options) {
    this.procgen = procgen;
    this.saturn = procgen.saturn;
    this.srng = procgen.srng;
    this.options = options || {};
    this.enabled = (this.options.enabled !== undefined) ? this.options.enabled : true;
    this.num_player_spawns = this.options.num_player_spawns || 6;
  }
  
  process() {
    if (!this.enabled) return;
    let placed_rooms_clone = this.procgen.roomPlacement.getPlacedRooms().map((i) => i);
    if (placed_rooms_clone.length < this.num_player_spawns)
      throw new Error(
	"Number of Placed Rooms is less than the number of Player Spawns.");
    let player_spawns = [];
    this.saturn.cubes.forEachIndex((i, j) => {
      let cube = this.saturn.cubes.getAt(i,j);
      player_spawns = player_spawns.concat(cube.getPlayerSpawns());
    });

    let num_current_spawns = 0;
    let bHit = false;
    while (num_current_spawns < this.num_player_spawns) {
      bHit = false;
      player_spawns = this.srng.randomShuffle(
	player_spawns.filter((p) => p.isDisabled()));
      let room = this.srng.randomChoice(placed_rooms_clone, true);
      console.log("Room: ", room.getBBox());
      for (let pi = 0; pi < player_spawns.length; pi++) {
	let player = player_spawns[pi];
	console.log("Player: ", player.getBBox());

	if (player.getBBox().checkInside(room.getBBox())) {
	  bHit = true;
	  num_current_spawns += 1;
	  player.setEnabled();
	  break;
	}
      }
      if (!bHit) throw new Error("Unable to Find Suitable Player Spawn Location");
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

    this.playerPlacement = new PlayerPlacement(
      this,
      this.options.PlayerPlacement,
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

    // Stage 7 - Determine Player Spawn Placement based on room availability
    this.playerPlacement.process();

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
if (require.main === module) {
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
    PlayerPlacement: {
      enabled: true,
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
  // console.log(voronoiDiagram.getEquidistantVertices());


  // Simplex Test

  // let simplex = new SimplexNoise(procgen, {
  //   resolution: [10, 10],
  //   offset: [0., 0.],
  // });
  
  // simplex.forEachNoiseIndex((i, j, noise) => {
  //   if (i != 0) return;
  //   console.log(noise);
  // });

} // END if (require.main === module) {
