//
// Procedural Generation Library
//
import {
    Deepcopy,
    RandomSeed,
    SeededRandomNumberGenerator,
    Point2 as Point,
    LineSegment2 as LineSegment,
    BBox2 as BBox,
} from "scriptedeuch";
import {
    ElementDimensions,

    SaturnElement,
    Saturn,
    Saturn2D,
} from "./saturn/core.ts";
import PathFinding from "./saturn/PathFinding.ts";



const DEFAULT_TRANSMUTE_LIST = {
  mountain: "floor",
  fill: "floor",
  cover: "floor",
  window: "floor",
};
export class PathCrawler {
  constructor(procgen, options) {
    this.procgen = procgen;
    this.saturn = procgen.saturn;
    this.srng = procgen.srng;
    this.options = options || {};
    // TODO: Path Width is hardcoded to 2, add functionality.
    this.path_width = this.options.path_width || 2;
    this.transmute_list = this.options.transmute_list || DEFAULT_TRANSMUTE_LIST;
  }

  _traversePath(element_from, element_to) {
    if (element_to === null) return;
    let direction = this._directionTo(element_from, element_to);
    // Paths only go up/down or left/right
    direction = (direction.lr !== null) ? direction.lr : direction.ud;
    switch(direction) {
      case "left": this._traverseLeft(element_from); break;
      case "right": this._traverseRight(element_from); break;
      case "up": this._traverseUp(element_from); break;
      case "down": this._traverseDown(element_from); break;
      default: throw new Error("This should never happen");
    }
  }

  _directionTo(element_from, element_to) {
    // Left / Right
    let direction_lr = null;
    if (element_from.x < element_to.x) direction_lr = "right";
    else if (element_from.x > element_to.x) direction_lr = "left";
    
    // Up / Down
    let direction_ud = null;
    if (element_from.y < element_to.y) direction_lr = "down";
    else if (element_from.y > element_to.y) direction_lr = "up";

    //
    return {lr: direction_lr, ud: direction_ud};
  }

  _traverseLeft(element) {
    element.floor();
    let t_element = element.left();
    let ta_element = t_element.up();
    let tb_element = t_element.down();

    t_element.floor();

    // Check Null Edge Cases
    if (ta_element === null) {
      tb_element.floor();
      return;
    }

    if (tb_element === null) {
      ta_element.floor();
      return;
    }

    if (ta_element.isFloor() || tb_element.isFloor()) return;

    if (this.srng.randomChance(0.5)) {
      ta_element.floor();
      return;
    }
    else {
      tb_element.floor();
      return;
    }
  }

  _traverseRight(element) {
    element.floor();
    let t_element = element.right();
    let ta_element = t_element.up();
    let tb_element = t_element.down();

    t_element.floor();

    // Check Null Edge Cases
    if (ta_element === null) {
      tb_element.floor();
      return;
    }

    if (tb_element === null) {
      ta_element.floor();
      return;
    }

    if (ta_element.isFloor() || tb_element.isFloor()) return;

    if (this.srng.randomChance(0.5)) {
      ta_element.floor();
      return;
    }
    else {
      tb_element.floor();
      return;
    }
  }

  _traverseUp(element) {
    element.floor();
    let t_element = element.up();
    let ta_element = t_element.left();
    let tb_element = t_element.right();

    t_element.floor();

    // Check Null Edge Cases
    if (ta_element === null) {
      tb_element.floor();
      return;
    }

    if (tb_element === null) {
      ta_element.floor();
      return;
    }

    if (ta_element.isFloor() || tb_element.isFloor()) return;

    if (this.srng.randomChance(0.5)) {
      ta_element.floor();
      return;
    }
    else {
      tb_element.floor();
      return;
    }
  }

  _traverseDown(element) {
    element.floor();
    let t_element = element.down();
    if (t_element === null) return;
    let ta_element = t_element.left();
    let tb_element = t_element.right();

    t_element.floor();

    // Check Null Edge Cases
    if (ta_element === null) {
      tb_element.floor();
      return;
    }

    if (tb_element === null) {
      ta_element.floor();
      return;
    }

    if (ta_element.isFloor() || tb_element.isFloor()) return;

    if (this.srng.randomChance(0.5)) {
      ta_element.floor();
      return;
    }
    else {
      tb_element.floor();
      return;
    }
  }

  _pathNext(path, element) {
    let px = element.x;
    let py = element.y;
    let element_parent_position = path.getAt(px, py).parent;
    if (element_parent_position === null) return null;
    let ep_x = element_parent_position[0];
    let ep_y = element_parent_position[1];
    let parent_element = this.saturn.getAt(ep_x, ep_y);
    if (parent_element === undefined)
      console.log(ep_x, ep_y);

    return parent_element;
  }

  // Crawls a `path` provided by using the method
  // Pathfinding.getShortestPaths(x_destination, y_destination)
  // Notes:
  // - `path` is a Saturn2D instance containing elements with a `.parent` attr.
  //   - This 'parent' attribute points at the element leading to the shortest path.
  crawl(path, x, y) {
    let current_position = [x, y];
    while (current_position !== null) {
      let px = current_position[0];
      let py = current_position[1];
      let element_from = this.saturn.getAt(px, py, 0);
      let element_to = this._pathNext(path, element_from);
      this._traversePath(element_from, element_to);
      current_position = (element_to !== null) ? [element_to.x, element_to.y] : null;
    }
  }
}





/*
  Procedural Generation Strategies
 */


//
// Room Placement
//
export class Room {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  getBBox() {
    let x = this.x;
    let y = this.y;
    let w = this.w;
    let h = this.h;
    return new BBox(x, y, w, h);
  }

  getValveBBox() {
    let x = this.x * ElementDimensions[0];
    let y = this.y * ElementDimensions[1];
    let w = this.w * ElementDimensions[0];
    let h = this.h * ElementDimensions[1];
    return new BBox(x, y, w, h);
  }
}

const RP_DEFAULT_HALLWAY_WIDTH = 3;
const RP_DEFAULT_CEILING_HEIGHT = 4;
const RP_DEFAULT_NUM_ROOMS = 6;
export class RoomPlacement {
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

      if (!this.saturn.getBBox().checkInside(room.getBBox()))
        continue;
      
      // Check if it can co-exist with other placed rooms
      let bCollision = false;
      for (let i = 0; i < this.placed_rooms.length; i++) {
        let placed_room = this.placed_rooms[i];
        if (room.getBBox().checkIntersection(placed_room.getBBox())) {
          bCollision = true;
          break;
        }
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

export class SplotchCell {
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
export class SplotchSystem {
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
export class SolidifySystem {
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

export class CellularAutomata {
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
export class BridgePlacement {
  constructor(procgen, options) {
    this.procgen = procgen;
    this.saturn = procgen.saturn;
    this.options = options || {};
    this.enabled = (this.options.enabled !== undefined) ? this.options.enabled : true;
    this.bridge_width = this.options.bridge_width || BP_DEFAULT_BRIDGE_WIDTH;
    this.bridge_length = this.options.bridge_length || BP_DEFAULT_BRIDGE_LENGTH;
    this.threshold = this.options.threshold || BP_DEFAULT_THRESHOLD;
    this.placed_bridges = [];
    this.pathfinding = new PathFinding(
        this.saturn,
        this.options.PathFinding,
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
export class WormCrawler {
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

export class DiffusionLimitedAggregation {
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

export class RayTracing {
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

export class CoverPlacement {
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

export class WindowPlacement {
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


export class MountainPlacement {
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
export default class ProcGen {
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

    // Stage 7 - Determine Player Spawn Placement

    // Stage 8 -  Place Trophy Room. Place props on the map.

    return this;
  }

  display2d() {
    console.log("Seed: " + this.seed);
    this.saturn.display2d();
    return this;
  }
}
