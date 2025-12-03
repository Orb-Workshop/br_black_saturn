# bundledeuch
**bundledeuch**, is a drop-in Counter-Strike 2 TypeScript Bundling Template using Bun.

## How to use with a newly created CS2 Workshop Project

### Step 1 - Installing

Install: [Bun](https://bun.com)

### Step 2 - Navigating, Using a Terminal

Navigate to your **content/csgo_addons** folder and open a Terminal.

I recommend [WezTerm](https://wezterm.org/)

#### Path Example:

`Z:\SteamLibrary\steamapps\common\Counter-Strike Global Offensive\content\csgo_addons`

### Step 3 - Applying the Template to your CS2 Project

While the Terminal Shell's Current Working Directoy is within the
csgo_addons folder, apply the `Orb-Workshop/bundledeuch` bun template
to the new CS2 Workshop project named '\<project-name\>'.

```bash
bun create Orb-Workshop/bundledeuch <project-name>
```

#### Notes

- If you prefer, you can clone this repository, then copy and paste
  the contents of the repository over to your new CS2 Workshop
  project.

  - By preference, the `packages.json` file should be edited to reflect your project! ie. `name` field.

### Step 4 - Using the Bundling Template: Building the Bundle

Navigate into your project folder and build the `src/main.ts`
entrypoint by running the `build` script.

```bash
cd <project-name>
bun run build
```

**OR**

Navigate to the project folder,
`[...]/content/csgo_addons/<project-name>`, and run the
`script_build.bat` batch script as an alternative.

### Conclusions

- typescript and javascript files placed in the project roots `./src`
  folder are part of the bundler's module system, which is the
  standard javascript module system.

  - https://bun.com/docs/bundler

- `./src/main.ts` is the Main Entrypoint.

  - When you run `bun run build`, this bundles all of the source files
    imported from `./src/main.ts` into the resulting
    `./scripts/main.js` file.

- The bundled `scripts/main.js` file can be referenced in your map
  with a point_script entity as `scripts/main.vjs`.

## How to use this Template in an Existing CS2 Workshop Project

**IMPORTANT: Please backup your existing CS2 workshop project before applying this template!**

The process remains the same as for a new project. `bun create`
shouldn't overwrite existing files, but please note that it could
interfere with existing bundlers/build systems!


## Start Developing!

### Watch-mode

During development, you can run a watch script to keep recompiling
your bundled scripts while working on `./src/main.ts`.

From within your project folder, run:
```bash
bun run watch
```

or execute the `script_watch.bat` batch script.

### NOTE: The watch functionality is experimental and may be buggy.

### Start Hacking!

The entire typescript/javascript ecosystem is now at your disposal, with some limitations!

Edit the package.json file to bundle more dependencies! 

## References

- [Bun](https://bun.com/)

- [CS2 Scripting API](https://developer.valvesoftware.com/wiki/Counter-Strike_2_Workshop_Tools/Scripting_API)