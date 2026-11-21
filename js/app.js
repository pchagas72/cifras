const STORAGE_KEY = "lista-movies";
const VIEW_NAMES = ["lista", "rapida", "adicionar"];

const views = {
  lista: document.getElementById("view-lista"),
  rapida: document.getElementById("view-rapida"),
  adicionar: document.getElementById("view-adicionar"),
};

const movieList = document.getElementById("movie-list");
const emptyState = document.getElementById("empty-state");
const quickLists = document.getElementById("quick-lists");
const quickEmpty = document.getElementById("quick-empty");
const form = document.getElementById("movie-form");
const formStatus = document.getElementById("form-status");

function normalizeMovie(raw) {
  return {
    id: raw.id ?? crypto.randomUUID(),
    title: String(raw.title ?? "").trim(),
    titleUrl: String(raw.titleUrl ?? "").trim(),
    year: Number(raw.year),
    director: String(raw.director ?? "").trim(),
    directorUrl: String(raw.directorUrl ?? "").trim(),
    subtitles: String(raw.subtitles ?? "").trim(),
    subtitlesUrl: String(raw.subtitlesUrl ?? "").trim(),
    recommendedBy: String(raw.recommendedBy ?? "").trim(),
    watched: Boolean(raw.watched),
  };
}

function loadLocalMovies() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeMovie) : [];
  } catch {
    return [];
  }
}

function saveLocalMovies(movies) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
}

async function loadSeedMovies() {
  try {
    const response = await fetch("data/movies.json", { cache: "no-store" });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data.map(normalizeMovie) : [];
  } catch {
    return [];
  }
}

function mergeMovies(seed, local) {
  const byId = new Map();
  for (const movie of [...seed, ...local]) {
    if (!movie.title) continue;
    byId.set(movie.id, movie);
  }
  return [...byId.values()].sort((a, b) => {
    if (a.watched !== b.watched) return a.watched ? 1 : -1;
    if (b.year !== a.year) return b.year - a.year;
    return a.title.localeCompare(b.title, "pt-BR");
  });
}

function linkOrText(text, url) {
  const safeText = escapeHtml(text);
  if (!url) return safeText;
  return `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${safeText}</a>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function parseQuickMarkdown(markdown) {
  const sections = { "Já vi": [], "Quero ver": [] };
  let current = null;

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      current = heading[1].trim();
      if (!sections[current]) sections[current] = [];
      continue;
    }

    const item = line.match(/^[-*]\s+(.+)$/);
    if (item && current) {
      sections[current].push(item[1].trim());
    }
  }

  return sections;
}

async function loadQuickList() {
  const response = await fetch("lista-rapida.md", { cache: "no-store" });
  if (!response.ok) throw new Error("Falha ao carregar lista-rapida.md");
  return parseQuickMarkdown(await response.text());
}

function renderQuickList(sections) {
  quickLists.innerHTML = "";
  const entries = Object.entries(sections).filter(([, titles]) => titles.length > 0);

  if (entries.length === 0) {
    quickEmpty.hidden = false;
    return;
  }

  quickEmpty.hidden = true;

  for (const [heading, titles] of entries) {
    const block = document.createElement("section");
    block.className = "quick-section";
    block.innerHTML = `<h2>${escapeHtml(heading)}</h2>`;

    const list = document.createElement("ul");
    list.className = "quick-list";

    titles.forEach((title, index) => {
      const li = document.createElement("li");
      li.style.animationDelay = `${Math.min(index, 12) * 35}ms`;
      li.textContent = title;
      list.appendChild(li);
    });

    block.appendChild(list);
    quickLists.appendChild(block);
  }
}

function renderMovies(movies) {
  movieList.innerHTML = "";

  if (movies.length === 0) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  movies.forEach((movie, index) => {
    const item = document.createElement("article");
    item.className = `movie-item${movie.watched ? " is-watched" : ""}`;
    item.setAttribute("role", "listitem");
    item.style.animationDelay = `${Math.min(index, 12) * 40}ms`;
    item.innerHTML = `
      <div class="col-watched">
        <span class="label">Visto</span>
        <label class="watched-toggle">
          <input type="checkbox" data-watched-id="${escapeAttr(movie.id)}" ${movie.watched ? "checked" : ""}>
          <span class="watched-box" aria-hidden="true"></span>
          <span class="visually-hidden">Visto</span>
        </label>
      </div>
      <div class="col-title">
        <span class="label">Filme</span>
        ${linkOrText(movie.title, movie.titleUrl)}
      </div>
      <div class="col-year">
        <span class="label">Ano</span>
        ${escapeHtml(movie.year)}
      </div>
      <div class="col-director">
        <span class="label">Diretor</span>
        ${linkOrText(movie.director, movie.directorUrl)}
      </div>
      <div class="col-subs">
        <span class="label">Legendas</span>
        ${linkOrText(movie.subtitles, movie.subtitlesUrl)}
      </div>
      <div class="col-by">
        <span class="label">Recomendou</span>
        ${escapeHtml(movie.recommendedBy)}
      </div>
    `;
    movieList.appendChild(item);
  });
}

function setActiveView(name) {
  const target = VIEW_NAMES.includes(name) ? name : "lista";

  for (const [key, el] of Object.entries(views)) {
    const active = key === target;
    el.classList.toggle("is-active", active);
    el.hidden = !active;
  }

  document.querySelectorAll("[data-nav]").forEach((el) => {
    if (el.classList.contains("brand")) return;
    el.classList.toggle("is-active", el.dataset.nav === target);
  });

  if (location.hash.replace("#", "") !== target) {
    history.replaceState(null, "", `#${target}`);
  }
}

function movieFromForm(formData) {
  return normalizeMovie({
    id: crypto.randomUUID(),
    title: formData.get("title"),
    titleUrl: formData.get("titleUrl"),
    year: formData.get("year"),
    director: formData.get("director"),
    directorUrl: formData.get("directorUrl"),
    subtitles: formData.get("subtitles"),
    subtitlesUrl: formData.get("subtitlesUrl"),
    recommendedBy: formData.get("recommendedBy"),
    watched: formData.get("watched") === "on",
  });
}

function validateMovie(movie) {
  if (!movie.title) return "Informe o nome do filme.";
  if (!Number.isFinite(movie.year) || movie.year < 1888) return "Informe um ano válido.";
  if (!movie.director) return "Informe o diretor.";
  if (!movie.subtitles) return "Informe as legendas.";
  if (!movie.recommendedBy) return "Informe quem recomendou.";
  return null;
}

async function getMergedMovies() {
  const [seed, local] = await Promise.all([loadSeedMovies(), Promise.resolve(loadLocalMovies())]);
  return mergeMovies(seed, local);
}

async function refreshMovies() {
  renderMovies(await getMergedMovies());
}

async function refreshQuick() {
  try {
    renderQuickList(await loadQuickList());
  } catch {
    quickLists.innerHTML = "";
    quickEmpty.hidden = false;
  }
}

async function setWatched(id, watched) {
  const seed = await loadSeedMovies();
  const seedIds = new Set(seed.map((movie) => movie.id));
  let local = loadLocalMovies();

  if (seedIds.has(id)) {
    const existing = local.find((movie) => movie.id === id);
    const base = seed.find((movie) => movie.id === id);
    if (existing) {
      existing.watched = watched;
    } else {
      local.push({ ...base, watched });
    }
  } else {
    local = local.map((movie) => (movie.id === id ? { ...movie, watched } : movie));
  }

  saveLocalMovies(local);
  await refreshMovies();
}

document.querySelectorAll("[data-nav]").forEach((el) => {
  el.addEventListener("click", (event) => {
    event.preventDefault();
    setActiveView(el.dataset.nav);
  });
});

movieList.addEventListener("change", async (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !input.dataset.watchedId) return;
  await setWatched(input.dataset.watchedId, input.checked);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formStatus.textContent = "";
  formStatus.classList.remove("is-error");

  const movie = movieFromForm(new FormData(form));
  const error = validateMovie(movie);
  if (error) {
    formStatus.textContent = error;
    formStatus.classList.add("is-error");
    return;
  }

  const local = loadLocalMovies();
  local.push(movie);
  saveLocalMovies(local);
  form.reset();
  formStatus.textContent = "Filme adicionado à lista.";
  await refreshMovies();
  setActiveView("lista");
});

window.addEventListener("hashchange", () => {
  setActiveView(location.hash.replace("#", "") || "lista");
});

setActiveView(location.hash.replace("#", "") || "lista");
refreshMovies();
refreshQuick();
