/*
  Runs after `bun install`

  Copies the scriptedeuch map prefabs into ./maps/prefabs/scriptedeuch
*/
import { cpSync } from "node:fs";
import * as path from "node:path";
console.log("Bun - Post-Installation Step");
console.log("Copying scriptedeuch library prefabs into './maps/prefabs/scriptedeuch' folder...");
cpSync(path.join("node_modules", "scriptedeuch", "maps", "prefabs", "scriptedeuch"),
       path.join("maps", "prefabs", "scriptedeuch"),
       {recursive: true});
