/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const functions = require('firebase-functions');
const mkdirp = require('mkdirp-promise');
const spawn = require('child-process-promise').spawn;
const path = require('path');
const os = require('os');
const fs = require('fs');

// File extension for the created JPEG files.
const JPEG_EXTENSION = '.jpg';

/**
 * When an image is uploaded in the Storage bucket it is converted to JPEG automatically using
 * ImageMagick.
 */
exports.imageToJPG = functions.storage.object().onFinalize(async (object) => {
  const filePath = object.name;
  const baseFileName = path.basename(filePath, path.extname(filePath));
  const fileDir = path.dirname(filePath);
  const JPEGFilePath = path.normalize(path.format({dir: fileDir, name: baseFileName, ext: JPEG_EXTENSION}));
  const tempLocalFile = path.join(os.tmpdir(), filePath);
  const tempLocalDir = path.dirname(tempLocalFile);
  const tempLocalJPEGFile = path.join(os.tmpdir(), JPEGFilePath);

  // Exit if this is triggered on a file that is not an image.
  if (!object.contentType.startsWith('image/')) {
    console.log('This is not an image.');
    return null;
  }

  // Exit if the image is already a JPEG.
  if (object.contentType.startsWith('image/jpeg')) {
    console.log('Already a JPEG.');
    return null;
  }

  const bucket = admin.storage().bucket(object.bucket);
  // Create the temp directory where the storage file will be downloaded.
  await mkdirp(tempLocalDir);
  // Download file from bucket.
  await bucket.file(filePath).download({destination: tempLocalFile});
  console.log('The file has been downloaded to', tempLocalFile);
  // Convert the image to JPEG using ImageMagick.
  await spawn('convert', [tempLocalFile, tempLocalJPEGFile]);
  console.log('JPEG image created at', tempLocalJPEGFile);
  // Uploading the JPEG image.
  await bucket.upload(tempLocalJPEGFile, {destination: JPEGFilePath});
  console.log('JPEG image uploaded to Storage at', JPEGFilePath);
  // Once the image has been converted delete the local files to free up disk space.
  fs.unlinkSync(tempLocalJPEGFile);
  fs.unlinkSync(tempLocalFile);
  return null;
});

// Moments library to format dates.
const moment = require('moment');
// CORS Express middleware to enable CORS Requests.
const cors = require('cors')({
  origin: true,
});
// [END additionalimports]

// [START all]
/**
 * Returns the server's date. You must provide a `format` URL query parameter or `format` vaue in
 * the request body with which we'll try to format the date.
 *
 * Format must follow the Node moment library. See: http://momentjs.com/
 *
 * Example format: "MMMM Do YYYY, h:mm:ss a".
 * Example request using URL query parameters:
 *   https://us-central1-<project-id>.cloudfunctions.net/date?format=MMMM%20Do%20YYYY%2C%20h%3Amm%3Ass%20a
 * Example request using request body with cURL:
 *   curl -H 'Content-Type: application/json' /
 *        -d '{"format": "MMMM Do YYYY, h:mm:ss a"}' /
 *        https://us-central1-<project-id>.cloudfunctions.net/date
 *
 * This endpoint supports CORS.
 */
// [START trigger]
exports.date = functions.https.onRequest((req, res) => {
  // [END trigger]
  // [START sendError]
  // Forbidding PUT requests.
  if (req.method === 'PUT') {
    return res.status(403).send('Forbidden!');
  }
  // [END sendError]

  // [START usingMiddleware]
  // Enable CORS using the `cors` express middleware.
  return cors(req, res, () => {
    // [END usingMiddleware]
    // Reading date format from URL query parameter.
    // [START readQueryParam]
    let format = req.query.format;
    // [END readQueryParam]
    // Reading date format from request body query parameter
    if (!format) {
      // [START readBodyParam]
      format = req.body.format;
      // [END readBodyParam]
    }
    // [START sendResponse]
    const formattedDate = moment().format(format);
    console.log('Sending Formatted date:', formattedDate);
    res.status(200).send(formattedDate);
    // [END sendResponse]
  });
});
// [END all]
