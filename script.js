const YOUTUBE_API_KEY = "AIzaSyBOxzmSVobfz_jn03b1rvmYoCQwgEhtm70";
const YOUTUBE_HANDLE = "Artealémcast";
const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@Arteal%C3%A9mcast";
const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";

const fallbackEpisodes = [
  {
    title: "Cyberpunch no Arte Além Cast",
    videoId: "rThN1PNs3uw",
    description: "Episódio completo com a banda Cyberpunch.",
    publishedAt: null,
    thumbnail: "https://i.ytimg.com/vi/rThN1PNs3uw/hqdefault.jpg"
  }
];

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date).replace(" de ", " ").replace(" de ", " ");
}

function bestThumbnail(thumbnails = {}, videoId = "") {
  return thumbnails.maxres?.url
    || thumbnails.standard?.url
    || thumbnails.high?.url
    || thumbnails.medium?.url
    || thumbnails.default?.url
    || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "assets/logo-arte-alem-cast.png");
}

function renderEpisodeLoading() {
  const grid = document.querySelector("#episodes-grid");
  if (!grid) return;
  grid.innerHTML = Array.from({ length: 5 }, () => `
    <div class="episode-card episode-loading" aria-hidden="true">
      <div class="episode-thumb loading-block"></div>
      <div class="episode-body">
        <div class="loading-line loading-line-small"></div>
        <div class="loading-line"></div>
        <div class="loading-line loading-line-short"></div>
      </div>
    </div>
  `).join("");
}

function renderEpisodes(episodes) {
  const grid = document.querySelector("#episodes-grid");
  if (!grid) return;

  grid.innerHTML = episodes.map((episode) => {
    const videoUrl = episode.videoId
      ? `https://www.youtube.com/watch?v=${encodeURIComponent(episode.videoId)}`
      : YOUTUBE_CHANNEL_URL;
    const date = formatDate(episode.publishedAt);
    const thumb = episode.thumbnail || bestThumbnail({}, episode.videoId);
    const cleanDescription = episode.description?.trim()
      ? episode.description.trim().replace(/\s+/g, " ").slice(0, 125)
      : "Assista ao episódio completo no canal oficial.";

    return `
      <a class="episode-card" href="${videoUrl}" target="_blank" rel="noopener">
        <div class="episode-thumb">
          <img src="${escapeHtml(thumb)}" alt="Thumbnail de ${escapeHtml(episode.title)}" loading="lazy" />
          <div class="play" aria-hidden="true">▶</div>
        </div>
        <div class="episode-body">
          <div class="episode-meta">
            <span>EPISÓDIO</span>
            ${date ? `<span>•</span><span>${escapeHtml(date)}</span>` : ""}
          </div>
          <h3>${escapeHtml(episode.title)}</h3>
          <p>${escapeHtml(cleanDescription)}${cleanDescription.length >= 125 ? "…" : ""}</p>
        </div>
      </a>`;
  }).join("");
}

async function youtubeRequest(endpoint, params) {
  const search = new URLSearchParams({ ...params, key: YOUTUBE_API_KEY });
  const response = await fetch(`${YOUTUBE_API}/${endpoint}?${search.toString()}`);
  const data = await response.json();

  if (!response.ok) {
    const message = data?.error?.message || "Falha ao consultar o YouTube.";
    throw new Error(message);
  }

  return data;
}

async function resolveChannel() {
  const handles = [YOUTUBE_HANDLE, `@${YOUTUBE_HANDLE}`, "Artealemcast", "@Artealemcast"];

  for (const handle of handles) {
    const data = await youtubeRequest("channels", {
      part: "contentDetails,snippet",
      forHandle: handle
    });

    if (data.items?.length) return data.items[0];
  }

  throw new Error("Canal do Arte Além Cast não encontrado pelo handle informado.");
}

async function loadLatestEpisodes() {
  renderEpisodeLoading();

  try {
    const channel = await resolveChannel();
    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
      throw new Error("Playlist de uploads do canal não encontrada.");
    }

    const data = await youtubeRequest("playlistItems", {
      part: "snippet,contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: "10"
    });

    const episodes = (data.items || [])
      .map((item) => {
        const snippet = item.snippet || {};
        const videoId = item.contentDetails?.videoId || snippet.resourceId?.videoId;
        return {
          title: snippet.title || "Arte Além Cast",
          videoId,
          description: snippet.description || "",
          publishedAt: snippet.publishedAt,
          thumbnail: bestThumbnail(snippet.thumbnails, videoId)
        };
      })
      .filter((episode) => episode.videoId)
      .filter((episode) => !["Private video", "Deleted video"].includes(episode.title))
      .slice(0, 5);

    if (!episodes.length) {
      throw new Error("Nenhum vídeo público encontrado no canal.");
    }

    renderEpisodes(episodes);
  } catch (error) {
    console.error("Arte Além Cast: não foi possível carregar os vídeos automaticamente.", error);
    renderEpisodes(fallbackEpisodes);
  }
}

function setupMenu() {
  const button = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");
  if (!button || !nav) return;

  button.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    button.setAttribute("aria-expanded", String(open));
  });

  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
    nav.classList.remove("open");
    button.setAttribute("aria-expanded", "false");
  }));
}

loadLatestEpisodes();
setupMenu();
document.querySelector("#year").textContent = new Date().getFullYear();
