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

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function bestThumbnail(thumbnails = {}, videoId = "") {
  return (
    thumbnails.maxres?.url ||
    thumbnails.standard?.url ||
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    (videoId
      ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      : "assets/logo-arte-alem-cast.png")
  );
}

function cleanDescription(text = "") {
  const clean = String(text)
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) {
    return "Assista ao episódio completo no canal oficial.";
  }

  return clean.slice(0, 125);
}

function renderEpisodeLoading() {
  const grid = document.querySelector("#episodes-grid");

  if (!grid) return;

  grid.innerHTML = Array.from(
    { length: 5 },
    () => `
      <div class="episode-card episode-loading" aria-hidden="true">
        <div class="episode-thumb loading-block"></div>

        <div class="episode-body">
          <div class="loading-line loading-line-small"></div>
          <div class="loading-line"></div>
          <div class="loading-line loading-line-short"></div>
        </div>
      </div>
    `
  ).join("");
}

function renderEpisodes(episodes) {
  const grid = document.querySelector("#episodes-grid");

  if (!grid) return;

  grid.innerHTML = episodes
    .map((episode) => {
      const videoUrl = episode.videoId
        ? `https://www.youtube.com/watch?v=${encodeURIComponent(
            episode.videoId
          )}`
        : YOUTUBE_CHANNEL_URL;

      const date = formatDate(episode.publishedAt);

      const thumb =
        episode.thumbnail ||
        bestThumbnail({}, episode.videoId);

      const description = cleanDescription(
        episode.description
      );

      return `
        <a
          class="episode-card"
          href="${videoUrl}"
          target="_blank"
          rel="noopener noreferrer"
        >

          <div class="episode-thumb">

            <img
              src="${escapeHtml(thumb)}"
              alt="Thumbnail de ${escapeHtml(episode.title)}"
              loading="lazy"
            />

            <div class="play" aria-hidden="true">
              ▶
            </div>

          </div>

          <div class="episode-body">

            <div class="episode-meta">

              <span>EPISÓDIO</span>

              ${
                date
                  ? `
                    <span>•</span>
                    <span>${escapeHtml(date)}</span>
                  `
                  : ""
              }

            </div>

            <h3>
              ${escapeHtml(episode.title)}
            </h3>

            <p>
              ${escapeHtml(description)}
              ${description.length >= 125 ? "…" : ""}
            </p>

          </div>

        </a>
      `;
    })
    .join("");
}

async function youtubeRequest(endpoint, params) {
  const search = new URLSearchParams({
    ...params,
    key: YOUTUBE_API_KEY
  });

  const url =
    `${YOUTUBE_API}/${endpoint}?${search.toString()}`;

  console.log("YouTube API:", url.replace(YOUTUBE_API_KEY, "API_KEY_OCULTA"));

  const response = await fetch(url);

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `Resposta inválida da API do YouTube. HTTP ${response.status}`
    );
  }

  if (!response.ok) {
    console.error("Erro retornado pelo YouTube:", data);

    const message =
      data?.error?.message ||
      `Falha ao consultar o YouTube. HTTP ${response.status}`;

    throw new Error(message);
  }

  return data;
}

async function resolveChannelByHandle() {
  const possibleHandles = [
    YOUTUBE_HANDLE,
    `@${YOUTUBE_HANDLE}`,
    "Artealemcast",
    "@Artealemcast",
    "Artealémcast",
    "@Artealémcast"
  ];

  for (const handle of possibleHandles) {
    try {
      console.log(
        `Tentando localizar canal pelo handle: ${handle}`
      );

      const data = await youtubeRequest("channels", {
        part: "contentDetails,snippet,id",
        forHandle: handle
      });

      if (data.items?.length) {
        console.log(
          "Canal encontrado:",
          data.items[0]
        );

        return data.items[0];
      }
    } catch (error) {
      console.warn(
        `Falha ao consultar handle ${handle}:`,
        error
      );
    }
  }

  return null;
}

async function resolveChannelBySearch() {
  console.log(
    "Tentando localizar o canal pela busca..."
  );

  const searchData = await youtubeRequest(
    "search",
    {
      part: "snippet",
      type: "channel",
      q: "Arte Além Cast",
      maxResults: "10"
    }
  );

  if (!searchData.items?.length) {
    return null;
  }

  const exactChannel =
    searchData.items.find((item) => {
      const title =
        item.snippet?.title
          ?.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

      return title === "arte alem cast";
    }) || searchData.items[0];

  const channelId =
    exactChannel.id?.channelId;

  if (!channelId) {
    return null;
  }

  const channelData = await youtubeRequest(
    "channels",
    {
      part: "contentDetails,snippet,id",
      id: channelId
    }
  );

  return channelData.items?.[0] || null;
}

async function resolveChannel() {
  let channel =
    await resolveChannelByHandle();

  if (channel) {
    return channel;
  }

  channel =
    await resolveChannelBySearch();

  if (channel) {
    return channel;
  }

  throw new Error(
    "Canal Arte Além Cast não encontrado."
  );
}

async function getLatestVideos(channel) {
  const uploadsPlaylistId =
    channel.contentDetails
      ?.relatedPlaylists
      ?.uploads;

  if (!uploadsPlaylistId) {
    throw new Error(
      "Playlist de uploads do canal não encontrada."
    );
  }

  console.log(
    "Playlist de uploads:",
    uploadsPlaylistId
  );

  const data = await youtubeRequest(
    "playlistItems",
    {
      part: "snippet,contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: "10"
    }
  );

  const episodes = (
    data.items || []
  )
    .map((item) => {
      const snippet =
        item.snippet || {};

      const videoId =
        item.contentDetails?.videoId ||
        snippet.resourceId?.videoId;

      return {
        title:
          snippet.title ||
          "Arte Além Cast",

        videoId,

        description:
          snippet.description || "",

        publishedAt:
          snippet.publishedAt,

        thumbnail:
          bestThumbnail(
            snippet.thumbnails,
            videoId
          )
      };
    })
    .filter(
      (episode) =>
        episode.videoId
    )
    .filter(
      (episode) =>
        ![
          "Private video",
          "Deleted video"
        ].includes(
          episode.title
        )
    )
    .slice(0, 5);

  return episodes;
}

async function loadLatestEpisodes() {
  renderEpisodeLoading();

  try {
    console.log(
      "Iniciando carregamento dos episódios..."
    );

    const channel =
      await resolveChannel();

    console.log(
      "Canal resolvido:",
      channel.snippet?.title,
      channel.id
    );

    const episodes =
      await getLatestVideos(channel);

    if (!episodes.length) {
      throw new Error(
        "Nenhum vídeo público encontrado no canal."
      );
    }

    console.log(
      "Episódios encontrados:",
      episodes
    );

    renderEpisodes(episodes);
  } catch (error) {
    console.error(
      "Arte Além Cast: erro ao carregar episódios.",
      error
    );

    renderEpisodes(
      fallbackEpisodes
    );
  }
}

function setupMenu() {
  const button =
    document.querySelector(
      ".menu-toggle"
    );

  const nav =
    document.querySelector(
      ".main-nav"
    );

  if (!button || !nav) {
    return;
  }

  button.addEventListener(
    "click",
    () => {
      const open =
        nav.classList.toggle(
          "open"
        );

      button.setAttribute(
        "aria-expanded",
        String(open)
      );
    }
  );

  nav
    .querySelectorAll("a")
    .forEach((link) => {
      link.addEventListener(
        "click",
        () => {
          nav.classList.remove(
            "open"
          );

          button.setAttribute(
            "aria-expanded",
            "false"
          );
        }
      );
    });
}

document.addEventListener(
  "DOMContentLoaded",
  () => {
    setupMenu();

    const year =
      document.querySelector(
        "#year"
      );

    if (year) {
      year.textContent =
        new Date().getFullYear();
    }

    loadLatestEpisodes();
  }
);