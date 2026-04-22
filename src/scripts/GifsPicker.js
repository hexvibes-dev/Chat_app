// src/scripts/GifsPicker.js
const GIPHY_API_KEY = 'TU_API_KEY_AQUI'; // Cámbiala por tu clave
const GIPHY_ENDPOINT = 'https://api.giphy.com/v1/gifs/search';

let searchInput = null;
let resultsContainer = null;
let onInsertCallback = null;

export async function initGifsPicker(container, onInsert) {
  onInsertCallback = onInsert;
  container.innerHTML = '';

  const searchDiv = document.createElement('div');
  searchDiv.className = 'gifs-search';
  searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Buscar GIFs...';
  searchInput.className = 'gifs-search-input';
  const searchBtn = document.createElement('button');
  searchBtn.textContent = '🔍';
  searchBtn.className = 'gifs-search-btn';
  searchDiv.appendChild(searchInput);
  searchDiv.appendChild(searchBtn);
  container.appendChild(searchDiv);

  resultsContainer = document.createElement('div');
  resultsContainer.className = 'gifs-grid';
  container.appendChild(resultsContainer);

  async function searchGifs(query) {
    if (!query.trim()) return;
    try {
      const url = `${GIPHY_ENDPOINT}?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=pg`;
      const response = await fetch(url);
      const data = await response.json();
      displayGifs(data.data);
    } catch (err) {
      console.error(err);
      resultsContainer.innerHTML = '<div class="gifs-error">Error al cargar GIFs</div>';
    }
  }

  function displayGifs(gifs) {
    resultsContainer.innerHTML = '';
    if (!gifs.length) {
      resultsContainer.innerHTML = '<div class="gifs-error">No se encontraron GIFs</div>';
      return;
    }
    gifs.forEach(gif => {
      const img = document.createElement('img');
      img.src = gif.images.fixed_height_small.url;
      img.alt = gif.title;
      img.className = 'gif-item';
      img.addEventListener('click', () => {
        if (onInsertCallback) onInsertCallback(`![GIF](${gif.images.original.url})`);
      });
      resultsContainer.appendChild(img);
    });
  }

  searchBtn.addEventListener('click', () => searchGifs(searchInput.value));
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchGifs(searchInput.value);
  });

  // Cargar trending
  try {
    const url = `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=pg`;
    const response = await fetch(url);
    const data = await response.json();
    displayGifs(data.data);
  } catch (err) {
    console.error(err);
  }
}

export function destroyGifsPicker() {
  searchInput = null;
  resultsContainer = null;
  onInsertCallback = null;
}