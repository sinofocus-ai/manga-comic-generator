const canvas = document.getElementById('comicCanvas');
const ctx = canvas.getContext('2d');

const imageUpload = document.getElementById('imageUpload');
const brightnessInput = document.getElementById('brightness');
const contrastInput = document.getElementById('contrast');
const zoomInput = document.getElementById('zoom');
const rotationInput = document.getElementById('rotation');
const renderBtn = document.getElementById('renderBtn');
const downloadBtn = document.getElementById('downloadBtn');

const textInputs = [
  document.getElementById('text1'),
  document.getElementById('text2'),
  document.getElementById('text3'),
  document.getElementById('text4'),
];

const state = {
  sourceImage: null,
  hasImage: false,
};

const paperWarmColor = '#edf1f5';

function makePaperTexture() {
  const offscreen = document.createElement('canvas');
  offscreen.width = 1200;
  offscreen.height = 1600;
  const offCtx = offscreen.getContext('2d');

  offCtx.fillStyle = paperWarmColor;
  offCtx.fillRect(0, 0, offscreen.width, offscreen.height);

  for (let i = 0; i < 1200; i++) {
    const x = Math.random() * offscreen.width;
    const y = Math.random() * offscreen.height;
    const alpha = Math.random() * 0.06;
    offCtx.fillStyle = `rgba(0,0,0,${alpha})`;
    offCtx.fillRect(x, y, 2, 2);
  }

  return offscreen;
}

function drawHandwrittenText(text, x, y, maxWidth) {
  if (!text) return;

  ctx.save();
  ctx.font = 'normal 30px "Segoe Print", "Bradley Hand", cursive';
  ctx.fillStyle = '#121212';
  ctx.textBaseline = 'top';

  const lines = wrapTextToWidth(text, maxWidth, ctx);
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * 36);
  });

  ctx.restore();
}

function wrapTextToWidth(text, maxWidth, context) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = words[0] || '';

  for (let i = 1; i < words.length; i++) {
    const test = `${current} ${words[i]}`;
    if (context.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      lines.push(current);
      current = words[i];
    }
  }

  if (current) lines.push(current);
  return lines;
}

function drawPanelOutline(x, y, w, h) {
  ctx.save();
  ctx.strokeStyle = '#1f1f1f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(x + 4, y + 4, w - 8, h - 8);
  ctx.stroke();

  ctx.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) {
    const offset = i * 4;
    ctx.beginPath();
    ctx.moveTo(x + 8 + offset, y + 8 + offset);
    ctx.lineTo(x + w - 10 - offset, y + h - 10 - offset);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlaceholderPanel(x, y, w, h) {
  ctx.save();
  ctx.fillStyle = '#eef3f8';
  ctx.fillRect(x + 10, y + 10, w - 20, h - 20);
  ctx.strokeStyle = '#b5bec8';
  ctx.setLineDash([6, 9]);
  ctx.strokeRect(x + 20, y + 20, w - 40, h - 40);
  ctx.setLineDash([]);
  ctx.fillStyle = '#7a8696';
  ctx.font = '28px "Segoe UI", sans-serif';
  ctx.fillText('上傳手繪稿', x + w * 0.35, y + h * 0.55);
  ctx.restore();
}

function drawImagePanel(image, x, y, w, h, rotation, zoom, brightness, contrast) {
  const panelX = x + 18;
  const panelY = y + 18;
  const panelW = w - 36;
  const panelH = h - 36;

  ctx.save();
  ctx.beginPath();
  ctx.rect(panelX, panelY, panelW, panelH);
  ctx.clip();

  const scale = Math.max(panelW / image.width, panelH / image.height) * (zoom / 100);
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  const drawX = panelX + (panelW - drawW) / 2;
  const drawY = panelY + (panelH - drawH) / 2;

  ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
  ctx.translate(panelX + panelW / 2, panelY + panelH / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-(panelX + panelW / 2), -(panelY + panelH / 2));
  ctx.drawImage(image, drawX, drawY, drawW, drawH);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1.4;
  ctx.strokeRect(panelX, panelY, panelW, panelH);
  ctx.restore();
}

function drawComic() {
  const width = canvas.width;
  const height = canvas.height;
  const margin = 60;
  const gap = 28;
  const panelW = (width - margin * 2 - gap) / 2;
  const panelH = (height - margin * 2 - gap) / 2;

  const paperTexture = makePaperTexture();
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(paperTexture, 0, 0, width, height);

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(0, 0, width, height);

  const rows = [
    { x: margin, y: margin },
    { x: margin + panelW + gap, y: margin },
    { x: margin, y: margin + panelH + gap },
    { x: margin + panelW + gap, y: margin + panelH + gap },
  ];

  const brightness = Number(brightnessInput.value);
  const contrast = Number(contrastInput.value);
  const zoom = Number(zoomInput.value);
  const rotation = Number(rotationInput.value);

  rows.forEach((panel, idx) => {
    drawPanelOutline(panel.x, panel.y, panelW, panelH);

    if (state.hasImage) {
      drawImagePanel(state.sourceImage, panel.x, panel.y, panelW, panelH, rotation, zoom, brightness, contrast);
    } else {
      drawPlaceholderPanel(panel.x, panel.y, panelW, panelH);
    }

    const text = textInputs[idx].value.trim();
    const bubbleWidth = panelW - 42;
    const bubbleX = panel.x + 24;
    const bubbleY = panel.y + panelH - 92;
    drawHandwrittenText(text, bubbleX, bubbleY, bubbleWidth);
  });
}

function loadImageFromFile(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const image = new Image();
    image.onload = function () {
      state.sourceImage = image;
      state.hasImage = true;
      drawComic();
    };
    image.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

imageUpload.addEventListener('change', (event) => {
  const file = event.target.files[0];
  loadImageFromFile(file);
});

[brightnessInput, contrastInput, zoomInput, rotationInput].forEach((input) => {
  input.addEventListener('input', drawComic);
});

textInputs.forEach((input) => {
  input.addEventListener('input', drawComic);
});

renderBtn.addEventListener('click', drawComic);

downloadBtn.addEventListener('click', () => {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '4-panel-manga.jpg';
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/jpeg', 0.92);
});

drawComic();
