import {
    BBox2 as BBox,
} from "scriptedeuch";

//
// SATURN
//

//  x --+
// y z
// |  \
// |   \
// +    -

export const SaturnWidth = 48;
export const SaturnHeight = 48;
export const SaturnDepth = 8;
export const SaturnDimensions = [SaturnWidth, SaturnHeight, SaturnDepth];
export const ElementDimensions = [48, 48, 48];

export const ValveWidth = SaturnWidth * ElementDimensions[0];
export const ValveHeight = SaturnHeight * ElementDimensions[1];
export const ValveDepth = SaturnDepth * ElementDimensions[2];
export const ValveDimensions = [ValveWidth, ValveHeight, ValveDepth];


// Saturn Itself
// - this.elements[SaturnElement, ...,]
export class Saturn {
  constructor() {
    // Populate Elements
    this.elements = [];
    this.forEachIndex((i, j, k) => {
      this.elements.push(new SaturnElement(this, i, j, k));
    });

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

  // Returns an array of all SaturnElements that make up the bbox.
  // Notes:
  // - z value is fully bound for z > 0 if `bIncludeDepth`
  locateElementsByBBox(bbox, bIncludeDepth) {
    let x = bbox.x;
    let y = bbox.y;
    let w = bbox.w;
    let h = bbox.h;
    if (x > this.width() || y > this.height()) return [];
    x = (x >= 0) ? x : 0;
    x = Math.floor(x);
    y = (y >= 0) ? y : 0;
    y = Math.floor(y);
    
    w = (x+w) <= this.width() ? w : this.width()-x;
    w = Math.floor(w);
    h = (y+h) <= this.height() ? h : this.height()-y;
    h = Math.floor(h);

    let elements = [];
    for (let k = 0; k < this.depth(); k++) {
      for (let j = y; j < (y+h); j++) {
        for (let i = x; i < (x+w); i++) {
          if (bIncludeDepth && k !== 0)
            elements.push(this.getAt(i,j,k));
          else if (k === 0)
            elements.push(this.getAt(i,j,k));
        }
      }
    }
    return elements;
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
    z = (z !== undefined) ? z : 0;
    return this.elements[this.index(x,y,z)];
  }

  getAtIndex(idx) {
    return this.elements[idx];
  }

  getBBox() {
    let x = 0;
    let y = 0;
    let w = this.width();
    let h = this.height();
    return new BBox(x, y, w, h);
  }

  getValveBBox() {
    let x = 0;
    let y = 0;
    let w = this.width() * ElementDimensions[0];
    let h = this.height() * ElementDimensions[1];
    return new BBox(x, y, w, h);
  }

  // Only displays the first z-plane, [i, j, 0]
  display2d() {
    let s = "";
    for (let j = 0; j < this.height(); j++) {
      for (let i = 0; i < this.width(); i++) {
        let element = this.getAt(i,j,0);

        //// Display Player Spawns
        //if (enabled_players.some((p) => p.getBBox().checkInside(element.getBBox()))) {
        //  s += "P";
        //  continue;
        //}

        switch(element.getType()) {
          case "fill":    s += "X"; break;
          case "floor":   s += "."; break;
          case "bridge":  s += "b"; break;
          case "empty":   s += " "; break;
          case "cover":   s += "c"; break;
          case "window":  s += "W"; break;
          case "mountain":s += "M"; break;
          case "trophy":  s += "T"; break;
          default:        s += "?"; break;
        }
      }
      s += "\n";
    }
    console.log("\n" + s);
  }
}


// Individual Elements that make up Saturn
export class SaturnElement {
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

// A Deep Copy of Saturn's elements as a (x, y) slice (i, j, 0); k=0
// Implemented as a derivative of Saturn.
export class Saturn2D {
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
