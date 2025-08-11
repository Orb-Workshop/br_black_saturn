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

    _getPlayerSpawns() {
	let player_spawns = [];
	this.saturn.cubes.forEachIndex((i, j) => {
	    player_spawns = player_spawns.concat(this.saturn.cubes.getAt(i, j).getPlayerSpawns());
	});
	return player_spawns;
    }

    _attachPlayerSpawns() {
	let enabled_player_spawns = this._getPlayerSpawns().filter((p) => p.isEnabled());
	enabled_player_spawns.forEach((p) => {
	    let target = this._getPlayerTargetname(p);
	    Instance.EntFireBroadcast(target, "SetEnabled");
	    //Instance.Msg("Enabled Target: " + target);
	});
    }

    _getPlayerTargetname(p) {
	let target = "cube." + p.cube_element.y + p.cube_element.x + "_" + p.getID()
	return target;
    }

    clear() {
	// Clear the elements
	this.saturn.forEachIndex((i, j, k) => {
	    let element = this.saturn.getAt(i,j,k);
	    if (!element.isEmpty()) {
		this._elementDisable(i, j, k);
	    }
	});
	// Disable Enabled Players
	let players = this._getPlayerSpawns();
	players.filter((p) => p.isEnabled()).forEach((p) => {
	    let target = this._getPlayerTargetname(p);
	    Instance.EntFireBroadcast(target, "SetDisabled");
	});
    }

    render() {
	this._attachPlayerSpawns();
	this.saturn.forEachIndex((i, j, k) => {
	    let element = this.saturn.getAt(i, j, k);
	    let genTarget = (i, j, k) => {return this.getElementEntityId(i, j, k) + "_fill";};
	    let getAt = (i, j, k) => this.saturn.getAt(i, j, k);
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
			    getAt(i, j, k+1).fill();
			    break;
			case "three":
			    this._elementFill(i, j, k);
			    this._elementColor(genTarget(i, j, k), 151,151,121);
			    this._elementFill(i, j, k+1);
			    this._elementColor(genTarget(i,j,k+1), 161, 161, 131);
			    this._elementFill(i, j, k+2);
			    this._elementColor(genTarget(i,j,k+2), 171, 171, 141);
			    getAt(i, j, k+1).fill();
			    getAt(i, j, k+2).fill();
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
			    getAt(i, j, k+1).fill();
			    getAt(i, j, k+2).fill();
			    getAt(i, j, k+3).fill();
			    break;
		    }
		    break;
		case "mountain":
		    this._elementFill(i, j, k);
		    this._elementColor(genTarget(i,j,k), 33, 33, 32);
		    this._elementFill(i, j, k+1);
		    this._elementColor(genTarget(i, j, k+1), 44,44,33);
		    getAt(i, j, k+1).mountain();
		    if (this.srng.randomChance(0.7)) {
			this._elementFill(i, j, k+2);
			this._elementColor(genTarget(i, j, k+2), 55,55,34);
			getAt(i, j, k+2).mountain();
		    } else {
			this._elementFill(i, j, k+2);
			this._elementColor(genTarget(i, j, k+2), 55,55,35);
			this._elementFill(i, j, k+3);
			this._elementColor(genTarget(i, j, k+3), 66,66,36);
			getAt(i, j, k+2).mountain();
			getAt(i, j, k+3).mountain();
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
function GenerateWorldRender() {
    if (world_render !== null) world_render.clear();
    let procgen = new ProcGen(null, {
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

    world_render = new SaturnValveWorldRender(procgen, {}).render();
    Instance.Msg("ProcGen Processed Seed: " + procgen.seed);
    return world_render;
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

Instance.PublicMethod("GenerateWorldRender", () => GenerateWorldRender());
Instance.PublicMethod("ClearWorldRender", () => ClearWorldRender());

let saturn_init = false;
Instance.InitialActivate(() => {
    saturn_init = true
    world_render = GenerateWorldRender();
});
