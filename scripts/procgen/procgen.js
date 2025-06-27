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
    let dist = [["Head", 2], ["Chest", 3], ["Legs", 1]];
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
  random_distribution(tupl) {
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
    
  */
  random_normal(norm) {
    return (this.generator() <= norm);
  }
}




// Room Placement Techniques
// Animated BSP
// Cellular Automata
// Drunkard's Walk
// Diffusion Limited Aggregation
// Centralized DLA
// Voronoi Diagrams
// Perlin or Simplex Noise
// Combine Techniques...

// Saturn Phantom
let SaturnDimensions = [6, 6];       // [Width, Height]
let CubeDimensions = [8, 8, 8];      // [Width, Height, Depth]
let ElementDimensions = [48, 48, 8];

class Saturn {
  constructor() {
    this.elements = [];
    this.forEachIndex((i, j, k) => {
      this.elements.push({
        fill: false,
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

  fill(x, y, z) {
    this.getAt(x,y,z).fill = true;
  }

  unfill(x, y, z) {
    this.getAt(x,y,z).fill = false;
  }

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

let srng = new SeededRandomNumberGenerator("Test");
let dist = [["Head", 2], ["Chest", 3], ["Legs", 1]];
let gen = () => { return srng.random_distribution(dist); };
let coinFlip = () => { return srng.random_normal(0.5); };
let saturn = new Saturn();

saturn.forEachIndex((i, j, k) => {
  if (k > 0) return;
  if (coinFlip()) saturn.fill(i,j,k);
});

saturn.display2d();
