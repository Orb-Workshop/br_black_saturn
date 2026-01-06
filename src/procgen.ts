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
import PathCrawler from "./saturn/PathCrawler.ts";
import WormCrawler from "./saturn/WormCrawler.ts";
import RayTracing from "./saturn/RayTracing.ts";
import DiffusionLimitedAggregation from "./saturn/DiffusionLimitedAggregation.ts";
/*
  Procedural Generation Strategies
 */


//
// Room Placement
//

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
      
      let room = new BBox(
        room_position[0],
        room_position[1],
        room_dimensions[0],
        room_dimensions[1],
      );

      if (!this.saturn.getBBox().checkInside(room))
        continue;
      
      // Check if it can co-exist with other placed rooms
      let bCollision = false;
      for (let i = 0; i < this.placed_rooms.length; i++) {
        let placed_room = this.placed_rooms[i];
        if (room.checkIntersection(placed_room)) {
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
        let dLA = new DiffusionLimitedAggregation(this.saturn, this.srng);
      dLA.process();
    }
  }
}

export class WindowPlacement {
  constructor(procgen, options) {
    this.procgen = procgen;
      this.saturn = procgen.saturn;
      this.srng = procgen.srng;
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
        let raytracing = new RayTracing(this.saturn, this.srng, {
            func_collision: ((e) => e.isFill())
        });
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
      this.srng = procgen.srng;
    this.options = options || {};
    this.enabled = (this.options.enabled !== undefined) ? this.options.enabled : true;
    this.num_mountains = this.options.num_mountains || 2;
  }

  process() {
    if (!this.enabled) return;
    for (let i = 0; i < this.num_mountains; i++) {
      let checkCollision = (element) => ["floor", "cover"].includes(element.getType());
      let checkNegation = (element) => ["fill", "window"].includes(element.getType());
        let raytracing = new RayTracing(this.saturn, this.srng, {
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
