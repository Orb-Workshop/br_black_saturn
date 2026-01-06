import {
    
} from "scriptedeuch";
import {
    SaturnElement,
    Saturn,
    Saturn2D,
} from "./core.ts";

export default class RayTracing {
    constructor(saturn, srng, options) {
    this.saturn = saturn;
    this.srng = srng;
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
    return Math.hypot(pt[0], pt[1]);
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
  // Returns null if max_distance reached.
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
