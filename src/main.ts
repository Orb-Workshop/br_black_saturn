import { Instance as CSS } from "cs_script/point_script";
import * as SE from "scriptedeuch";

CSS.OnActivate(() => {
    CSS.Msg("BundledEuch has been Activated!");
});

CSS.OnScriptReload({after:() => {
    CSS.Msg("BundledEuch has been Reloaded!");
}});

