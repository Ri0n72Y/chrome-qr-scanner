import decodeQR from "qr/decode.js";

const MAX_IMAGE_SIDE = 4096;
const STATIC_SCAN_TIME_LIMIT_MS = 500;

const status = document.querySelector(".status");
const statusText = document.querySelector("#status-text");
const result = document.querySelector("#result");
const resultText = document.querySelector("#result-text");
const copyButton = document.querySelector("#copy");
const openLink = document.querySelector("#open");
const rescanButton = document.querySelector("#rescan");

let currentValue = "";
let scanning = false;

function setStatus(state, message) {
  status.dataset.state = state;
  statusText.textContent = message;
}

function setResult(value) {
  currentValue = value;
  resultText.textContent = value;
  result.hidden = false;

  const url = toSafeHttpUrl(value);
  if (url) {
    openLink.href = url;
    openLink.hidden = false;
  } else {
    openLink.removeAttribute("href");
    openLink.hidden = true;
  }
}

function clearResult() {
  currentValue = "";
  resultText.textContent = "";
  result.hidden = true;
  openLink.removeAttribute("href");
  openLink.hidden = true;
}

function toSafeHttpUrl(value) {
  try {
    const url = new URL(value.trim());
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.href;
    }
  } catch {
    // Non-URL QR payloads are still valid scan results.
  }
  return null;
}

function captureVisibleTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(undefined, { format: "png" }, (dataUrl) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      if (!dataUrl) {
        reject(new Error("Chrome did not return a tab capture."));
        return;
      }
      resolve(dataUrl);
    });
  });
}

function imageDataFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const naturalWidth = image.naturalWidth;
      const naturalHeight = image.naturalHeight;
      const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(naturalWidth, naturalHeight));
      const width = Math.max(1, Math.round(naturalWidth * scale));
      const height = Math.max(1, Math.round(naturalHeight * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        reject(new Error("Canvas 2D is unavailable."));
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      resolve(context.getImageData(0, 0, width, height));
    };

    image.onerror = () => reject(new Error("Could not decode the captured image."));
    image.src = dataUrl;
  });
}

async function scan() {
  if (scanning) return;

  scanning = true;
  rescanButton.disabled = true;
  clearResult();
  setStatus("scanning", "Scanning visible area…");

  try {
    const capture = await captureVisibleTab();
    const imageData = await imageDataFromDataUrl(capture);
    const decoded = decodeQR(imageData, {
      effort: Infinity,
      timeLimit: STATIC_SCAN_TIME_LIMIT_MS
    });

    setResult(decoded);
    setStatus("success", "QR code found");
  } catch (error) {
    console.debug("QR scan failed:", error);
    const message = String(error?.message || error);
    const captureFailed = /capture|permission|cannot access|chrome:\/\//i.test(message);
    setStatus(
      "error",
      captureFailed
        ? "This page cannot be captured. Try a regular webpage or PDF."
        : "No QR code found in the visible area."
    );
  } finally {
    scanning = false;
    rescanButton.disabled = false;
  }
}

async function copyCurrentValue() {
  if (!currentValue) return;

  try {
    await navigator.clipboard.writeText(currentValue);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = currentValue;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  const previous = copyButton.textContent;
  copyButton.textContent = "Copied";
  window.setTimeout(() => {
    copyButton.textContent = previous;
  }, 1000);
}

rescanButton.addEventListener("click", scan);
copyButton.addEventListener("click", copyCurrentValue);

scan();
