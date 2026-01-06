import {
    
} from "scriptedeuch";
import {
    SaturnElement,
    Saturn,
    Saturn2D,
} from "./core.ts";

// Saturn Pathfinding
export default class Pathfinding {
    constructor(saturn, options) {
    this.saturn = saturn;
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
      case "floor":
      case "trophy":
      case "door":     return 10000;
      case "small_cover":
      case "mountain_tunnel":
                       return 8000;
      case "bridge":   return 2000;
      case "window":   return 2000;
      case "mountain": return 1000;
      case "cover":    return 500;
      case "empty":    return 400;
      case "fill":     return 10;
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
