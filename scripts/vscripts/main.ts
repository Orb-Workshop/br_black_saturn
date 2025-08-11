/// <reference types="s2ts/types/cspointscript" />
//@ts-nocheck
import { Instance } from "cspointscript";
import ProcGen, {
    SeededRandomNumberGenerator,
    CubeDimensions,
    RandomSeed,
}
from "procgen.js";

class SaturnValveWorldRender {
    constructor(procgen, options) {
	this.procgen = procgen;
	this.saturn = procgen.saturn;
	this.srng = procgen.srng;
	this.player_start = [];
    }

    _cubeIndex(x, y) {
	return "cube." + y + x;
    }

    _elementIndex(x, y, z) {
	return "element." + z + y + x;
    }

    getElementEntityId(x, y, z) {
	let cubeIndex_x = Math.floor(x / CubeDimensions[0]);
	let cubeIndex_y = Math.floor(y / CubeDimensions[1]);
	let cubeIndex = this._cubeIndex(
            cubeIndex_x,
            cubeIndex_y,
	);

	let elementIndex_x = x % CubeDimensions[0];
	let elementIndex_y = y % CubeDimensions[1];
	let elementIndex = this._elementIndex(
            elementIndex_x,
            elementIndex_y,
            z,
	);
	
	return cubeIndex + "_" + elementIndex;
    }

    _elementFill(x, y, z) {
	let target = this.getElementEntityId(x, y, z) + "_fill";
	Instance.EntFireBroadcast(target, "Enable");
	if (z == 0) {
	    target = this.getElementEntityId(x, y, z) + "_floor";
	    Instance.EntFireBroadcast(target, "Enable");
	    this._elementColor(target, 1, 1, 0);
	}
    }

    _elementColor(target, r, g, b) {
	Instance.EntFireBroadcast(target, "Color", "" + r + " " + g + " " + b);
    }

    _elementFloor(x, y, z) {
	let target = this.getElementEntityId(x, y, z) + "_floor";
	Instance.EntFireBroadcast(target, "Enable");
	this._elementColor(target, 180, 180, 158);
    }

    _elementDisable(x, y, z) {
	let target = this.getElementEntityId(x, y, z)
	let target_fill = target + "_fill";
	Instance.EntFireBroadcast(target_fill, "Disable");
	
	// Floor only exists on the bottom of saturn.
	if (z == 0) {
	    let target_floor = target + "_floor";
	    Instance.EntFireBroadcast(target_floor, "Disable");
	}
    }

    _attachPlayerSpawns() {
	let player_start_listing = [
	    "player_spawn_t_1",
	    "player_spawn_t_2",
	    "player_spawn_t_3",
	    "player_spawn_ct_1",
	    "player_spawn_ct_2",
	    "player_spawn_ct_3",
	].map((p) => p + "_playerstart");
	this.srng.randomShuffle(player_start_listing);
	let player_spawns = [];
	this.saturn.cubes.forEachIndex((i, j) => {
	    player_spawns = player_spawns.concat(this.saturn.cubes.getAt(i, j).getPlayerSpawns());
	});
	let enabled_player_spawns = player_spawns.filter((p) => p.isEnabled());
	let playerspawn_ids = enabled_player_spawns.map((p) => "cube." + p.y + p.x + "_" + p.getID());
	for (let i = 0; i < playerspawn_ids.length; i++) {
	    this.player_start.push({
		from_entity_id: player_start_listing[i],
		to_entity_id: playerspawn_ids[i],
	    });
	}
    }

    spawnPlayers() {
	this.player_start.forEach((ps) => {
	    let from_playerstart = ps.from_entity_id;
	    let to_point_teleport = ps.to_entity_id;
	    Instance.EntFireBroadcast(to_point_teleport, "TeleportEntity", from_playerstart);
	});
    }

    clear() {
	this.saturn.forEachIndex((i, j, k) => {
	    let element = this.saturn.getAt(i,j,k);
	    if (!element.isEmpty()) {
		this._elementDisable(i, j, k);
	    }
	});
    }

    render() {
	this._attachPlayerSpawns();
	this.saturn.forEachIndex((i, j, k) => {
	    let element = this.saturn.getAt(i, j, k);
	    let genTarget = (i, j, k) => {return this.getElementEntityId(i, j, k) + "_fill";};
	    if (k !== 0) return;
	    let _type = element.getType();
	    switch(_type) {
		case "window":
		    this._elementFill(i, j, k);
		    this._elementColor(genTarget(i,j,k), 141,141,111);
		    break;
		case "cover":
		    this._elementFill(i, j, k);
		    this._elementColor(genTarget(i,j,k), 204,198,138);
		    break;
		case "trophy":
		    this._elementFill(i, j, k);
		    this._elementColor(genTarget(i,j,k), 196, 196, 63);
		    break;
		case "fill":
		    let fill_dist = {two: 50, three: 50, four: 10}
		    switch(this.srng.randomDistribution(fill_dist)) {
			case "two":
			    this._elementFill(i, j, k);
			    this._elementColor(genTarget(i, j, k), 151,151,121);
			    this._elementFill(i, j, k+1);
			    this._elementColor(genTarget(i,j,k+1), 161, 161, 131);
			    break;
			case "three":
			    this._elementFill(i, j, k);
			    this._elementColor(genTarget(i, j, k), 151,151,121);
			    this._elementFill(i, j, k+1);
			    this._elementColor(genTarget(i,j,k+1), 161, 161, 131);
			    this._elementFill(i, j, k+2);
			    this._elementColor(genTarget(i,j,k+2), 171, 171, 141);
			    break;
			case "four":
			    this._elementFill(i, j, k);
			    this._elementColor(genTarget(i, j, k), 151,151,121);
			    this._elementFill(i, j, k+1);
			    this._elementColor(genTarget(i,j,k+1), 161, 161, 131);
			    this._elementFill(i, j, k+2);
			    this._elementColor(genTarget(i,j,k+2), 171, 171, 141);
			    this._elementFill(i, j, k+3);
			    this._elementColor(genTarget(i,j,k+3), 181, 181, 151);
			    break;
		    }
		    break;
		case "mountain":
		    this._elementFill(i, j, k);
		    this._elementColor(genTarget(i,j,k), 33, 33, 32);
		    this._elementFill(i, j, k+1);
		    this._elementColor(genTarget(i, j, k+1), 44,44,33);
		    if (this.srng.randomChance(0.7)) {
			this._elementFill(i, j, k+2);
			this._elementColor(genTarget(i, j, k+2), 55,55,34);
		    } else {
			this._elementFill(i, j, k+2);
			this._elementColor(genTarget(i, j, k+2), 55,55,35);
			this._elementFill(i, j, k+3);
			this._elementColor(genTarget(i, j, k+3), 66,66,36);
		    }
		    break;
		case "floor":
		    this._elementFloor(i, j, k);
		    break;
	    }
	});
	return this;
    }
}


let world_render = null;
function GenerateWorldRender(seed) {
    seed = seed || RandomSeed();
    let procgen = new ProcGen(seed, {
	RoomPlacement: {
	    num_rooms: 12,
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
	    num_mountains: 5,
	},
	PlayerPlacement: {
	    enabled: true,
	},
	PropPlacement: {
	    
	},
    }).process();

    let world_render = new SaturnValveWorldRender(procgen, {}).render();
    Instance.Msg("ProcGen Processed Seed: " + procgen.seed);
    return world_render;
}

function StartWorldRender() {
    if (world_render === null)
	world_render = GenerateWorldRender();
    world_render.spawnPlayers();
}

function ClearWorldRender() {
    if (world_render !== null) {
	world_render.clear();
	world_render = null;
    }
    else {
	Instance.Msg("ERROR: World Render is Null. Failed to Clear.");
    }
}


Instance.InitialActivate(() => {
    StartWorldRender();
});



