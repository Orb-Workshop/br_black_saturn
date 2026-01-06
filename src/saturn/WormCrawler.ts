import {

} from "scriptedeuch";
import {
    Saturn,
    SaturnElement,
    Saturn2D
} from "./core.ts";


// Drunkard's Walk
export class WormCrawler {
    constructor(saturn, srng, options) {
        this.saturn = saturn;
        this.srng = srng;
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
