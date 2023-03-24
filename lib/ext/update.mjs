import fs from 'fs';
import https from 'https';
import fetch from 'node-fetch';
import { exec } from 'child_process';
import cliProgress from 'cli-progress';
import { Octokit } from '@octokit/rest';
import { startServer } from '../../app.mjs';
import { delay } from '../utilities/utility.mjs';
//import sevenBin from '7zip-bin'
//import Seven from 'node-7z'


const octokit = new Octokit();

const owner = 'EFHDev';
const repo = 'MTGA-Backend';

export async function checkForUpdates() {
  try {
    // Get the latest release information from GitHub
    const { data: latestRelease } = await octokit.repos.getLatestRelease({ owner, repo });
    // Compare the latest release version with the current version of MTGA
    const currentVersion = process.env.npm_package_version;
    const latestVersion = latestRelease.tag_name.replace(/^v/, '');
    if (latestVersion !== currentVersion) {
      console.log(`New version available: ${latestVersion}`);

      // Download and install the latest release
      const downloadUrl = latestRelease.assets[0].browser_download_url;
      const fileType = latestRelease.assets[0].content_type;
      const fileName = latestRelease.assets[0].name;
      await downloadAndInstallUpdate(downloadUrl, fileType, fileName);
      console.log("Downloaded the newest MTGA version.");
      await delay(15000);
      startServer();
    } else {
      console.log('MTGA is up to date!');
      await delay(10000);
      startServer();
    }
  } catch (error) {
    console.error('\n\nError checking for update: \n\n', error);
    await delay(10000);
    startServer();
  }
}

async function downloadAndInstallUpdate(downloadUrl, fileType, fileName, fileExtension) {
  // Download the release asset from GitHub
  console.log('Downloading update...');
  const dest = fs.createWriteStream(`./${fileName}`);
  const response = await fetch(downloadUrl);
  response.body.pipe(dest);
  console.log(`Downloaded update to ./${fileName}`);
  console.log(`Since apperently im too stupid to use god damn extractors in node, For now manually extract your shit over your server.`)
//everything except extracting works so... 
  // Extract the release asset if it is an FUCKING BITCH GOD FUCKING DAMMIT
//  const fileTypeT = fileName.split("."); 
//  if (fileTypeT[1] === "zip" || fileTypeT[1] === "rar" || fileTypeT[1] === "7z") {
//    console.log('Extracting update...');
//    // myStream is a Readable stream
//    const sevzpath = sevenBin
//    const myStream = Seven.extract(`./${fileName}`, './', {
//      $progress: true,
//      $bin: sevzpath
//    })
//
//
//    myStream.on('progress', function (progress) {
//      console.log("iwant to fucking shoot myself.")
//    })
//
//    myStream.on('end', function () {
//      // end of the operation, get the number of folders involved in the operation
//      console.log(`Extracted update to ./`);
//      startServer();
//    })
//  }
}