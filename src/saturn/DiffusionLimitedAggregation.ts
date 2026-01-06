import {

} from "scriptedeuch";
import {
    Saturn,
    SaturnElement,
} from "./core.ts";

export default class DiffusionLimitedAggregation {
    constructor(saturn, srng, options) {
        this.saturn = saturn;
        this.srng = srng;
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
