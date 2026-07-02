// App State
let isSplitMode = false;
let currentVersesList = [];
let displayedVersesCount = 0;
const VERSES_PAGE_SIZE = 10;
let dbDivya = [];
let dbDesika = [];
let dbStotrams = [];

// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');
const readerPanel = document.getElementById('reader-panel');
const readerTitle = document.getElementById('reader-title');
const readerSubtitle = document.getElementById('reader-subtitle');
const versesList = document.getElementById('verses-list');
const closeReaderBtn = document.getElementById('close-reader-btn');
const loadMoreContainer = document.getElementById('load-more-container');
const loadMoreBtn = document.getElementById('load-more-btn');

// TOC & Views DOM Elements
const tocContainer = document.getElementById('toc-container');
const mainDivyaList = document.getElementById('main-divya-list');
const mainDesikaList = document.getElementById('main-desika-list');
const mainStotramList = document.getElementById('main-stotram-list');
const favoritesContainer = document.getElementById('favorites-container');
const favoritesList = document.getElementById('favorites-list');
const settingsContainer = document.getElementById('settings-container');

// Welcome Landing DOM Elements
const welcomeView = document.getElementById('welcome-view');
const recentsSection = document.getElementById('recents-section');
const recentsList = document.getElementById('recents-list');

// Floating Action Menu DOM Elements
const fabContainer = document.getElementById('fab-container');
const fabTrigger = document.getElementById('fab-trigger');
const optToc = document.getElementById('opt-toc');
const optFavs = document.getElementById('opt-favs');
const optSettings = document.getElementById('opt-settings');

// State Loaders (localStorage)
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let recents = JSON.parse(localStorage.getItem('recents')) || [];
let chantingFontSize = localStorage.getItem('chanting_font_size') || '17.5px';
let chantingFontFamily = localStorage.getItem('chanting_font_family') || "'Outfit', sans-serif";
let appTheme = localStorage.getItem('app_theme') || 'midnight';

// Apply initial settings
document.body.className = appTheme === 'midnight' ? '' : 'theme-' + appTheme;

// ----------------------------------------------------
// Setup Event Listeners
// ----------------------------------------------------
const headerHomeBtn = document.getElementById('header-home-btn');
if (headerHomeBtn) {
  headerHomeBtn.addEventListener('click', () => {
    switchTab(welcomeView);
    chatInput.value = '';
    chatInput.dispatchEvent(new Event('input'));
  });
}

if (chatSendBtn) {
  chatSendBtn.addEventListener('click', handleSearchOrAskAI);
}
if (chatInput) {
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearchOrAskAI();
  });
  
  // Real-Time TOC Lookup
  chatInput.addEventListener('input', (e) => {
    const q = normalizeText(e.target.value);
    
    // Switch view back to TOC index if user starts typing while in other tabs
    if (tocContainer.classList.contains('hidden') && q.length > 0) {
      switchTab(tocContainer);
    }
    
    const folders = document.querySelectorAll('.toc-folder');
    folders.forEach(folder => {
      const content = folder.querySelector('.toc-folder-content');
      const arrow = folder.querySelector('.folder-arrow');
      let hasVisibleMatch = false;
      
      const folderItems = content.querySelectorAll('.hymn-index-item');
      folderItems.forEach(item => {
        const normText = normalizeText(item.textContent);
        if (normText.includes(q)) {
          item.style.display = 'flex';
          hasVisibleMatch = true;
        } else {
          item.style.display = 'none';
        }
      });
      
      if (q.length > 0) {
        if (hasVisibleMatch) {
          folder.style.display = 'block';
          content.classList.remove('hidden');
          if (arrow) arrow.style.transform = 'rotate(90deg)';
        } else {
          folder.style.display = 'none';
        }
      } else {
        // Reset state: folders visible, but collapsed
        folder.style.display = 'block';
        content.classList.add('hidden');
        if (arrow) arrow.style.transform = 'rotate(0deg)';
      }
    });
  });
}

if (closeReaderBtn) {
  closeReaderBtn.addEventListener('click', () => {
    readerPanel.classList.remove('open');
  });
}

if (loadMoreBtn) {
  loadMoreBtn.addEventListener('click', () => {
    renderVersesIncremental(false);
  });
}

// ----------------------------------------------------
// Folder Accordion Toggle
// ----------------------------------------------------
document.querySelectorAll('.toc-folder-header').forEach(header => {
  header.addEventListener('click', () => {
    const content = header.nextElementSibling;
    const arrow = header.querySelector('.folder-arrow');
    
    if (content) {
      const isHidden = content.classList.contains('hidden');
      if (isHidden) {
        content.classList.remove('hidden');
        if (arrow) arrow.style.transform = 'rotate(90deg)';
      } else {
        content.classList.add('hidden');
        if (arrow) arrow.style.transform = 'rotate(0deg)';
      }
    }
  });
});

// ----------------------------------------------------
// Floating Action Menu Actions
// ----------------------------------------------------
if (fabTrigger) {
  fabTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    fabContainer.classList.toggle('open');
  });
}

// Close FAB when tapping anywhere outside the button
document.addEventListener('click', () => {
  if (fabContainer) fabContainer.classList.remove('open');
});

// Tab Navigation triggers
if (optToc) {
  optToc.addEventListener('click', () => {
    switchTab(tocContainer);
    chatInput.value = '';
    chatInput.dispatchEvent(new Event('input'));
  });
}
if (optFavs) {
  optFavs.addEventListener('click', () => {
    switchTab(favoritesContainer);
    renderFavoritesList();
  });
}
if (optSettings) {
  optSettings.addEventListener('click', () => {
    switchTab(settingsContainer);
  });
}

function switchTab(targetView) {
  // Close FAB menu drawer
  if (fabContainer) fabContainer.classList.remove('open');
  
  // Hide all panels
  [tocContainer, favoritesContainer, settingsContainer, chatMessages, welcomeView].forEach(view => {
    if (view) view.classList.add('hidden');
  });
  
  // Show target
  if (targetView) targetView.classList.remove('hidden');
}

// ----------------------------------------------------
// Settings View Handlers
// ----------------------------------------------------
const settingsSplitToggle = document.getElementById('settings-split-toggle');
if (settingsSplitToggle) {
  settingsSplitToggle.checked = isSplitMode;
  settingsSplitToggle.addEventListener('change', (e) => {
    isSplitMode = e.target.checked;
    if (currentVersesList.length > 0) {
      renderVersesIncremental(true);
    }
  });
}

// Font Size Buttons selector
const fontSizeBtns = document.querySelectorAll('.font-size-btn');
fontSizeBtns.forEach(btn => {
  const size = btn.getAttribute('data-size');
  
  // Apply initial active styling
  if (size === chantingFontSize) {
    btn.classList.add('active');
  }
  
  btn.addEventListener('click', () => {
    fontSizeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    chantingFontSize = size;
    localStorage.setItem('chanting_font_size', chantingFontSize);
    
    if (currentVersesList.length > 0) {
      renderVersesIncremental(true);
    }
  });
});

// Font Family selector
const fontFamilyBtns = document.querySelectorAll('.font-family-btn');
fontFamilyBtns.forEach(btn => {
  const font = btn.getAttribute('data-font');
  
  if (font === chantingFontFamily) {
    fontFamilyBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Set custom visual styles
    btn.style.fontWeight = '600';
    btn.style.color = 'var(--accent-gold)';
    btn.style.border = '1px solid var(--accent-gold)';
    btn.style.background = 'rgba(217,167,74,0.1)';
  }
  
  btn.addEventListener('click', () => {
    fontFamilyBtns.forEach(b => {
      b.classList.remove('active');
      b.style.fontWeight = '400';
      b.style.color = 'var(--text-primary)';
      b.style.border = '1px solid var(--bg-card-border)';
      b.style.background = 'rgba(255,255,255,0.04)';
    });
    btn.classList.add('active');
    
    btn.style.fontWeight = '600';
    btn.style.color = 'var(--accent-gold)';
    btn.style.border = '1px solid var(--accent-gold)';
    btn.style.background = 'rgba(217,167,74,0.1)';
    
    chantingFontFamily = font;
    localStorage.setItem('chanting_font_family', chantingFontFamily);
    
    if (currentVersesList.length > 0) {
      renderVersesIncremental(true);
    }
  });
});

// Theme Selector
const themeBtns = document.querySelectorAll('.theme-btn');
themeBtns.forEach(btn => {
  const themeName = btn.getAttribute('data-theme');
  
  if (themeName === appTheme) {
    themeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    btn.style.fontWeight = '600';
    btn.style.color = 'var(--accent-gold)';
    btn.style.borderColor = 'var(--accent-gold)';
  }
  
  btn.addEventListener('click', () => {
    themeBtns.forEach(b => {
      b.classList.remove('active');
      b.style.fontWeight = '400';
      b.style.color = 'var(--text-primary)';
      b.style.borderColor = 'var(--bg-card-border)';
    });
    btn.classList.add('active');
    btn.style.fontWeight = '600';
    btn.style.color = 'var(--accent-gold)';
    btn.style.borderColor = 'var(--accent-gold)';
    
    appTheme = themeName;
    localStorage.setItem('app_theme', appTheme);
    document.body.className = appTheme === 'midnight' ? '' : 'theme-' + appTheme;
  });
});

// ----------------------------------------------------
// Favorites Manager
// ----------------------------------------------------
const favoriteToggleBtn = document.getElementById('favorite-toggle-btn');
if (favoriteToggleBtn) {
  favoriteToggleBtn.addEventListener('click', () => {
    if (currentVersesList.length > 0) {
      const hymnId = currentVersesList[0].hymn_id;
      toggleFavorite(hymnId);
    }
  });
}

function toggleFavorite(hymnId) {
  const idx = favorites.indexOf(hymnId);
  if (idx > -1) {
    favorites.splice(idx, 1);
  } else {
    favorites.push(hymnId);
  }
  localStorage.setItem('favorites', JSON.stringify(favorites));
  updateFavoriteButtonState(hymnId);
}

function updateFavoriteButtonState(hymnId) {
  const favToggleBtn = document.getElementById('favorite-toggle-btn');
  if (!favToggleBtn) return;
  
  if (favorites.includes(hymnId)) {
    favToggleBtn.textContent = '❤️';
  } else {
    favToggleBtn.textContent = '☆';
  }
}

function renderFavoritesList() {
  if (!favoritesList) return;
  favoritesList.innerHTML = '';
  
  const emptyMsg = document.getElementById('favorites-empty-msg');
  
  if (favorites.length === 0) {
    if (emptyMsg) emptyMsg.classList.remove('hidden');
    return;
  }
  
  if (emptyMsg) emptyMsg.classList.add('hidden');
  
  const allDb = [...dbDivya, ...dbDesika, ...dbStotrams];
  const groups = groupVersesByHymn(allDb);
  const favGroups = groups.filter(g => favorites.includes(g.hymn_id));
  
  favGroups.forEach(group => {
    const srcDb = dbDivya.some(v => v.hymn_id === group.hymn_id) ? dbDivya : (dbDesika.some(v => v.hymn_id === group.hymn_id) ? dbDesika : dbStotrams);
    favoritesList.appendChild(createHymnIndexItem(group, srcDb));
  });
}

// ----------------------------------------------------
// Recents (Last 5 Opened) Manager
// ----------------------------------------------------
function addToRecents(hymnId) {
  // Remove duplicate if it exists
  const idx = recents.indexOf(hymnId);
  if (idx > -1) {
    recents.splice(idx, 1);
  }
  // Add to top
  recents.unshift(hymnId);
  // Cap at 5
  recents = recents.slice(0, 5);
  
  localStorage.setItem('recents', JSON.stringify(recents));
  renderRecentsSection();
}

function renderRecentsSection() {
  if (!recentsSection || !recentsList) return;
  recentsList.innerHTML = '';
  
  if (recents.length === 0) {
    recentsSection.classList.add('hidden');
    return;
  }
  
  recentsSection.classList.remove('hidden');
  
  const allDb = [...dbDivya, ...dbDesika, ...dbStotrams];
  const groups = groupVersesByHymn(allDb);
  
  // Find matching groups in order of recents
  recents.forEach(recId => {
    const group = groups.find(g => g.hymn_id === recId);
    if (group) {
      const srcDb = dbDivya.some(v => v.hymn_id === group.hymn_id) ? dbDivya : (dbDesika.some(v => v.hymn_id === group.hymn_id) ? dbDesika : dbStotrams);
      recentsList.appendChild(createHymnIndexItem(group, srcDb));
    }
  });
}

// ----------------------------------------------------
// Text Normalization for Fuzzy Matching
// ----------------------------------------------------
function normalizeText(str) {
  if (!str) return '';
  let norm = str.toLowerCase();
  
  // Strip standard retroflexes and vowels
  norm = norm
    .replace(/[āā]/g, 'a')
    .replace(/[īī]/g, 'i')
    .replace(/[ūū]/g, 'u')
    .replace(/[ēē]/g, 'e')
    .replace(/[ōō]/g, 'o')
    .replace(/[ṇṇ]/g, 'n')
    .replace(/[ḷḷ]/g, 'l')
    .replace(/[ṟṟ]/g, 'r')
    .replace(/[ṅṅ]/g, 'g')
    .replace(/[ññ]/g, 'n')
    .replace(/[śś]/g, 's')
    .replace(/[ṣṣ]/g, 's')
    .replace(/[ḻḻ]/g, 'l')
    .replace(/[ḍḍ]/g, 'd')
    .replace(/[ṭṭ]/g, 't')
    .replace(/[ṛṛ]/g, 'r');

  // Simplify phonetics
  norm = norm
    .replace(/aa/g, 'a')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/zh/g, 'z')
    .replace(/sh/g, 's')
    .replace(/th/g, 't')
    .replace(/bh/g, 'b')
    .replace(/dh/g, 'd')
    .replace(/gh/g, 'g')
    .replace(/ph/g, 'p');

  // De-duplicate duplicate consecutive consonants
  let dedup = '';
  for (let i = 0; i < norm.length; i++) {
    if (norm[i] !== norm[i - 1]) {
      dedup += norm[i];
    }
  }
  
  return dedup.replace(/[^a-z0-9]/g, '');
}

// ----------------------------------------------------
// Database Loading & Layout Generation
// ----------------------------------------------------
async function initLocalDatabase() {
  try {
    const resDivya = await fetch('data/divya_prabandham.json');
    dbDivya = await resDivya.json();
    
    const resDesika = await fetch('data/desika_prabandham.json');
    dbDesika = await resDesika.json();
    
    const resStotrams = await fetch('data/vaishnava_stotrams.json');
    dbStotrams = await resStotrams.json();
    
    console.log(`Local DB loaded: ${dbDivya.length} Divya, ${dbDesika.length} Desika, ${dbStotrams.length} Stotrams.`);
    populateBrowseLists();
    renderRecentsSection();
  } catch (err) {
    console.error("Failed to load local database files:", err);
  }
}

function populateBrowseLists() {
  if (!mainDivyaList || !mainDesikaList || !mainStotramList) return;
  
  mainDivyaList.innerHTML = '';
  mainDesikaList.innerHTML = '';
  mainStotramList.innerHTML = '';
  
  // 1. Process Divya Prabandham
  const divyaGroups = groupVersesByHymn(dbDivya);
  const mostRecitedDivyaIds = ["tiruppallaandu", "tiruppaavai"];
  const mostRecitedDivya = divyaGroups.filter(g => mostRecitedDivyaIds.includes(g.hymn_id));
  const otherDivya = divyaGroups.filter(g => !mostRecitedDivyaIds.includes(g.hymn_id));
  
  if (mostRecitedDivya.length > 0) {
    const subheader = document.createElement('div');
    subheader.className = 'toc-subheader';
    subheader.textContent = '🌟 Most Recited (Daily)';
    mainDivyaList.appendChild(subheader);
    mostRecitedDivya.forEach(group => {
      mainDivyaList.appendChild(createHymnIndexItem(group, dbDivya));
    });
  }
  
  if (otherDivya.length > 0) {
    const subheader = document.createElement('div');
    subheader.className = 'toc-subheader';
    subheader.textContent = '📖 All Hymns (by Composer)';
    mainDivyaList.appendChild(subheader);
    otherDivya.forEach(group => {
      mainDivyaList.appendChild(createHymnIndexItem(group, dbDivya));
    });
  }
  
  // 2. Process Desika Prabandham
  const desikaGroups = groupVersesByHymn(dbDesika);
  desikaGroups.forEach(group => {
    mainDesikaList.appendChild(createHymnIndexItem(group, dbDesika));
  });
  
  // 3. Process Vaishnava Stotrams
  const stotramGroups = groupVersesByHymn(dbStotrams);
  
  // Sort stotrams alphabetically by name
  stotramGroups.sort((a, b) => a.hymn_name.localeCompare(b.hymn_name));
  
  stotramGroups.forEach(group => {
    mainStotramList.appendChild(createHymnIndexItem(group, dbStotrams));
  });
}

function groupVersesByHymn(verses) {
  const map = new Map();
  verses.forEach(v => {
    if (!map.has(v.hymn_id)) {
      map.set(v.hymn_id, {
        hymn_id: v.hymn_id,
        hymn_name: v.hymn_name,
        composer: v.composer,
        count: 0
      });
    }
    map.get(v.hymn_id).count++;
  });
  return Array.from(map.values());
}

function createHymnIndexItem(group, sourceDb) {
  const div = document.createElement('div');
  div.className = 'hymn-index-item';
  div.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--bg-card-border);
    border-radius: 12px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
  `;
  
  const info = document.createElement('div');
  const name = document.createElement('div');
  name.style.cssText = 'font-weight: 600; font-size: 14.5px; color: var(--text-primary);';
  name.textContent = group.hymn_name;
  info.appendChild(name);
  
  const details = document.createElement('div');
  details.style.cssText = 'font-size: 12px; color: var(--text-secondary); margin-top: 3px;';
  details.textContent = `${group.composer} • ${group.count} Verses`;
  info.appendChild(details);
  
  div.appendChild(info);
  
  const icon = document.createElement('span');
  icon.style.cssText = 'color: var(--accent-gold); font-size: 16px; font-weight: bold;';
  icon.textContent = '→';
  div.appendChild(icon);
  
  div.addEventListener('click', () => {
    const hymnVerses = sourceDb.filter(v => v.hymn_id === group.hymn_id);
    loadVersesIntoReader(hymnVerses);
  });
  
  div.addEventListener('mouseenter', () => {
    div.style.background = 'rgba(217, 167, 74, 0.08)';
    div.style.borderColor = 'var(--accent-gold)';
    div.style.transform = 'translateY(-1px)';
  });
  div.addEventListener('mouseleave', () => {
    div.style.background = 'rgba(255, 255, 255, 0.02)';
    div.style.borderColor = 'var(--bg-card-border)';
    div.style.transform = 'translateY(0)';
  });
  
  return div;
}

// ----------------------------------------------------
// Reader Overlay Rendering
// ----------------------------------------------------
function loadVersesIntoReader(versesArray) {
  currentVersesList = versesArray;
  displayedVersesCount = 0;
  versesList.innerHTML = '';
  
  if (versesArray.length > 0) {
    const hymnId = versesArray[0].hymn_id;
    updateFavoriteButtonState(hymnId);
    addToRecents(hymnId);
  }
  
  const first = versesArray[0];
  let cleanTitle = "Hymn Search Results";
  if (first.title) {
    cleanTitle = first.title.split(' - ')[0];
  } else if (first.hymn_name) {
    cleanTitle = first.hymn_name;
  }
  readerTitle.textContent = cleanTitle;
  readerSubtitle.textContent = first.alvar || first.composer || "Various Composers";
  
  renderVersesIncremental(false);
  readerPanel.classList.add('open');
}

function appendDesikaTaniyanIfNeeded() {
  if (currentVersesList.length === 0) return;
  const first = currentVersesList[0];
  const isDesikaWork = (first.composer && first.composer.toLowerCase().includes("deśika")) || 
                       (first.composer && first.composer.toLowerCase().includes("desika")) ||
                       (first.category === "Desika Prabandham");
                       
  if (isDesikaWork) {
    const thaniyanCard = document.createElement('div');
    thaniyanCard.className = 'desika-thaniyan-card';
    thaniyanCard.style.cssText = `
      background: rgba(217, 167, 74, 0.05);
      border: 1px solid rgba(217, 167, 74, 0.3);
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
      text-align: center;
    `;
    thaniyanCard.innerHTML = `
      <div style="font-size: 12px; color: var(--accent-gold); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; font-weight: 600;">
        Śrī Desika Taniyan
      </div>
      <div style="font-size: 16.5px; line-height: 1.45; font-style: italic; color: var(--text-primary); font-family: 'Inter', sans-serif;">
        śrīmān vēṅkaṭanāthāryaḥ kavitārkikakēsarī |<br>
        vēdāntācāryavaryō mē sannidhattāṃ sadā hṛdi ||
      </div>
    `;
    versesList.appendChild(thaniyanCard);
  }
}

function renderVersesIncremental(isReRender = false) {
  if (isReRender) {
    versesList.innerHTML = '';
    appendDesikaTaniyanIfNeeded();
    const limit = displayedVersesCount;
    for (let i = 0; i < limit; i++) {
      appendVerseCard(currentVersesList[i]);
    }
  } else {
    const start = displayedVersesCount;
    if (start === 0) {
      appendDesikaTaniyanIfNeeded();
    }
    const end = Math.min(start + VERSES_PAGE_SIZE, currentVersesList.length);
    
    for (let i = start; i < end; i++) {
      appendVerseCard(currentVersesList[i]);
      displayedVersesCount++;
    }
  }
  
  if (displayedVersesCount < currentVersesList.length) {
    loadMoreContainer.classList.remove('hidden');
  } else {
    loadMoreContainer.classList.add('hidden');
  }
}

function appendVerseCard(verse) {
  const cardDiv = document.createElement('div');
  cardDiv.className = 'verse-card';
  
  const meta = document.createElement('div');
  meta.className = 'verse-meta';
  meta.style.display = 'none';
  cardDiv.appendChild(meta);
  
  const textBox = document.createElement('div');
  textBox.className = 'verse-text-box';
  
  const lineStyle = `font-size: ${chantingFontSize}; font-family: ${chantingFontFamily}; line-height: 1.55;`;
  const pillStyle = `font-size: calc(${chantingFontSize} - 1px); font-family: ${chantingFontFamily};`;
  
  if (isSplitMode && verse.split_lines && verse.split_lines.length > 0) {
    verse.split_lines.forEach((line, lineIdx) => {
      const lineDiv = document.createElement('div');
      lineDiv.className = 'word-pills-container';
      
      let words = line.split(' | ');
      
      // Inline numbering on the last split line
      if (lineIdx === verse.split_lines.length - 1) {
        const lastWordIdx = words.length - 1;
        if (lastWordIdx >= 0) {
          let lastWord = words[lastWordIdx].trim();
          lastWord = lastWord.replace(/\s*(?:\|\||॥)\s*\d+\s*(?:\|\||॥)?\s*$/, '').trim();
          words[lastWordIdx] = lastWord + `  ॥ ${verse.verse_number} ||`;
        }
      }
      
      words.forEach((word, wIdx) => {
        const pill = document.createElement('span');
        pill.className = 'word-pill';
        pill.textContent = word;
        pill.style.cssText = pillStyle;
        lineDiv.appendChild(pill);
        
        if (wIdx < words.length - 1) {
          const sep = document.createElement('span');
          sep.className = 'word-separator';
          sep.textContent = '|';
          lineDiv.appendChild(sep);
        }
      });
      textBox.appendChild(lineDiv);
    });
  } else {
    const lines = verse.original.split('\n');
    lines.forEach((line, lineIdx) => {
      let displayLine = line.trim();
      
      // Inline numbering on the last conjoined line
      if (lineIdx === lines.length - 1) {
        displayLine = displayLine.replace(/\s*(?:\|\||॥)\s*\d+\s*(?:\|\||॥)?\s*$/, '').trim();
        displayLine = displayLine + `  ॥ ${verse.verse_number} ||`;
      }
      
      const lineP = document.createElement('p');
      lineP.className = 'verse-line';
      lineP.textContent = displayLine;
      lineP.style.cssText = lineStyle;
      textBox.appendChild(lineP);
    });
  }
  
  cardDiv.appendChild(textBox);
  versesList.appendChild(cardDiv);
}

// ----------------------------------------------------
// Chat & Instant Search Gateway
// ----------------------------------------------------
function handleSearchOrAskAI() {
  const messageText = chatInput.value.trim();
  if (!messageText) return;
  
  // 1. Try to find an instant hymn match (Fuzzy Match / I'm Feeling Lucky)
  const allDb = [...dbDivya, ...dbDesika, ...dbStotrams];
  const groups = groupVersesByHymn(allDb);
  const q = normalizeText(messageText);
  
  let bestMatchGroup = null;
  for (const group of groups) {
    const normName = normalizeText(group.hymn_name);
    if (normName === q || normName.includes(q) || q.includes(normName)) {
      bestMatchGroup = group;
      break;
    }
  }
  
  // If we found a matching hymn, open it directly in the reader overlay!
  if (bestMatchGroup) {
    chatInput.value = '';
    const srcDb = dbDivya.some(v => v.hymn_id === bestMatchGroup.hymn_id) ? dbDivya : (dbDesika.some(v => v.hymn_id === bestMatchGroup.hymn_id) ? dbDesika : dbStotrams);
    const hymnVerses = srcDb.filter(v => v.hymn_id === bestMatchGroup.hymn_id);
    loadVersesIntoReader(hymnVerses);
    return;
  }
  
  // 2. Fallback to conversational Ask AI message thread
  switchTab(chatMessages);
  handleSendMessage();
}

async function handleSendMessage() {
  const messageText = chatInput.value.trim();
  if (!messageText) return;
  
  // Append User message bubble
  appendMessage(messageText, 'user');
  chatInput.value = '';
  
  // Add loading indicator
  const loadingId = appendLoadingIndicator();
  
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: messageText })
    });
    
    removeLoadingIndicator(loadingId);
    
    if (response.ok) {
      const data = await response.json();
      appendMessage(data.reply, 'bot');
      
      if (data.verses && data.verses.length > 0) {
        loadVersesIntoReader(data.verses);
      }
    } else {
      appendMessage("Sorry, I encountered an error communicating with the search assistant.", 'bot');
    }
  } catch (error) {
    removeLoadingIndicator(loadingId);
    console.error("Chat error:", error);
    appendMessage("Failed to reach search backend. Ensure the server.py process is active.", 'bot');
  }
}

function appendMessage(text, sender) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${sender}-message`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.innerHTML = `<p>${escapeHTML(text)}</p>`;
  msgDiv.appendChild(contentDiv);
  
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendLoadingIndicator() {
  const loadingId = 'loading-' + Date.now();
  const msgDiv = document.createElement('div');
  msgDiv.className = 'message bot-message';
  msgDiv.id = loadingId;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.innerHTML = `
    <div class="loading-dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;
  msgDiv.appendChild(contentDiv);
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return loadingId;
}

function removeLoadingIndicator(id) {
  const indicator = document.getElementById(id);
  if (indicator) indicator.remove();
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// ----------------------------------------------------
// Startup Initialization
// ----------------------------------------------------
initLocalDatabase();
