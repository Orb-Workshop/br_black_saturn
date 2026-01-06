import {
    SeededRandomNumberGenerator,
} from "scriptedeuch";
import {
    Saturn,
    SaturnElement,
} from "./core.ts";

const DEFAULT_TRANSMUTE_LIST = {
    mountain: "floor",
    fill: "floor",
    cover: "floor",
    window: "floor",
};
export default class PathCrawler {
    constructor(saturn: Saturn, srng: SeededRandomNumberGenerator, options) {
        this.saturn = saturn;
        this.srng = srng;
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
