const API_BASE = 'https://www.googleapis.com/youtube/v3';

// ─── State ────────────────────────────────────────────────
let apiKey = localStorage.getItem('yt_api_key') || '';
let currentCategory = '쇼핑';
let currentQuery = '쇼핑 추천 하울';
let currentSort = 'viewCount';
let channelCache = {};  // { category: [channelData] }

const SNAPSHOT_KEY = 'yt_snapshots';  // localStorage key for daily tracking

// ─── DOM ──────────────────────────────────────────────────
const apiKeyInput  = document.getElementById('apiKeyInput');
const saveKeyBtn   = document.getElementById('saveKeyBtn');
const keyStatus    = document.getElementById('keyStatus');
const refreshBtn   = document.getElementById('refreshBtn');
const sortSelect   = document.getElementById('sortSelect');
const channelGrid  = document.getElementById('channelGrid');
const emptyState   = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const errorState   = document.getElementById('errorState');
const statsBar     = document.getElementById('statsBar');

// ─── Init ─────────────────────────────────────────────────
if (apiKey) {
  apiKeyInput.value = apiKey;
  keyStatus.textContent = '✓ 저장됨';
}

saveKeyBtn.addEventListener('click', () => {
  const val = apiKeyInput.value.trim();
  if (!val) { showKeyError('API 키를 입력해주세요'); return; }
  apiKey = val;
  localStorage.setItem('yt_api_key', val);
  keyStatus.textContent = '✓ 저장됨';
  keyStatus.className = 'key-status';
  fetchChannels();
});

apiKeyInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveKeyBtn.click();
});

refreshBtn.addEventListener('click', () => {
  if (!apiKey) return;
  channelCache[currentCategory] = null;
  fetchChannels();
});

sortSelect.addEventListener('change', () => {
  currentSort = sortSelect.value;
  if (channelCache[currentCategory]) {
    renderChannels(channelCache[currentCategory]);
  }
});

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentCategory = tab.dataset.category;
    currentQuery = tab.dataset.query;
    if (apiKey) fetchChannels();
  });
});

// ─── API ──────────────────────────────────────────────────
async function fetchChannels() {
  if (!apiKey) { showEmpty(); return; }

  // Use cache if available
  if (channelCache[currentCategory]) {
    renderChannels(channelCache[currentCategory]);
    return;
  }

  showLoading();

  try {
    // Step 1: Search for channels
    const searchRes = await apiFetch('/search', {
      part: 'snippet',
      q: currentQuery,
      type: 'channel',
      maxResults: 15,
      order: 'viewCount',
      regionCode: 'KR',
      relevanceLanguage: 'ko',
    });

    const channelIds = searchRes.items.map(i => i.snippet.channelId).join(',');

    // Step 2: Get channel statistics
    const statsRes = await apiFetch('/channels', {
      part: 'snippet,statistics,contentDetails',
      id: channelIds,
      hl: 'ko',
    });

    // Step 3: For each channel get latest video
    const channelData = await Promise.all(
      statsRes.items.map(ch => enrichWithLatestVideo(ch))
    );

    // Apply daily change tracking
    applyDailyChange(channelData);

    // Save snapshot
    saveSnapshot(currentCategory, channelData);

    channelCache[currentCategory] = channelData;
    renderChannels(channelData);

  } catch (err) {
    showError(err);
  }
}

async function enrichWithLatestVideo(channel) {
  try {
    const res = await apiFetch('/search', {
      part: 'snippet',
      channelId: channel.id,
      order: 'date',
      maxResults: 1,
      type: 'video',
    });
    channel._latestVideo = res.items[0]?.snippet?.title || null;
  } catch {
    channel._latestVideo = null;
  }
  return channel;
}

async function apiFetch(endpoint, params) {
  const url = new URL(API_BASE + endpoint);
  url.searchParams.set('key', apiKey);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

// ─── Daily Change Tracking ────────────────────────────────
function saveSnapshot(category, channels) {
  const snapshots = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '{}');
  const today = todayKey();
  if (!snapshots[today]) snapshots[today] = {};
  snapshots[today][category] = channels.map(ch => ({
    id: ch.id,
    viewCount: Number(ch.statistics?.viewCount || 0),
    subscriberCount: Number(ch.statistics?.subscriberCount || 0),
  }));
  // Keep only last 7 days
  const keys = Object.keys(snapshots).sort();
  if (keys.length > 7) delete snapshots[keys[0]];
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots));
}

function applyDailyChange(channels) {
  const snapshots = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '{}');
  const yesterday = yesterdayKey();
  const prevData = snapshots[yesterday]?.[currentCategory] || [];
  const prevMap = Object.fromEntries(prevData.map(d => [d.id, d]));

  channels.forEach(ch => {
    const prev = prevMap[ch.id];
    const cur = Number(ch.statistics?.viewCount || 0);
    if (prev) {
      ch._dailyViewChange = cur - prev.viewCount;
    } else {
      ch._dailyViewChange = null;
    }
  });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ─── Render ───────────────────────────────────────────────
function renderChannels(channels) {
  hideAll();
  channelGrid.style.display = 'grid';
  statsBar.style.display = 'flex';

  const sorted = [...channels].sort((a, b) => {
    if (currentSort === 'viewCount') {
      return Number(b.statistics?.viewCount || 0) - Number(a.statistics?.viewCount || 0);
    }
    if (currentSort === 'subscriberCount') {
      return Number(b.statistics?.subscriberCount || 0) - Number(a.statistics?.subscriberCount || 0);
    }
    if (currentSort === 'dailyChange') {
      return (b._dailyViewChange || 0) - (a._dailyViewChange || 0);
    }
    return 0;
  });

  document.getElementById('totalChannels').textContent = sorted.length;
  document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  const tracked = sorted.filter(c => c._dailyViewChange !== null).length;
  document.getElementById('trackingStatus').textContent =
    tracked > 0 ? `${tracked}개 채널 추적 중` : '첫 실행 (내일부터 변화 표시)';

  channelGrid.innerHTML = sorted.map((ch, i) => buildCard(ch, i)).join('');
}

function buildCard(ch, index) {
  const stats = ch.statistics || {};
  const views = Number(stats.viewCount || 0);
  const subs  = Number(stats.subscriberCount || 0);
  const vids  = Number(stats.videoCount || 0);

  const rankClass = index === 0 ? 'top' : index === 1 ? 'top2' : index === 2 ? 'top3' : '';
  const rankLabel = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1;

  const thumb = ch.snippet?.thumbnails?.medium?.url || ch.snippet?.thumbnails?.default?.url;
  const thumbEl = thumb
    ? `<img class="channel-thumb" src="${thumb}" alt="" loading="lazy" />`
    : `<div class="channel-thumb-placeholder">${(ch.snippet?.title || '?')[0]}</div>`;

  const dailyChange = ch._dailyViewChange;
  let changeEl = '';
  if (dailyChange === null) {
    changeEl = `<span class="daily-change change-none">-</span>`;
  } else if (dailyChange > 0) {
    changeEl = `<span class="daily-change change-up">▲ ${fmt(dailyChange)}</span>`;
  } else if (dailyChange < 0) {
    changeEl = `<span class="daily-change change-down">▼ ${fmt(Math.abs(dailyChange))}</span>`;
  } else {
    changeEl = `<span class="daily-change change-none">= 변화없음</span>`;
  }

  const latestVideo = ch._latestVideo
    ? `<div class="card-recent">
        <div class="recent-label">최근 업로드</div>
        <div class="recent-video">🎬 ${escapeHtml(ch._latestVideo)}</div>
       </div>`
    : '';

  const channelUrl = `https://www.youtube.com/channel/${ch.id}`;

  return `
    <a class="channel-card" href="${channelUrl}" target="_blank" rel="noopener">
      <div class="card-header">
        <div class="rank-badge ${rankClass}">${rankLabel}</div>
        ${thumbEl}
        <div class="channel-info">
          <div class="channel-name">${escapeHtml(ch.snippet?.title || '-')}</div>
          <div class="channel-handle">${escapeHtml(ch.snippet?.customUrl || ch.id)}</div>
        </div>
      </div>
      <div class="card-stats">
        <div class="stat-box">
          <div class="label">총 조회수</div>
          <div class="value">${fmt(views)}</div>
        </div>
        <div class="stat-box">
          <div class="label">구독자</div>
          <div class="value">${stats.hiddenSubscriberCount ? '비공개' : fmt(subs)}</div>
        </div>
        <div class="stat-box">
          <div class="label">일별 변화</div>
          <div class="value">${changeEl}</div>
        </div>
      </div>
      ${latestVideo}
    </a>
  `;
}

// ─── UI States ────────────────────────────────────────────
function showEmpty()   { hideAll(); emptyState.style.display = 'block'; statsBar.style.display = 'none'; }
function showLoading() { hideAll(); loadingState.style.display = 'block'; }
function showError(err) {
  hideAll();
  errorState.style.display = 'block';
  document.getElementById('errorTitle').textContent = 'API 오류';
  document.getElementById('errorMsg').textContent = err.message || '알 수 없는 오류가 발생했습니다.';
  keyStatus.textContent = '✗ 오류';
  keyStatus.className = 'key-status error';
}
function hideAll() {
  emptyState.style.display = 'none';
  loadingState.style.display = 'none';
  errorState.style.display = 'none';
  channelGrid.style.display = 'none';
}

function showKeyError(msg) {
  keyStatus.textContent = msg;
  keyStatus.className = 'key-status error';
}

function retryFetch() {
  channelCache[currentCategory] = null;
  fetchChannels();
}

// ─── Utils ────────────────────────────────────────────────
function fmt(n) {
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '억';
  if (n >= 10000000)  return (n / 10000000).toFixed(1) + '천만';
  if (n >= 10000)     return Math.round(n / 10000) + '만';
  if (n >= 1000)      return (n / 1000).toFixed(1) + 'k';
  return n.toLocaleString();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Start ────────────────────────────────────────────────
if (apiKey) {
  fetchChannels();
} else {
  showEmpty();
}
