const fs = require('fs-extra');
const path = require("path");
const glob = require("glob");
const { exec } = require('child_process');

const taskDir = path.dirname(__dirname);
const buildDir = path.join(taskDir, "build");
const publishDir = path.join(taskDir, "dist");

if (!fs.existsSync(buildDir)) {
    console.error(`no build output at ${buildDir}`);
    return;
}

if (!fs.existsSync(publishDir)) {
    fs.mkdirSync(publishDir);
}

console.log("syncing build directory...")
const files = glob.sync("src/**/*.js", { cwd: buildDir });
files.forEach(file => fs.copySync(path.join(buildDir, file), path.join(publishDir, file)));
console.log(`Done! Synced ${files.length} files.`)

console.log("syncing task dependencies...")
fs.copyFileSync(path.join(taskDir, "task.json"), path.join(publishDir, "task.json"));
fs.copyFileSync(path.join(taskDir, "icon.png"), path.join(publishDir, "icon.png"));
console.log("done!");

console.log("installing production only node modules...");
fs.copyFileSync(path.join(taskDir, "package.json"), path.join(publishDir, "package.json"));
exec("npm install --production", { cwd: publishDir }, () => console.log("done!"));