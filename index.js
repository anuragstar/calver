const core = require("@actions/core");
const fs = require("fs");
const exec = require("@actions/exec");

const versionCodeRegex = new RegExp(/versionCode\s*=\s*(\d*)/);
const versionNameRegex = new RegExp(/versionName\s*=\s*"([0-9|.|a-z]*)"/);
const calverRegex = new RegExp(/\d{2}.\d{2}.\d{2}.((\d).*)(-[a-z].*)?/);
const calveriOSRegex = new RegExp(/\d{2}.\d{2}.((\d{2}).*)(-[a-z].*)?/);
const packageVersion = new RegExp(/"version"\s*:\s*"([^\s]*)"/);
let calverNewVersion;
let calverResult;
let result;
let newVersion;

const pad = (n) => {
  n = n + "";
  if (n.length === 2) return n;
  if (n.length === 1) return "0" + n;
};

async function execCommand(command, options = {}) {
  const projectPath = "/Users/anuragsinha/Documents/tools/mono-ios/hotstarx-ios-mobile"
  //const projectPath = "/Users/anuragsinha/Documents/hotstar/hotstar-android-mobile"
  //const projectPath = core.getInput('project-path')
  options.cwd = projectPath
  return (await exec.getExecOutput(command, [], options)).stdout.valueOf().replace(/[^0-9]/g, '')}

function makePromise(x) { 
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(x);
    }, 1000);
  });
}

const isCalver = (version,platform) => {
  const date = new Date();
  newVersion = `${date.getFullYear() % 100}.${pad(
    date.getMonth() + 1
  )}.${pad(date.getDate())}`;
  console.log(version)
  console.log(newVersion)
  // global.calverNewVersion = newVersion;
  // console.log("CalverNewVersion",global.calverNewVersion);
  let fullVersion;
  console.log("Before Calver Result",version)
  if (platform === "ios") {
   result = calveriOSRegex.exec(version);
  // global.calverResult = result;
  // console.log("CalverResult",global.calverResult);
  } else {
       result = calverRegex.exec(version);
  }

  console.log("Calver Result",result)
  if (!result) return newVersion + ".0";

    const prev = result[0];


    console.log("Calver Result[0]",prev)
    console.log("Calver Result[1]",result[1])
    console.log("Prev Slice[1]",prev.slice(0, 8))
    console.log("New Version",newVersion)




  if (prev.slice(0, 8) === newVersion) {
    fullVersion = `${newVersion}.${Number(result[1]) + 1}`;
  } else {
    fullVersion = `${newVersion}.0`;
  }
  return fullVersion;
};

const versionFiltering = (newVersion,result,version) => {
  let finalVersion;
  const prev = result[0];
  if (prev.slice(0, 8) === newVersion) {
    //finalVersion = `${calverNewVersion}.${Number(version) + 1}`;
    finalVersion = `${Number(version) + 1}`;
  } else {
    finalVersion = 0;
  }
  return finalVersion;
}

// most @actions toolkit packages have async methods
async function run() {
  try {
    const filePath = "/Users/anuragsinha/Documents/tools/mono-ios/hotstarx-ios-mobile/hotstarx-ios-mobile/Application/Info.plist"
    //const filePath = "/Users/anuragsinha/Documents/hotstar/hotstar-android-mobile/app/build.gradle.kts"
    const platform = "ios"
    // const filePath = core.getInput("path");
    // const platform = core.getInput("platform");
    


    if (!filePath && !platform) return;

    const fileContents = fs.readFileSync(filePath).toString();

    if (platform === "android") {
      // eslint-disable-next-line no-unused-vars
      const [_, versionCode] = versionCodeRegex.exec(fileContents);
      const newVersion = Number(versionCode) + 1;
      // eslint-disable-next-line no-unused-vars
      const [__, versionName] = versionNameRegex.exec(fileContents);

      const fullVersion = isCalver(versionName);
      console.log(fullVersion)

      const versionUpdated = fileContents.replace(
        versionCodeRegex,
        (main, old) => main.replace(old, newVersion)
      );
      const versionNameUpdated = versionUpdated.replace(
        versionNameRegex,
        (main, old) => main.replace(old, fullVersion)
      );
      fs.writeFileSync(filePath, versionNameUpdated);
    } else if (platform === "web") {
      const packageJson = JSON.parse(fileContents);
      const fullVersion = isCalver(packageJson.version,platform);

      const newContent = fileContents.replace(packageVersion, (main, old) =>
        main.replace(old, fullVersion)
      );

      fs.writeFileSync(filePath, newContent);
    } else if (platform === "ios") { 
      const marketing = `agvtool what-marketing-version -terse1`
      const currentVersion =  await execCommand(marketing).catch(error => {
            core.setFailed(error.message)
        });
      console.log("Version agv tool", currentVersion);
      const fullVersion = isCalver(currentVersion,platform);
      console.log("Version Returned", fullVersion);
      const [major,minor,patch,buildVersion]  = fullVersion.split('.');
      var combinedVersion = major + '.' + minor + '.' + patch;
      var version =  await execCommand(`xcrun agvtool what-version`).catch(error => {
            core.setFailed(error.message)
        });
      console.log("Version Number",version)
    
      
      constNewBumpVersion = versionFiltering(newVersion,result,version)
      const updatedVersion = `agvtool new-version -all ${Number(constNewBumpVersion)}`
      await execCommand(updatedVersion).catch(error => {
        core.setFailed(error.message)
    })
      
      const newMarketingVersion = `xcrun agvtool new-marketing-version ${combinedVersion}`
      console.log(newMarketingVersion);
      await execCommand(newMarketingVersion).catch(error => {
        core.setFailed(error.message)
      })
      
    }
    else {
      core.setFailed("Only `android` and `web` supported right now.");
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();

module.exports = run;
