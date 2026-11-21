const STORAGE_KEY = "nossa-lista-movies";

const views = {
  lista: document.getElementById("view-lista"),
  adicionar: document.getElementById("view-adicionar"),
};

const movieList = document.getElementById("movie-list");
const emptyState = document.getElementById("empty-state");
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

function renderMovies(movies) {
  movieList.innerHTML = "";

  if (movies.length === 0) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  movies.forEach((movie, index) => {
    const item = document.createElement("article");
    item.className = "movie-item";
    item.setAttribute("role", "listitem");
    item.style.animationDelay = `${Math.min(index, 12) * 40}ms`;
    item.innerHTML = `
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
  const target = name === "adicionar" ? "adicionar" : "lista";

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

async function refresh() {
  const [seed, local] = await Promise.all([loadSeedMovies(), Promise.resolve(loadLocalMovies())]);
  renderMovies(mergeMovies(seed, local));
}

document.querySelectorAll("[data-nav]").forEach((el) => {
  el.addEventListener("click", (event) => {
    event.preventDefault();
    setActiveView(el.dataset.nav);
  });
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
  await refresh();
  setActiveView("lista");
});

window.addEventListener("hashchange", () => {
  setActiveView(location.hash.replace("#", "") || "lista");
});

setActiveView(location.hash.replace("#", "") || "lista");
refresh();
