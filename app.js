// App State
let isSplitMode = false;
let currentVersesList = [];
let displayedVersesCount = 0;
const VERSES_PAGE_SIZE = 10;
let dbDivya = [];
let dbDesika = [];
let dbStotrams = [];
let currentLanguage = 'english';

// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-tab-input');
const chatSendBtn = document.getElementById('chat-tab-send-btn');
const readerPanel = document.getElementById('reader-panel');
const readerTitle = document.getElementById('reader-title');
const readerSubtitle = document.getElementById('reader-subtitle');
const versesList = document.getElementById('verses-list');
const closeReaderBtn = document.getElementById('close-reader-btn');
const loadMoreContainer = document.getElementById('load-more-container');
const loadMoreBtn = document.getElementById('load-more-btn');

// New iOS Tab View Elements
const tabViewHome = document.getElementById('tabview-home');
const tabViewScriptures = document.getElementById('tabview-scriptures');
const tabViewComposers = document.getElementById('tabview-composers');
const tabViewChat = document.getElementById('tabview-chat');
const tabViewSettings = document.getElementById('tabview-settings');

const tabBtnHome = document.getElementById('tab-home');
const tabBtnScriptures = document.getElementById('tab-scriptures');
const tabBtnComposers = document.getElementById('tab-composers');
const tabBtnChat = document.getElementById('tab-chat');
const tabBtnSettings = document.getElementById('tab-settings');

// Home Dashboard Elements
const homeRecentsList = document.getElementById('home-recents-list');
const homeFavoritesList = document.getElementById('home-favorites-list');
const homeSearchTrigger = document.getElementById('home-search-bar-trigger');

// Flat list search and filters
const scriptureSearchInput = document.getElementById('scripture-search-input');
const filterToggleBtn = document.getElementById('filter-toggle-btn');
const categoryFilterDrawer = document.getElementById('category-filter-drawer');
const flatTocList = document.getElementById('flat-toc-list');
const composersListContainer = document.getElementById('composers-list-container');
const favoritesList = document.getElementById('favorites-list');
const recentsList = document.getElementById('recents-list');

// Segment Toggle Elements
const segmentBtnFavs = document.getElementById('segment-btn-favs');
const segmentBtnRecents = document.getElementById('segment-btn-recents');
const favoritesSection = document.getElementById('favorites-section-container');
const recentsSection = document.getElementById('recents-section-container');

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
    if (tabBtnScriptures) tabBtnScriptures.click();
    if (scriptureSearchInput) {
      scriptureSearchInput.value = '';
      scriptureSearchInput.dispatchEvent(new Event('input'));
    }
  });
}

const langBtnEng = document.getElementById('lang-btn-eng');
const langBtnTam = document.getElementById('lang-btn-tam');

if (langBtnEng && langBtnTam) {
  langBtnEng.addEventListener('click', () => {
    if (currentLanguage === 'english') return;
    currentLanguage = 'english';
    langBtnEng.classList.add('active');
    langBtnEng.style.background = 'var(--accent-gold)';
    langBtnEng.style.color = '#070b19';
    langBtnTam.classList.remove('active');
    langBtnTam.style.background = 'transparent';
    langBtnTam.style.color = 'var(--text-secondary)';
    renderVersesIncremental(true);
  });
  
  langBtnTam.addEventListener('click', () => {
    if (currentLanguage === 'tamil') return;
    currentLanguage = 'tamil';
    langBtnTam.classList.add('active');
    langBtnTam.style.background = 'var(--accent-gold)';
    langBtnTam.style.color = '#070b19';
    langBtnEng.classList.remove('active');
    langBtnEng.style.background = 'transparent';
    langBtnEng.style.color = 'var(--text-secondary)';
    renderVersesIncremental(true);
  });
}

// Chat Send Handlers (Ask AI Tab)
if (chatSendBtn) {
  chatSendBtn.addEventListener('click', handleSearchOrAskAI);
}
if (chatInput) {
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearchOrAskAI();
  });
}

// Flat List Live Search Listener
if (scriptureSearchInput) {
  scriptureSearchInput.addEventListener('input', (e) => {
    const q = normalizeText(e.target.value);
    const filterPillActive = document.querySelector('.filter-pill.active');
    const filter = filterPillActive ? filterPillActive.getAttribute('data-filter') : 'all';
    filterFlatList(q, filter);
  });
  
  scriptureSearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const q = scriptureSearchInput.value.trim();
      if (q) {
        if (tabBtnChat) tabBtnChat.click();
        chatInput.value = q;
        handleSearchOrAskAI();
      }
    }
  });
}

if (filterToggleBtn && categoryFilterDrawer) {
  filterToggleBtn.addEventListener('click', () => {
    categoryFilterDrawer.classList.toggle('collapsed');
  });
}

// Smart Bottom Tab Bar Hiding on Scroll
let lastScrollTop = 0;
const bottomTabBar = document.querySelector('.bottom-tab-bar');

function handleTabBarScroll(e) {
  const scrollTop = e.target.scrollTop || document.documentElement.scrollTop;
  const searchHeader = document.querySelector('.search-header-bar');
  const isReaderOpen = readerPanel && readerPanel.classList.contains('open');
  
  if (scrollTop > lastScrollTop && scrollTop > 40) {
    if (bottomTabBar) bottomTabBar.classList.add('tab-bar-hidden');
    if (searchHeader) searchHeader.classList.add('header-hidden');
  } else if (scrollTop < lastScrollTop) {
    if (bottomTabBar && !isReaderOpen) bottomTabBar.classList.remove('tab-bar-hidden');
    if (searchHeader) searchHeader.classList.remove('header-hidden');
  }
  lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
}

const mainContentFlow = document.querySelector('.main-content-flow');
if (mainContentFlow) {
  mainContentFlow.addEventListener('scroll', handleTabBarScroll);
}
const scrollableReader = document.querySelector('.reader-content');
if (scrollableReader) {
  scrollableReader.addEventListener('scroll', handleTabBarScroll);
}
window.addEventListener('scroll', handleTabBarScroll);

// Category filter pills click handler
document.querySelectorAll('.filter-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    
    const filter = pill.getAttribute('data-filter');
    const q = scriptureSearchInput ? normalizeText(scriptureSearchInput.value) : '';
    filterFlatList(q, filter);
  });
});

// Home Search Bar Trigger
if (homeSearchTrigger) {
  homeSearchTrigger.addEventListener('click', () => {
    if (tabBtnScriptures) tabBtnScriptures.click();
    setTimeout(() => {
      if (scriptureSearchInput) scriptureSearchInput.focus();
    }, 150);
  });
}

// Bottom Tab Bar Routing
const tabs = [
  { btn: tabBtnHome, view: tabViewHome },
  { btn: tabBtnScriptures, view: tabViewScriptures },
  { btn: tabBtnComposers, view: tabViewComposers },
  { btn: tabBtnChat, view: tabViewChat },
  { btn: tabBtnSettings, view: tabViewSettings }
];

tabs.forEach(tab => {
  if (tab.btn) {
    tab.btn.addEventListener('click', () => {
      switchTab(tab.view);
      tabs.forEach(t => {
        if (t.btn) t.btn.classList.remove('active');
      });
      tab.btn.classList.add('active');
      
      if (bottomTabBar) bottomTabBar.classList.remove('tab-bar-hidden');
      
      if (tab.view === tabViewHome) {
        renderHomeFavorites();
        renderHomeRecents();
      } else if (tab.view === tabViewComposers) {
        renderComposersView();
      }
    });
  }
});

if (closeReaderBtn) {
  closeReaderBtn.addEventListener('click', () => {
    readerPanel.classList.remove('open');
    readerPanel.classList.remove('header-tucked');
    if (bottomTabBar) bottomTabBar.classList.remove('tab-bar-hidden');
  });
}

const readerContent = document.getElementById('reader-content');
if (readerContent) {
  readerContent.addEventListener('click', (e) => {
    // Prevent toggling if user clicks a button, a badge, a word pill, or language pills
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.word-pill') || e.target.closest('.lang-selector-pill')) {
      return;
    }
    readerPanel.classList.toggle('header-tucked');
  });
}

if (loadMoreBtn) {
  loadMoreBtn.addEventListener('click', () => {
    renderVersesIncremental(false);
  });
}

function switchTab(targetView) {
  [tabViewHome, tabViewScriptures, tabViewComposers, tabViewChat, tabViewSettings].forEach(view => {
    if (view) view.classList.add('hidden');
  });
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

function renderHomeFavorites() {
  if (!homeFavoritesList) return;
  homeFavoritesList.innerHTML = '';
  
  const favSection = document.getElementById('home-favorites-section');
  if (favorites.length === 0) {
    if (favSection) favSection.style.display = 'none';
    return;
  }
  if (favSection) favSection.style.display = 'block';
  
  const favGroups = allHymnsCached.filter(g => favorites.includes(g.hymn_id));
  favGroups.forEach(group => {
    homeFavoritesList.appendChild(createHorizontalHymnCard(group));
  });
}

// ----------------------------------------------------
// Recents (Last 5 Opened) Manager
// ----------------------------------------------------
function addToRecents(hymnId) {
  const idx = recents.indexOf(hymnId);
  if (idx > -1) {
    recents.splice(idx, 1);
  }
  recents.unshift(hymnId);
  recents = recents.slice(0, 5);
  localStorage.setItem('recents', JSON.stringify(recents));
}

function renderHomeRecents() {
  if (!homeRecentsList) return;
  homeRecentsList.innerHTML = '';
  
  const recentsSection = document.getElementById('home-recents-section');
  if (recents.length === 0) {
    if (recentsSection) recentsSection.style.display = 'none';
    return;
  }
  if (recentsSection) recentsSection.style.display = 'block';
  
  recents.forEach(recId => {
    const group = allHymnsCached.find(g => g.hymn_id === recId);
    if (group) {
      homeRecentsList.appendChild(createHorizontalHymnCard(group));
    }
  });
}

function createHorizontalHymnCard(group) {
  const card = document.createElement('div');
  card.className = 'horizontal-hymn-card';
  
  const icon = document.createElement('div');
  icon.className = 'card-icon-badge';
  icon.textContent = '📚';
  card.appendChild(icon);
  
  const title = document.createElement('div');
  title.className = 'card-title-text';
  title.textContent = group.hymn_name;
  card.appendChild(title);
  
  const sub = document.createElement('div');
  sub.className = 'card-subtitle-text';
  sub.textContent = 'Continue Reading';
  card.appendChild(sub);
  
  card.addEventListener('click', () => {
    const hymnVerses = group.db.filter(v => v.hymn_id === group.hymn_id);
    loadVersesIntoReader(hymnVerses);
    addToRecents(group.hymn_id);
  });
  
  return card;
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
    renderFlatScriptures();
    renderHomeFavorites();
    renderHomeRecents();
  } catch (err) {
    console.error("Failed to load local database files:", err);
  }
}

let allHymnsCached = [];

function renderFlatScriptures() {
  if (!flatTocList) return;
  flatTocList.innerHTML = '';
  
  const divyaGroups = groupVersesByHymn(dbDivya).map(g => ({ ...g, category: 'divya', db: dbDivya }));
  const desikaGroups = groupVersesByHymn(dbDesika).map(g => ({ ...g, category: 'desika', db: dbDesika }));
  const stotramGroups = groupVersesByHymn(dbStotrams).map(g => ({ ...g, category: 'stotram', db: dbStotrams }));
  
  allHymnsCached = [...divyaGroups, ...desikaGroups, ...stotramGroups];
  allHymnsCached.sort((a, b) => a.hymn_name.localeCompare(b.hymn_name));
  
  allHymnsCached.forEach(group => {
    flatTocList.appendChild(createHymnIndexItem(group, group.db, group.category));
  });
}

function filterFlatList(q, filter) {
  if (!flatTocList) return;
  flatTocList.innerHTML = '';
  
  allHymnsCached.forEach(group => {
    const matchQuery = !q || 
                       normalizeText(group.hymn_name).includes(q) || 
                       normalizeText(group.composer).includes(q);
    const matchFilter = filter === 'all' || group.category === filter;
    
    if (matchQuery && matchFilter) {
      flatTocList.appendChild(createHymnIndexItem(group, group.db, group.category));
    }
  });
}

function renderComposersView() {
  if (!composersListContainer) return;
  composersListContainer.innerHTML = '';
  
  const composerMap = new Map();
  allHymnsCached.forEach(hymn => {
    const comp = hymn.composer || 'Various';
    if (!composerMap.has(comp)) {
      composerMap.set(comp, []);
    }
    composerMap.get(comp).push(hymn);
  });
  
  const composers = Array.from(composerMap.keys()).sort((a, b) => {
    if (a.toLowerCase().includes('deśika') || a.toLowerCase().includes('desika')) return -1;
    if (b.toLowerCase().includes('deśika') || b.toLowerCase().includes('desika')) return 1;
    return a.localeCompare(b);
  });
  
  composers.forEach(composer => {
    const section = document.createElement('div');
    section.className = 'composer-section';
    section.style.marginBottom = '16px';
    
    const header = document.createElement('div');
    header.className = 'composer-section-header';
    header.textContent = composer;
    section.appendChild(header);
    
    const list = document.createElement('div');
    list.className = 'hymn-list-container';
    
    composerMap.get(composer).forEach(group => {
      list.appendChild(createHymnIndexItem(group, group.db, group.category));
    });
    
    section.appendChild(list);
    composersListContainer.appendChild(section);
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

function createHymnIndexItem(group, sourceDb, category) {
  const div = document.createElement('div');
  div.className = 'hymn-index-item';
  
  const info = document.createElement('div');
  info.className = 'hymn-info';
  
  const nameRow = document.createElement('div');
  nameRow.className = 'hymn-name-row';
  
  const name = document.createElement('span');
  name.className = 'hymn-name';
  name.textContent = group.hymn_name;
  nameRow.appendChild(name);
  
  if (category) {
    const badge = document.createElement('span');
    badge.className = `hymn-category-badge badge-${category.toLowerCase()}`;
    let catLabel = category;
    if (category === 'divya') catLabel = 'Divya';
    else if (category === 'desika') catLabel = 'Desika';
    else if (category === 'stotram') catLabel = 'Stotram';
    badge.textContent = catLabel;
    nameRow.appendChild(badge);
  }
  info.appendChild(nameRow);
  
  const details = document.createElement('div');
  details.className = 'hymn-details';
  details.textContent = `${group.composer} • ${group.count} Verses`;
  info.appendChild(details);
  
  div.appendChild(info);
  
  const chevron = document.createElement('span');
  chevron.className = 'hymn-chevron';
  chevron.textContent = '›';
  div.appendChild(chevron);
  
  div.addEventListener('click', () => {
    const hymnVerses = sourceDb.filter(v => v.hymn_id === group.hymn_id);
    loadVersesIntoReader(hymnVerses);
    addToRecents(group.hymn_id);
  });
  
  return div;
}

// ----------------------------------------------------
// Reader Overlay Rendering
// ----------------------------------------------------
function updateReaderHeader() {
  if (currentVersesList.length === 0) return;
  const first = currentVersesList[0];
  
  let cleanTitle = "Hymn Search Results";
  if (first.hymn_name) {
    cleanTitle = first.hymn_name;
  } else if (first.title) {
    cleanTitle = first.title.split(' - ')[0];
  }
  
  let subtitleText = first.alvar || first.composer || "Various Composers";
  
  if (currentLanguage === 'tamil') {
    cleanTitle = transliterateIASTtoTamil(cleanTitle);
    subtitleText = transliterateIASTtoTamil(subtitleText);
  }
  
  readerTitle.textContent = cleanTitle;
  readerSubtitle.textContent = subtitleText;
}

function loadVersesIntoReader(versesArray) {
  // Clone versesArray to avoid modifying the original cached database in memory
  const clonedVerses = versesArray.map(v => {
    const cloned = { ...v };
    if (v.split_lines) {
      cloned.split_lines = [...v.split_lines];
    }
    return cloned;
  });
  
  // No automatic prepending of ‡ repeat symbol
  
  currentVersesList = clonedVerses;
  displayedVersesCount = 0;
  versesList.innerHTML = '';
  
  if (currentVersesList.length > 0) {
    const hymnId = currentVersesList[0].hymn_id;
    updateFavoriteButtonState(hymnId);
    addToRecents(hymnId);
  }
  
  updateReaderHeader();
  
  renderVersesIncremental(false);
  readerPanel.classList.add('open');
  if (bottomTabBar) bottomTabBar.classList.add('tab-bar-hidden');
}

function appendDesikaTaniyanIfNeeded() {
  if (currentVersesList.length === 0) return;
  const first = currentVersesList[0];
  const isDesikaWork = (first.composer && first.composer.toLowerCase().includes("deśika")) || 
                       (first.composer && first.composer.toLowerCase().includes("desika")) ||
                       (first.category === "Desika Prabandham");
                       
  if (isDesikaWork) {
    const thaniyanCard = document.createElement('div');
    thaniyanCard.className = 'verse-card desika-thaniyan-card';
    thaniyanCard.style.cssText = 'position: relative;';
    
    let label = "Śrī Desika Taniyan";
    let body = `śrīmān vēṅkaṭanāthāryaḥ kavitārkikakēsarī |\nvēdāntācāryavaryō mē sannidhattāṃ sadā hṛdi ||`;
    if (currentLanguage === 'tamil') {
      label = "ஸ்ரீ தேசிக தனியன்";
      body = `ஸ்ரீமான் வேங்கடநாதார்யஹ் கவிதாரிகிககேஸரீ |\nவேதாந்தாசார்யவர்யோ மே ஸன்னிதத்தாம் ஸதா ஹ்ருதி ||`;
    }
    
    const lineStyle = `font-size: ${chantingFontSize}; font-family: ${chantingFontFamily}; line-height: 1.55;`;
    const lines = body.split('\n');
    let linesHtml = lines.map(line => `<p class="verse-line" style="${lineStyle}">${line.trim()}</p>`).join('');
    
    thaniyanCard.innerHTML = `
      <div class="verse-text-box">
        <div style="font-size: 11.5px; color: var(--accent-gold); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; font-weight: 700; font-family: ${chantingFontFamily};">
          ${label}
        </div>
        ${linesHtml}
      </div>
    `;
    versesList.appendChild(thaniyanCard);
  }
}

function renderVersesIncremental(isReRender = false) {
  versesList.innerHTML = '';
  updateReaderHeader();
  appendDesikaTaniyanIfNeeded();
  
  for (let i = 0; i < currentVersesList.length; i++) {
    appendVerseCard(currentVersesList[i]);
  }
  displayedVersesCount = currentVersesList.length;
  
  loadMoreContainer.classList.add('hidden');
}

function appendVerseCard(verse) {
  const isPrabandham = verse.category && verse.category.toLowerCase().includes("prabandham");
  
  const cardDiv = document.createElement('div');
  cardDiv.className = 'verse-card';
  cardDiv.style.position = 'relative';
  if (!isPrabandham) {
    cardDiv.style.paddingRight = '42px';
  }
  
  const meta = document.createElement('div');
  meta.className = 'verse-meta';
  meta.style.display = 'none';
  cardDiv.appendChild(meta);
  
  const textBox = document.createElement('div');
  textBox.className = 'verse-text-box';
  
  const lineStyle = `font-size: ${chantingFontSize}; font-family: ${chantingFontFamily}; line-height: 1.55;`;
  const pillStyle = `font-size: calc(${chantingFontSize} - 1px); font-family: ${chantingFontFamily};`;
  
  // Dynamic repeat detection
  const startsWithRepeat = verse.original && verse.original.trim().startsWith('‡');
  
  // Render function for the repeat twice icon/badge
  const createRepeatBadge = () => {
    const indicator = document.createElement('span');
    indicator.className = 'repeat-indicator';
    indicator.style.cssText = `font-style: normal;`;
    indicator.textContent = '‡';
    return indicator;
  };
  
  if (isSplitMode && verse.split_lines && verse.split_lines.length > 0) {
    verse.split_lines.forEach((line, lineIdx) => {
      const lineDiv = document.createElement('div');
      lineDiv.className = 'word-pills-container';
      
      let cleanLine = line.trim();
      let hasRepeat = false;
      if (lineIdx === 0 && startsWithRepeat) {
        hasRepeat = true;
        cleanLine = cleanLine.replace(/^‡\s*/, '');
      }
      
      if (hasRepeat) {
        lineDiv.appendChild(createRepeatBadge());
      }
      
      let words = cleanLine.split(' | ');
      
      // Inline numbering on the last split line
      if (lineIdx === verse.split_lines.length - 1) {
        const lastWordIdx = words.length - 1;
        if (lastWordIdx >= 0) {
          let lastWord = words[lastWordIdx].trim();
          lastWord = lastWord.replace(/\s*(?:\|\||॥)\s*\d+\s*(?:\|\||॥)?\s*$/, '').trim();
          if (currentLanguage === 'tamil') {
            words[lastWordIdx] = transliterateIASTtoTamil(lastWord) + `  || ${verse.verse_number}`;
          } else {
            words[lastWordIdx] = lastWord + `  || ${verse.verse_number}`;
          }
        }
      }
      
      words.forEach((word, wIdx) => {
        let displayText = word;
        if (currentLanguage === 'tamil') {
          if (lineIdx !== verse.split_lines.length - 1 || wIdx !== words.length - 1) {
            displayText = transliterateIASTtoTamil(word);
          }
        }
        
        const pill = document.createElement('span');
        pill.className = 'word-pill';
        pill.textContent = displayText;
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
    // Conjoined Mode
    const rawLines = verse.original.split('\n');
    
    // Check if it's a short verse (2 lines, each under 55 chars)
    const isShortVerse = rawLines.length === 2 && 
                         rawLines[0].trim().replace(/^‡\s*/, '').length < 55 && 
                         rawLines[1].trim().length < 55;
                         
    if (isShortVerse) {
      // Process as combined line
      let line1 = rawLines[0].trim();
      let line2 = rawLines[1].trim();
      
      let hasRepeat = false;
      if (line1.startsWith('‡')) {
        hasRepeat = true;
        line1 = line1.replace(/^‡\s*/, '');
      }
      
      // Strip verse number from line 2
      line2 = line2.replace(/\s*(?:\|\||॥)\s*\d+\s*(?:\|\||॥)?\s*$/, '').trim();
      
      if (currentLanguage === 'tamil') {
        line1 = transliterateIASTtoTamil(line1);
        line2 = transliterateIASTtoTamil(line2) + `  || ${verse.verse_number}`;
      } else {
        line2 = line2 + `  || ${verse.verse_number}`;
      }
      
      const lineP = document.createElement('p');
      lineP.className = 'verse-line';
      lineP.style.cssText = lineStyle;
      
      if (hasRepeat) {
        lineP.appendChild(createRepeatBadge());
      }
      
      lineP.appendChild(document.createTextNode(line1 + ' | ' + line2));
      textBox.appendChild(lineP);
      
    } else {
      // Standard multi-line rendering
      rawLines.forEach((line, lineIdx) => {
        let displayLine = line.trim();
        let hasRepeat = false;
        
        if (lineIdx === 0 && startsWithRepeat) {
          hasRepeat = true;
          displayLine = displayLine.replace(/^‡\s*/, '');
        }
        
        // Inline numbering on the last conjoined line
        if (lineIdx === rawLines.length - 1) {
          displayLine = displayLine.replace(/\s*(?:\|\||॥)\s*\d+\s*(?:\|\||॥)?\s*$/, '').trim();
          if (currentLanguage === 'tamil') {
            displayLine = transliterateIASTtoTamil(displayLine) + `  || ${verse.verse_number}`;
          } else {
            displayLine = displayLine + `  || ${verse.verse_number}`;
          }
        } else {
          if (currentLanguage === 'tamil') {
            displayLine = transliterateIASTtoTamil(displayLine);
          }
        }
        
        const lineP = document.createElement('p');
        lineP.className = 'verse-line';
        lineP.style.cssText = lineStyle;
        
        if (hasRepeat) {
          lineP.appendChild(createRepeatBadge());
        }
        
        lineP.appendChild(document.createTextNode(displayLine));
        textBox.appendChild(lineP);
      });
    }
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
  
  const allDb = [...dbDivya, ...dbDesika, ...dbStotrams];
  const q = normalizeText(messageText);
  
  // 1. Try to find an instant hymn match (Fuzzy Match on hymn name)
  const groups = groupVersesByHymn(allDb);
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
  
  // 2. Perform client-side full-text search across all verses
  const matchedVerses = [];
  allDb.forEach(verse => {
    const textToSearch = normalizeText(
      (verse.original || "") + " " +
      (verse.split_lines ? verse.split_lines.join(" ") : "") + " " +
      (verse.hymn_name || "") + " " +
      (verse.composer || "") + " " +
      (verse.category || "")
    );
    
    if (textToSearch.includes(q)) {
      matchedVerses.push({ ...verse });
    }
  });
  
  if (matchedVerses.length > 0) {
    chatInput.value = '';
    
    // Check if matching verses span multiple hymns
    const uniqueHymnIds = [...new Set(matchedVerses.map(v => v.hymn_id))];
    if (uniqueHymnIds.length > 1) {
      // Modify first element to show search title/subtitle in reader header
      matchedVerses[0].hymn_name = `Search: "${messageText}"`;
      matchedVerses[0].composer = `${matchedVerses.length} verses found`;
    }
    
    loadVersesIntoReader(matchedVerses);
    return;
  }
  
  // 3. Fallback to conversational Ask AI message thread
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

function transliterateIASTtoTamil(text) {
  if (!text) return "";
  
  // Pre-process common proper names/terms for perfect traditional spelling
  let resultText = text;
  resultText = resultText.replace(/swāmi vedānta deśika/gi, "ஸ்வாமி வேதாந்த தேசிகன்");
  resultText = resultText.replace(/periyāzvār/gi, "பெரியாழ்வார்");
  resultText = resultText.replace(/āṇḍāl/gi, "ஆண்டாள்");
  resultText = resultText.replace(/tiruppallāṇḍu/gi, "திருப்பல்லாண்டு");
  resultText = resultText.replace(/tiruppallaandu/gi, "திருப்பல்லாண்டு");
  resultText = resultText.replace(/adaikkalappattu/gi, "அடைக்கலப்பத்து");
  
  // If the entire text is a matched override, return it immediately
  const cleanTrimmed = resultText.trim();
  if (["ஸ்வாமி வேதாந்த தேசிகன்", "பெரியாழ்வார்", "ஆண்டாள்", "திருப்பல்லாண்டு", "அடைக்கலப்பத்து"].includes(cleanTrimmed)) {
    return cleanTrimmed;
  }
  
  const vowelMap = {
    'ai': 'ஐ', 'au': 'ஔ',
    'ā': 'ஆ', 'ī': 'ஈ', 'ū': 'ஊ', 'ē': 'ஏ', 'ō': 'ஓ',
    'a': 'அ', 'i': 'இ', 'u': 'உ', 'e': 'எ', 'o': 'ஒ',
    'ṛ': 'ரு', 'r̥': 'ரு', 'l̥': 'லு'
  };
  
  const vowelSignMap = {
    'ā': 'ா', 'ī': 'ீ',
    'i': 'ி', 'ū': 'ூ', 'u': 'ு',
    'e': 'ெ', 'ē': 'ே', 'ai': 'ை', 'o': 'ொ', 'ō': 'ோ', 'au': 'ௌ', 'a': '',
    'ṛ': '்ரு', 'r̥': '்ரு', 'l̥': '்லு'
  };
  
  const consonantMap = {
    'kṣ': 'க்ஷ',
    'kh': 'க', 'gh': 'க', 'ch': 'ச', 'jh': 'ஜ', 'th': 'த', 'dh': 'த', 'ṭh': 'ட', 'ḍh': 'ட', 'ph': 'ப', 'bh': 'ப',
    'k': 'க', 'g': 'க', 'c': 'ச', 'j': 'ஜ', 't': 'த', 'd': 'த', 'ṭ': 'ட', 'ḍ': 'ட', 'p': 'ப', 'b': 'ப',
    'ṅ': 'ங', 'ñ': 'ஞ', 'ṇ': 'ண', 'n': 'ன', 'm': 'ம', 'y': 'ய', 'r': 'ர', 'l': 'ல', 'v': 'வ', 'ḻ': 'ழ', 'ḷ': 'ள', 'ṟ': 'ற',
    'ś': 'ஶ', 'ṣ': 'ஷ', 's': 'ஸ', 'h': 'ஹ', 'w': 'வ', 'z': 'ழ'
  };
  
  let result = "";
  let i = 0;
  let textToProcess = resultText;
  while (i < textToProcess.length) {
    let matched = false;
    
    // 1. Try to match consonant first
    for (let len of [2, 1]) {
      if (i + len <= textToProcess.length) {
        let sub = textToProcess.slice(i, i + len).toLowerCase();
        if (consonantMap[sub] !== undefined) {
          let nextVowel = "";
          let vowelLen = 0;
          for (let vLen of [2, 1]) {
            if (i + len + vLen <= textToProcess.length) {
              let vSub = textToProcess.slice(i + len, i + len + vLen).toLowerCase();
              if (vowelSignMap[vSub] !== undefined) {
                nextVowel = vSub;
                vowelLen = vLen;
                break;
              }
            }
          }
          
          let baseCons = consonantMap[sub];
          if (sub === 'ś') {
            let nextSub = textToProcess.slice(i + len, i + len + 1).toLowerCase();
            baseCons = (nextSub === 'r') ? 'ஶ' : 'ச';
          } else if (sub === 'd') {
            let isPrecededByN = (i > 0 && textToProcess[i-1].toLowerCase() === 'ṇ');
            if (isPrecededByN) {
              baseCons = 'ட';
            }
          } else if (sub === 'ṭ') {
            let nextSub = textToProcess.slice(i + len, i + len + 1).toLowerCase();
            if (nextSub === 'r') {
              baseCons = 'ற';
            }
          } else if (sub === 'r') {
            let prevChar = (i > 0) ? textToProcess[i-1].toLowerCase() : '';
            if (prevChar === 'ṭ' || prevChar === 'ṟ') {
              baseCons = 'ற';
            }
          } else if (sub === 'n') {
            let isWordStart = (i === 0 || /\s/.test(textToProcess[i-1]));
            let nextSub = textToProcess.slice(i + len, i + len + 2).toLowerCase();
            let isDental = /^(t|d)/.test(nextSub);
            baseCons = (isWordStart || isDental) ? 'ந' : 'ன';
          }
          
          if (vowelLen > 0) {
            result += baseCons + vowelSignMap[nextVowel];
            i += len + vowelLen;
          } else {
            result += baseCons + '்';
            i += len;
          }
          matched = true;
          break;
        }
      }
    }
    
    if (matched) continue;
    
    // 2. Try to match standalone vowel
    for (let len of [2, 1]) {
      if (i + len <= textToProcess.length) {
        let sub = textToProcess.slice(i, i + len).toLowerCase();
        if (vowelMap[sub] !== undefined) {
          result += vowelMap[sub];
          i += len;
          matched = true;
          break;
        }
      }
    }
    
    if (matched) continue;
    
    // 3. Special characters & punctuation
    let char = textToProcess[i];
    if (char === 'ṃ' || char === 'ṁ') {
      result += 'ம்';
      i += 1;
    } else if (char === 'ḥ' || char === 'ḥ') {
      result += 'ஃ';
      i += 1;
    } else {
      result += char;
      i += 1;
    }
  }
  return result;
}

// To prevent reprocessing in loop, we keep this wrapper
function transliterateIASTtoTamilWrapper(text) {
  return transliterateIASTtoTamil(text);
}

function transliterateIASTtoDevanagari(text) {
  if (!text) return "";
  let result = text.toLowerCase();
  
  // Clean up punctuation/verse markers
  result = result.replace(/\s*(?:\|\||॥)\s*\d+\s*(?:\|\||॥)?\s*$/, '').trim();
  result = result.replace(/⋆/g, '').replace(/‡/g, '');
  
  const vowels = {
    'ai': 'ऐ', 'au': 'औ', 'ā': 'आ', 'ī': 'ई', 'ū': 'ऊ',
    'e': 'ए', 'o': 'ओ', 'a': 'अ', 'i': 'इ', 'u': 'उ',
    'r̥': 'ऋ', 'l̥': 'ऌ'
  };
  
  const vowelSigns = {
    'ai': 'ै', 'au': 'ौ', 'ā': 'ा', 'ī': 'ी', 'ū': 'ू',
    'e': 'े', 'o': 'ो', 'i': 'ि', 'u': 'ु', 'r̥': 'ृ', 'l̥': 'ॢ'
  };
  
  const consonants = {
    'kh': 'ख', 'gh': 'घ', 'ch': 'छ', 'jh': 'झ', 'ṭh': 'ठ', 'ḍh': 'ढ', 'th': 'थ', 'dh': 'ध', 'ph': 'फ', 'bh': 'भ',
    'k': 'क', 'g': 'ग', 'ṅ': 'ङ', 'c': 'च', 'j': 'ज', 'ñ': 'ञ', 'ṭ': 'ट', 'ḍ': 'ड', 'ṇ': 'ण',
    't': 'त', 'd': 'द', 'n': 'न', 'p': 'प', 'b': 'ब', 'm': 'म',
    'y': 'य', 'r': 'र', 'l': 'ल', 'v': 'व', 'ś': 'श', 'ṣ': 'ष', 's': 'स', 'h': 'ह', 'l̤': 'ळ'
  };
  
  // Normalization
  result = result.replace(/ō/g, 'o').replace(/ē/g, 'e').replace(/ṃ/g, 'ṁ').replace(/ḥ/g, 'ः');
  
  let i = 0;
  let out = "";
  while (i < result.length) {
    if (/\s/.test(result[i])) {
      out += result[i];
      i++;
      continue;
    }
    if (/[.,!?;:|॥\-]/.test(result[i])) {
      out += result[i];
      i++;
      continue;
    }
    
    let foundCons = false;
    let consLen = 0;
    let consChar = "";
    
    if (i + 1 < result.length && consonants[result.substr(i, 2)]) {
      consChar = consonants[result.substr(i, 2)];
      consLen = 2;
      foundCons = true;
    } else if (consonants[result[i]]) {
      consChar = consonants[result[i]];
      consLen = 1;
      foundCons = true;
    }
    
    if (foundCons) {
      out += consChar;
      i += consLen;
      
      let foundVowel = false;
      let vowelLen = 0;
      
      if (i + 2 <= result.length && vowelSigns[result.substr(i, 2)]) {
        out += vowelSigns[result.substr(i, 2)];
        vowelLen = 2;
        foundVowel = true;
      } else if (i + 1 <= result.length && vowelSigns[result[i]]) {
        out += vowelSigns[result[i]];
        vowelLen = 1;
        foundVowel = true;
      } else if (i + 1 <= result.length && result[i] === 'a') {
        vowelLen = 1;
        foundVowel = true;
      }
      
      if (foundVowel) {
        i += vowelLen;
      } else {
        out += '्';
      }
    } else {
      let foundVowel = false;
      let vowelLen = 0;
      
      if (i + 2 <= result.length && vowels[result.substr(i, 2)]) {
        out += vowels[result.substr(i, 2)];
        vowelLen = 2;
        foundVowel = true;
      } else if (i + 1 <= result.length && vowels[result[i]]) {
        out += vowels[result[i]];
        vowelLen = 1;
        foundVowel = true;
      }
      
      if (foundVowel) {
        i += vowelLen;
      } else {
        if (result[i] === 'ṁ' || result[i] === 'ṃ') {
          out += 'ं';
        } else {
          out += result[i];
        }
        i++;
      }
    }
  }
  
  out = out.replace(/्ं/g, 'ं').replace(/्ः/g, 'ः').replace(/््/g, '्');
  return out;
}

// ----------------------------------------------------
// Startup Initialization
// ----------------------------------------------------
initLocalDatabase();
