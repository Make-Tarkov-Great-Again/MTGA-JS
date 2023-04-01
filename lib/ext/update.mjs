import { createWriteStream, existsSync } from 'fs';
import fetch from 'node-fetch'; 
import { Octokit } from '@octokit/rest'; 
import { fullArchive } from 'node-7z-archive';
import readline from 'readline';
import dns from 'dns/promises';

process.removeAllListeners('warning');

const checkInternet = async () => {
  try {
    await dns.lookup('google.com');
    return true;
  } catch (error) {
    return false;
  }
};

if (!await checkInternet()) {
  console.log("You're not connected to the internet! Cannot update!");
  import("../../app.mjs");
} else if (!existsSync("./updatebypass.json")) { //simple bypass until we figure out what the fuck we're doing with configs
  checkForUpdates();
} else {
  import("../../app.mjs");
}



/**
 * Checks for update using Octokit. 
 */
async function checkForUpdates() {
  const octokit = new Octokit();

const owner = 'Make-Tarkov-Great-Again';
const repo = 'MTGA-Releases';
  try {
    // Get the latest release information from GitHub
    const { data: latestRelease } = await octokit.repos.getLatestRelease({ owner, repo });

    // Compare the latest release version with the current version of MTGA
    const currentVersion = process.env.npm_package_version; // Current version of MTGA
    const latestVersion = latestRelease.tag_name.replace(/^v/, ''); // Latest version of MTGA

    if (latestVersion !== currentVersion) { // Check if there is a new version of MTGA available
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question(`Update ${latestVersion} is available. Do you want to update now? (y/n)\n\n`, async (answer) => {
        if (answer.toLowerCase() === "yes" || answer.toLowerCase() === "y") {
          // Download and install the latest release
          const downloadUrl = latestRelease.assets[0].browser_download_url; // URL to download the latest release
          const fileType = latestRelease.assets[0].content_type; // Type of the downloaded file
          const fileName = latestRelease.assets[0].name; // Name of the downloaded file
          const fileSize = latestRelease.assets[0].size;

          await downloadAndInstallUpdate(downloadUrl, fileName, fileSize);
          console.log("\n\nDownloaded the newest MTGA version.");
        } else {
          console.log("Update cancelled.");
          rl.close();
          import("../../app.mjs");
        }
      });
    } else {
      console.log('\nMTGA is up to date!');
      import("../../app.mjs");
    }
  } catch (error) {
    console.log("We encountered an error!!!!" + `\n\n\n ${error}`);
    import("../../app.mjs");
  }
}
    /**
     * Downloads and installs the updates
     */
async function downloadAndInstallUpdate(downloadUrl, fileName, fileSize) {
  const destPath = `./${fileName}`;

  const response = await fetch(downloadUrl);
  const totalSize = response.headers.get('content-length');
  let downloadedSize = 0;

  response.body.on('data', chunk => {
    downloadedSize += chunk.length;
    const progress = (downloadedSize / totalSize * 100).toFixed(2);
    process.stdout.write(`Downloading ${progress}%\r`);
  });

  const dest = createWriteStream(destPath);
  response.body.pipe(dest);

  await new Promise((resolve) => {
    dest.on('finish', resolve);
  });

  console.log(`Downloaded update to ${destPath}`);

  const fileTypeT = fileName.split(".");

  if (fileTypeT[1] === "zip" || fileTypeT[1] === "rar" || fileTypeT[1] === "7z") {
    console.log('Extracting update...');

    // Set up progress bar for extraction

    // Extract the file using the 7z binary and update progress bar as extraction progresses
    const filepath = destPath;
    console.log("./test")
    fullArchive(`${destPath}`)
    .progress(function (files) {
      console.log('Some files are extracted: %s', files);
    })
    
    // When all is done
    .then(function () {
      console.log('Extracting done!');
      import("../../app.mjs");
    })
    
    // On error
    .catch(function (err) {
      console.error(err);
    });

  }
  else if (fileTypeT === "exe") {
    const childProcess = spawn(`./${fileName}`);

    childProcess.stdout.on('data', (data) => {
      //console.log(`stdout: ${data}`);
    });

    childProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    childProcess.on('close', (code) => {
      console.log(`child process exited with code ${code}`);
      console.log("Should of extracted using Self-Extracting exe.")
    });
  }
}