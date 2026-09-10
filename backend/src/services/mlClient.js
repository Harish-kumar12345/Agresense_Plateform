const { spawn } = require('child_process');
const path = require('path');
const axios = require('axios');

const FASTAPI_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:5002';
const SCRIPTS_DIR = path.join(__dirname, '../../ml/scripts');

/**
 * Execute a Python CLI inference script by streaming JSON via stdin
 */
function runPythonScript(scriptName, inputData) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(SCRIPTS_DIR, scriptName);
    const py = spawn('python', [scriptPath]);

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    py.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    py.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python script ${scriptName} exited with code ${code}: ${stderr}`));
      }
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Failed to parse Python output from ${scriptName}: ${stdout.trim()}`));
      }
    });

    py.stdin.write(JSON.stringify(inputData));
    py.stdin.end();
  });
}

/**
 * Predict crop yield using the trained LightGBM model
 * Tries FastAPI service first; falls back to CLI subprocess runner
 */
async function predictCropYield(payload) {
  try {
    const res = await axios.post(`${FASTAPI_URL}/predict-yield`, payload, { timeout: 3000 });
    if (res.data && res.data.success) {
      return res.data;
    }
  } catch (e) {
    // Microservice not running or timed out; execute CLI
  }
  return await runPythonScript('predict_yield_cli.py', payload);
}

/**
 * Recommend top crops using the trained RandomForest model
 * Tries FastAPI service first; falls back to CLI subprocess runner
 */
async function recommendCrop(payload) {
  try {
    const res = await axios.post(`${FASTAPI_URL}/recommend-crop`, payload, { timeout: 3000 });
    if (res.data && res.data.success) {
      return res.data;
    }
  } catch (e) {
    // Microservice not running or timed out; execute CLI
  }
  return await runPythonScript('predict_crop_cli.py', payload);
}

/**
 * Identify plant disease using the local MobileNetV2 ONNX model
 * Tries FastAPI service first; falls back to CLI subprocess runner
 */
async function predictDiseaseLocal(imageBufferOrBase64) {
  let image_base64 = '';
  if (Buffer.isBuffer(imageBufferOrBase64)) {
    image_base64 = imageBufferOrBase64.toString('base64');
  } else if (typeof imageBufferOrBase64 === 'string') {
    image_base64 = imageBufferOrBase64;
  }

  const payload = { image_base64 };

  try {
    const res = await axios.post(`${FASTAPI_URL}/detect-disease`, payload, { timeout: 4000 });
    if (res.data && res.data.success) {
      return res.data;
    }
  } catch (e) {
    // Microservice not running or timed out; execute CLI
  }

  return await runPythonScript('predict_disease_cli.py', payload);
}

module.exports = {
  predictCropYield,
  recommendCrop,
  predictDiseaseLocal
};
