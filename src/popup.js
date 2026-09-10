import { decodeQRBatch } from "qr/decode.js";

const MAX_IMAGE_SIDE = 4096;
const STATIC_SCAN_TIME_LIMIT_MS = 500;

const status = document.querySelector(".status");
const statusText = document.querySelector("#status-text");
const previewSection = document.querySelector("#preview-section");
const previewCanvas = document.querySelector("#preview");
const result = document.querySelector("#result");
const resultList = document.querySelector("#result-list");
const resultText = document.querySelector("#result-text");
const copyButton = document.querySelector("#copy");
const openLink = document.querySelector("#open");
const rescanButton = document.querySelector("#rescan");

let currentImage = null;
let currentResults = [];
let currentValue = "";
let scanning = false;

function setStatus(state, message) {
  status.dataset.state = state;
  statusText.textContent = message;
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

function drawPreview(selected = null) {
  if (!currentImage) return;

  const context = previewCanvas.getContext("2d");
  if (!context) return;

  context.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  context.drawImage(currentImage, 0, 0, previewCanvas.width, previewCanvas.height);

  if (!selected) return;

  const points = selected.outline;
  context.save();
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    context.lineTo(points[i].x, points[i].y);
  }
  context.closePath();
  context.fillStyle = "rgba(37, 99, 235, 0.18)";
  context.strokeStyle = "#2563eb";
  context.lineWidth = Math.max(3, Math.min(previewCanvas.width, previewCanvas.height) / 160);
  context.fill();
  context.stroke();
  context.restore();
}

function selectResult(index) {
  const selected = currentResults[index];
  if (!selected) return;

  currentValue = selected.value;
  resultText.textContent = selected.value;

  for (const [itemIndex, button] of [...resultList.children].entries()) {
    button.setAttribute("aria-selected", String(itemIndex === index));
  }

  const url = toSafeHttpUrl(selected.value);
  if (url) {
    openLink.href = url;
    openLink.hidden = false;
  } else {
    openLink.removeAttribute("href");
    openLink.hidden = true;
  }

  drawPreview(selected);
}

function setResults(results) {
  currentResults = results;
  resultList.replaceChildren();

  results.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "result-item";
    button.textContent = `${index + 1}. ${item.value.replace(/\s+/g, " ")}`;
    button.addEventListener("click", () => selectResult(index));
    resultList.appendChild(button);
  });

  result.hidden = false;
  selectResult(0);
}

function clearScan() {
  currentImage = null;
  currentResults = [];
  currentValue = "";
  previewSection.hidden = true;
  result.hidden = true;
  resultList.replaceChildren();
  resultText.textContent = "";
  openLink.removeAttribute("href");
  openLink.hidden = true;
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

      previewCanvas.width = width;
      previewCanvas.height = height;

      const context = previewCanvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        reject(new Error("Canvas 2D is unavailable."));
        return;
      }

      currentImage = image;
      context.drawImage(image, 0, 0, width, height);
      previewSection.hidden = false;
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
  clearScan();
  setStatus("scanning", "Scanning visible area…");

  try {
    const capture = await captureVisibleTab();
    const imageData = await imageDataFromDataUrl(capture);
    const detections = [];

    await decodeQRBatch([imageData], {
      maxSize: { width: imageData.width, height: imageData.height },
      effort: Infinity,
      timeLimit: STATIC_SCAN_TIME_LIMIT_MS,
      pointsOnDetect: (points, decoded) => {
        if (typeof decoded !== "string") return;
        detections.push({
          value: decoded,
          outline: points.outline.map(({ x, y }) => ({ x, y }))
        });
      }
    });

    if (!detections.length) {
      throw new Error("No QR code found.");
    }

    setResults(detections);
    setStatus(
      "success",
      `${detections.length} QR code${detections.length === 1 ? "" : "s"} found`
    );
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
