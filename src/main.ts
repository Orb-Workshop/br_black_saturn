import { Instance as CSS } from "cs_script/point_script";
import { Vector, QAngle } from "scriptedeuch";

CSS.OnActivate(() => {
    CSS.Msg("BundledEuch has been Activated!");
});

CSS.OnScriptReload({after:() => {
    let v = Vector.create(0, 1, 2);
    CSS.Msg("Vector: " + JSON.stringify(v));
    CSS.Msg("BundledEuch has been Reloaded!!");
}});
