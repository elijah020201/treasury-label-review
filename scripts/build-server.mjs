import { build } from "esbuild";
import { mkdirSync, cpSync, existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
await build({
  entryPoints: ["server/handler.ts"],
  outfile: "dist-server/handler.cjs",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  external: ["sharp"],
});
// Lambda needs the Linux native Sharp package even when built on Windows.
mkdirSync("dist-server/node_modules", { recursive: true });
for (const name of ["sharp", "@img", "detect-libc", "semver"])
  if (existsSync(`node_modules/${name}`))
    cpSync(`node_modules/${name}`, `dist-server/node_modules/${name}`, {
      recursive: true,
    });
if (process.platform !== "linux") {
  const sharp = JSON.parse(
    readFileSync("node_modules/sharp/package.json", "utf8"),
  );
  mkdirSync(".local", { recursive: true });
  for (const name of ["@img/sharp-linux-x64", "@img/sharp-libvips-linux-x64"]) {
    const version = sharp.optionalDependencies[name];
    const archive = `${name.replace("@", "").replace("/", "-")}-${version}.tgz`;
    if (!existsSync(`.local/${archive}`))
      execFileSync(
        process.execPath,
        [
          process.env.npm_execpath,
          "pack",
          `${name}@${version}`,
          "--pack-destination",
          ".local",
        ],
        { stdio: "pipe" },
      );
    const dest = `dist-server/node_modules/${name}`;
    mkdirSync(dest, { recursive: true });
    execFileSync("tar", [
      "-xf",
      `.local/${archive}`,
      "-C",
      dest,
      "--strip-components",
      "1",
    ]);
  }
}
