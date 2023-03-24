process.removeAllListeners('warning')
import { createWriteStream } from 'fs';
import https from 'https';
import fetch from 'node-fetch';
import { exec } from 'child_process';
import cliProgress from 'cli-progress';
import { Octokit } from '@octokit/rest';
import { OnReadyStartServer } from '../../app.mjs';
import { delay } from '../utilities/utility.mjs';
import sevenBin from '7zip-bin'
import Seven from 'node-7z'

const octokit = new Octokit();

const owner = 'Make-Tarkov-Great-Again';
const repo = 'Release'; //????

export async function checkForUpdates() {
  try {
    // Get the latest release information from GitHub
    const { data: latestRelease } = await octokit.repos.getLatestRelease({ owner, repo });

    // Compare the latest release version with the current version of MTGA
    const currentVersion = process.env.npm_package_version; // Current version of MTGA
    const latestVersion = latestRelease.tag_name.replace(/^v/, ''); // Latest version of MTGA

    if (latestVersion !== currentVersion) { // Check if there is a new version of MTGA available
      console.log(`New version available: ${latestVersion}`);

      // Download and install the latest release
      const downloadUrl = latestRelease.assets[0].browser_download_url; // URL to download the latest release
      const fileType = latestRelease.assets[0].content_type; // Type of the downloaded file
      const fileName = latestRelease.assets[0].name; // Name of the downloaded file
      const fileSize = latestRelease.assets[0].size;

      await downloadAndInstallUpdate(downloadUrl, fileName, fileSize);
      console.log("\n\nDownloaded the newest MTGA version.");

      await delay(5000); // Wait for 15 seconds
      OnReadyStartServer(); // Start the server
    } else {
      console.log('\nMTGA is up to date!');
      await delay(5000); // Wait for 10 seconds
      OnReadyStartServer(); // Start the server
    }
  } catch (error) {
    //if {config.debug} {
    // console.error('\n\nError checking for update: \n\n', error);
    console.log("MTGA is up to date!")
    //}
    await delay(5000); // Wait for 10 seconds
    await OnReadyStartServer(); // Start the server
  }
}
// This is an asynchronous function that downloads a file from a given URL
// and saves it to a file with the specified name
async function downloadAndInstallUpdate(downloadUrl, fileName, fileSize) {
  // Set the destination path to the current directory and the specified file name
  const destPath = `./${fileName}`;

  // Set up progress bar for download
  const downloadBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  console.log('Downloading update...');
  downloadBar.start(100, 0);
  downloadBar.setTotal(`${fileSize}`)

  // Download the release asset from GitHub
  const dest = createWriteStream(destPath);
  const response = await fetch(downloadUrl);

  // Handle errors that occur during download
  response.body.on('error', () => {
    console.log('Error while downloading update.');
    downloadBar.stop();
  });

  // Update progress bar as download progresses
  response.body.on('data', (chunk) => {
    downloadBar.increment(chunk.length);
  });

  // Save downloaded file to destination
  response.body.pipe(dest);

  // Wait for download to complete
  await new Promise((resolve) => {
    dest.on('finish', resolve);
  });

  // Stop progress bar and print message indicating download completion
  downloadBar.stop();
  console.log(`Downloaded update to ${destPath}`);

  // Extract the release asset if it is a zip, rar or 7z file
  const fileTypeT = fileName.split(".");
  console.log("Waiting 2 seconds to make sure it fully downloaded.")
  await delay(2000);

  if (fileTypeT[1] === "zip" || fileTypeT[1] === "rar" || fileTypeT[1] === "7z") {
    console.log('Extracting update...');
    const extractionBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

    // Set up progress bar for extraction
    extractionBar.start(100, 0);

    // Extract the file using the 7z binary and update progress bar as extraction progresses
    const filepath = destPath;
    const sevzpath = sevenBin.path7za
    const myStream = Seven.extract(filepath, './', {
      $progress: true,
      $bin: sevzpath
    })

    myStream.on('progress', function (progress) {
      extractionBar.update(progress.percent);
    })

    // Stop progress bar and print message indicating extraction completion, then start the server
    myStream.on('end', function () {
      extractionBar.stop();
      console.log(`\n\nExtracted update to ./`);
    })
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