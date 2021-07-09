import * as tl from 'azure-pipelines-task-lib';
import * as path from 'path';
import * as toolLib from 'azure-pipelines-tool-lib';
import * as utils from './utils';

var version = ""

async function installHelmfile() {
    version = await utils.getHelmfileVersion();
    var helmfilePath = await utils.downloadHelmfile(version);
    // prepend the tools path. instructs the agent to prepend for future tasks
    if (!process.env['PATH'].startsWith(path.dirname(helmfilePath))) {
        toolLib.prependPath(path.dirname(helmfilePath));
    }
}

async function verifyHelmfile() {
    console.log("Verifying helmfile installation...");
    tl.which("helmfile", true);
}

installHelmfile()
    .then(() => verifyHelmfile())
    .then(() => {
        tl.setResult(tl.TaskResult.Succeeded, "");
    }).catch((error) => {
        tl.setResult(tl.TaskResult.Failed, error)
    });