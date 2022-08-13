import * as path from "path";
import * as fs from "fs";
import * as toolLib from "azure-pipelines-tool-lib";
import * as os from "os";
import * as util from "util";
import * as uuidV4 from "uuid/v4";
import * as tl from "azure-pipelines-task-lib";
import * as semver from "semver";

const helmfileToolName = "helmfile";
const helmfileAllReleasesUrl = "https://api.github.com/repos/helmfile/helmfile/releases";
const stableHelmfileVersion = "v0.145.2";

function getExecutableExtension(): string {
    if (os.type().match(/^Win/)) {
        return ".exe";
    }

    return "";
}

function getSupportedLinuxArchitecture(): string {
    let supportedArchitecture = "amd64";
    const architecture = os.arch();
    if (architecture.startsWith("arm")) { //both arm64 and arm are handled
        supportedArchitecture = architecture;
    }
    return supportedArchitecture;
}

function findHelmfile(rootFolder: string) {
    const helmPath = path.join(rootFolder, `${helmfileToolName}${getExecutableExtension()}`);
    const allPaths = tl.find(rootFolder);
    const matchingResultsFiles = tl.match(allPaths, helmPath, rootFolder);
    return matchingResultsFiles[0];
}

function getHelmfileDownloadURL(version: string): string {
    const versionWithoutPrefix = version.replace(/^v/, "");
    switch (os.type()) {
        case "Linux":
            const architecture = getSupportedLinuxArchitecture();
            return util.format("https://github.com/helmfile/helmfile/releases/download/%s/helmfile_%s_linux_%s.tar.gz", version, versionWithoutPrefix, architecture);

        case "Darwin":
            return util.format("https://github.com/helmfile/helmfile/releases/download/%s/helmfile_%s_darwin_amd64.tar.gz", version, versionWithoutPrefix);

        case "Windows_NT":
            return util.format("https://github.com/helmfile/helmfile/releases/download/%s/helmfile_%s_windows_amd64.exe.tar.gz", version, versionWithoutPrefix);

        default:
            throw Error("Unknown OS type");
    }
}

async function getStableHelmfileVersion(): Promise<string> {
    try {
        const downloadPath = await toolLib.downloadTool(helmfileAllReleasesUrl);
        const responseArray = JSON.parse(fs.readFileSync(downloadPath, "utf8").toString().trim());
        let latestHelmfileVersion = semver.clean(stableHelmfileVersion);
        responseArray.forEach(response => {
            if (response && response.tag_name) {
                let currentHelmfileVersion = semver.clean(response.tag_name.toString());
                if (currentHelmfileVersion) {
                    if (currentHelmfileVersion.toString().indexOf("rc") == -1 && semver.gt(currentHelmfileVersion, latestHelmfileVersion)) {
                        //If current helm version is not a pre release and is greater than latest helm version
                        latestHelmfileVersion = currentHelmfileVersion;
                    }
                }
            }
        });
        latestHelmfileVersion = "v" + latestHelmfileVersion;
        return latestHelmfileVersion;
    } catch (error) {
        let telemetry = {
            event: "HelmLatestNotKnown",
            url: helmfileAllReleasesUrl,
            error: error
        };
        console.log("##vso[telemetry.publish area=%s;feature=%s]%s",
            "TaskEndpointId",
            "HelmfileInstaller",
            JSON.stringify(telemetry));

        tl.warning(`Unable to determine latest helmfile version '${stableHelmfileVersion}' at URL ${helmfileAllReleasesUrl}.`);
    }

    return stableHelmfileVersion;
}

function sanitizeVersionString(inputVersion: string): string {
    var version = toolLib.cleanVersion(inputVersion);
    if (!version) {
        throw new Error(`'${inputVersion}' is not a valid version string.`);
    }

    return "v" + version;
}

export async function getHelmfile(version?: string) {
    try {
        return Promise.resolve(tl.which("helmfile", true));
    } catch (ex) {
        return downloadHelmfile(version);
    }
}

export async function downloadHelmfile(version?: string): Promise<string> {
    if (!version) { version = await getStableHelmfileVersion(); }
    let cachedToolpath = toolLib.findLocalTool(helmfileToolName, version);
    if (!cachedToolpath) {
        let helmfileDownloadPath: string;
        const downloadUrl = getHelmfileDownloadURL(version);
        try {
            const tempDirectory = `${helmfileToolName}-${version}-${uuidV4()}`;
            helmfileDownloadPath = await toolLib.downloadTool(downloadUrl, path.join(tempDirectory, helmfileToolName));
        } catch (exception) {
            throw new Error(`Failed to download helmfile at URL ${downloadUrl}. Exception: ${exception}`);
        }
        cachedToolpath = await toolLib.cacheDir(path.dirname(helmfileDownloadPath), helmfileToolName, version);
    }
    const helmfilepath = findHelmfile(cachedToolpath);
    if (!helmfilepath) {
        throw new Error(`Unable to find cached helmfile at path ${cachedToolpath}.`);
    }

    fs.chmodSync(helmfilepath, "777");
    return helmfilepath;
}

export async function getHelmfileVersion(): Promise<string> {
    let helmfileVersion = tl.getInput("helmfileVersionToInstall");
    if (helmfileVersion && helmfileVersion != "latest") {
        return sanitizeVersionString(helmfileVersion);
    }

    return await getStableHelmfileVersion();
}
