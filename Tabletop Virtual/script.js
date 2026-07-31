// ===== ELEMENTOS =====
const canvas = document.getElementById("canvas");
const mapImage = document.getElementById("mapImage");
const tokensLayer = document.getElementById("tokensLayer");
const canvasContainer = document.getElementById("canvasContainer");

const mapUpload = document.getElementById("mapUpload");
const tokenUpload = document.getElementById("tokenUpload");
const inventory = document.getElementById("inventory");

const zoomInBtn = document.getElementById("zoomIn");
const zoomOutBtn = document.getElementById("zoomOut");
const resetZoomBtn = document.getElementById("resetZoom");

const newPageBtn = document.getElementById("newPage");
const pagesList = document.getElementById("pagesList");

const deleteBtn = document.getElementById("deleteToken");
const duplicateBtn = document.getElementById("duplicateToken");
const toggleGridBtn = document.getElementById("toggleGrid");

const removeMapBtn = document.getElementById("removeMap");

const gridOverlay = document.getElementById("gridOverlay");

const tokenTemplate = document.getElementById("tokenTemplate");
const inventoryTemplate = document.getElementById("inventoryItemTemplate");

// ===== SIDEBAR SCROLL =====
document.querySelector(".sidebar").style.overflowY = "auto";

// ===== ESTADO =====
let scale = 1;
let offsetX = 0;
let offsetY = 0;

let isPanning = false;
let startX, startY;

let selectedToken = null;

let gridEnabled = true;
const GRID_SIZE = 50;

let pages = [];
let currentPage = 0;

// ===== LOCAL STORAGE =====
function saveToLocal() {
  localStorage.setItem("tabletop_save", JSON.stringify({
    pages,
    currentPage
  }));
}

function loadFromLocal() {
  const data = localStorage.getItem("tabletop_save");
  if (!data) return;

  const parsed = JSON.parse(data);
  pages = parsed.pages || [];
  currentPage = parsed.currentPage || 0;
}

// ===== UTIL =====
function updateTransform() {
  canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}

function snap(value) {
  if (!gridEnabled) return value;
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

// ===== REMOVER MAPA (BOTÃO) =====
removeMapBtn.onclick = () => {
  if (confirm("Remover mapa atual?")) {
    mapImage.src = "";
    saveState();
  }
};

// ===== DESELECIONAR =====
canvasContainer.addEventListener("click", (e) => {
  if (!e.target.closest(".token")) {
    document.querySelectorAll(".token").forEach(t => t.classList.remove("selected"));
    selectedToken = null;
  }
});

// ===== ZOOM =====
canvasContainer.addEventListener("wheel", (e) => {
  if (e.target.closest(".token")) return;

  e.preventDefault();

  const delta = e.deltaY < 0 ? 1 : -1;
  const newScale = Math.min(Math.max(0.2, scale + delta * 0.1), 5);

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  offsetX -= (mouseX / scale) * (newScale - scale);
  offsetY -= (mouseY / scale) * (newScale - scale);

  scale = newScale;
  updateTransform();
});

// ===== PAN =====
canvasContainer.addEventListener("mousedown", (e) => {
  if (e.target.closest(".token")) return;

  isPanning = true;
  startX = e.clientX - offsetX;
  startY = e.clientY - offsetY;
});

window.addEventListener("mousemove", (e) => {
  if (!isPanning) return;

  offsetX = e.clientX - startX;
  offsetY = e.clientY - startY;
  updateTransform();
});

window.addEventListener("mouseup", () => isPanning = false);

// ===== MAPA =====
mapUpload.onchange = (e) => {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = () => {
    mapImage.src = reader.result;
    saveState();
  };

  if (file) reader.readAsDataURL(file);
};

// ===== INVENTÁRIO =====
tokenUpload.onchange = (e) => {
  [...e.target.files].forEach(file => {
    const reader = new FileReader();

    reader.onload = () => {
      const clone = inventoryTemplate.content.cloneNode(true);
      const item = clone.querySelector(".inventory-item");
      const img = clone.querySelector("img");

      img.src = reader.result;

      item.onclick = () => createToken(img.src, 100, 100);

      item.addEventListener("dragstart", (ev) => {
        ev.dataTransfer.setData("src", img.src);
      });

      inventory.appendChild(clone);
    };

    reader.readAsDataURL(file);
  });
};

// ===== DROP =====
canvasContainer.addEventListener("dragover", e => e.preventDefault());

canvasContainer.addEventListener("drop", (e) => {
  e.preventDefault();

  const src = e.dataTransfer.getData("src");
  if (!src) return;

  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / scale;
  const y = (e.clientY - rect.top) / scale;

  createToken(src, snap(x), snap(y));
});

// ===== TOKEN =====
function createToken(src, x, y) {
  const clone = tokenTemplate.content.cloneNode(true);
  const token = clone.querySelector(".token");

  const img = token.querySelector("img");
  img.src = src;

  token.style.left = x + "px";
  token.style.top = y + "px";
  token.dataset.rotation = 0;

  tokensLayer.appendChild(token);

  makeInteractive(token);
  saveState();
}

// ===== INTERAÇÃO TOKEN =====
function makeInteractive(token) {

  let dragging = false;
  let offsetXToken, offsetYToken;

  token.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    dragging = true;

    selectToken(token);

    offsetXToken = e.offsetX;
    offsetYToken = e.offsetY;
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;

    const rect = canvas.getBoundingClientRect();

    let x = (e.clientX - rect.left) / scale;
    let y = (e.clientY - rect.top) / scale;

    token.style.left = snap(x - offsetXToken) + "px";
    token.style.top = snap(y - offsetYToken) + "px";
  });

  window.addEventListener("mouseup", () => {
    if (dragging) {
      dragging = false;
      saveState();
    }
  });

  token.addEventListener("click", (e) => {
    e.stopPropagation();
    selectToken(token);
  });

  token.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    token.remove();
    selectedToken = null;
    saveState();
  });

  token.addEventListener("wheel", (e) => {
    e.preventDefault();

    let size = token.offsetWidth;
    size += e.deltaY < 0 ? 10 : -10;
    size = Math.max(20, Math.min(500, size));

    token.style.width = size + "px";
    token.style.height = size + "px";

    saveState();
  });

  token.querySelector(".rotate-left").onclick = (e) => {
    e.stopPropagation();
    rotate(token, -15);
  };

  token.querySelector(".rotate-right").onclick = (e) => {
    e.stopPropagation();
    rotate(token, 15);
  };
}

// ===== SELECT =====
function selectToken(token) {
  document.querySelectorAll(".token").forEach(t => t.classList.remove("selected"));
  selectedToken = token;
  token.classList.add("selected");
}

// ===== ROTATE =====
function rotate(token, deg) {
  let current = parseInt(token.dataset.rotation || 0);
  current += deg;

  token.dataset.rotation = current;
  token.style.transform = `rotate(${current}deg)`;

  saveState();
}

// ===== BOTÕES =====
deleteBtn.onclick = () => {
  if (selectedToken) {
    selectedToken.remove();
    selectedToken = null;
    saveState();
  }
};

duplicateBtn.onclick = () => {
  if (!selectedToken) return;

  const img = selectedToken.querySelector("img").src;
  const x = parseFloat(selectedToken.style.left) + 20;
  const y = parseFloat(selectedToken.style.top) + 20;

  createToken(img, x, y);
};

toggleGridBtn.onclick = () => {
  gridEnabled = !gridEnabled;
  gridOverlay.style.display = gridEnabled ? "block" : "none";
  saveToLocal();
};

// ===== TECLADO =====
window.addEventListener("keydown", (e) => {
  if ((e.key === "Delete" || e.key === "Backspace") && selectedToken) {
    selectedToken.remove();
    selectedToken = null;
    saveState();
  }

  if (e.ctrlKey && e.key.toLowerCase() === "d") {
    duplicateBtn.onclick();
  }
});

// ===== PÁGINAS =====
function createPage() {
  pages.push({ map: "", tokens: [] });
  currentPage = pages.length - 1;
  renderPages();
  loadPage();
  saveToLocal();
}

newPageBtn.onclick = createPage;

function renderPages() {
  pagesList.innerHTML = "";

  pages.forEach((_, i) => {
    const div = document.createElement("div");
    div.className = "page-item";
    div.innerText = "Cena " + (i + 1);

    if (i === currentPage) div.classList.add("active");

    div.onclick = () => {
      saveState();
      currentPage = i;
      loadPage();
      renderPages();
      saveToLocal();
    };

    pagesList.appendChild(div);
  });
}

// ===== SAVE =====
function saveState() {
  if (!pages[currentPage]) return;

  pages[currentPage].map = mapImage.src;

  const tokens = [];

  document.querySelectorAll(".token").forEach(token => {
    tokens.push({
      src: token.querySelector("img").src,
      x: token.style.left,
      y: token.style.top,
      size: token.style.width,
      rotation: token.dataset.rotation || 0
    });
  });

  pages[currentPage].tokens = tokens;

  saveToLocal();
}

// ===== LOAD =====
function loadPage() {
  tokensLayer.innerHTML = "";
  const page = pages[currentPage];
  if (!page) return;

  mapImage.src = page.map;

  page.tokens.forEach(t => {
    createToken(t.src, parseFloat(t.x), parseFloat(t.y));

    const token = tokensLayer.lastChild;

    token.style.width = t.size;
    token.style.height = t.size;

    token.dataset.rotation = t.rotation;
    token.style.transform = `rotate(${t.rotation}deg)`;
  });
}

// ===== INIT =====
loadFromLocal();

if (pages.length === 0) {
  createPage();
} else {
  renderPages();
  loadPage();
}

updateTransform();