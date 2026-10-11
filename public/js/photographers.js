const state = {
  page: 1,
  limit: 6,
  sort: 'newest',
  search: '',
  location: '',
  totalPages: 1,
};

const grid = document.getElementById('photographerGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const locationSelect = document.getElementById('locationSelect');
const pageIndicator = document.getElementById('pageIndicator');
const pageSizeSelect = document.getElementById('pageSizeSelect');
const toast = document.getElementById('toast');

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function formatStats(photographer) {
  return `
    <span><span class="stars">★</span> ${photographer.rating.toFixed(1)} (${photographer.reviewCount})</span>
    <span>${photographer.bookingCount} buổi chụp</span>
  `;
}

function renderCard(photographer, index) {
  const locations = photographer.locations
    .map((location) => `<span class="tag">${escapeHtml(location)}</span>`)
    .join('');
  const verified = photographer.isVerified
    ? '<span class="verified" title="Đã xác minh">✓</span>'
    : '<span class="reviewing-badge">Đang xét duyệt</span>';
  const avatar = photographer.avatar
    ? `<img class="avatar" src="${escapeHtml(photographer.avatar)}" alt="Ảnh đại diện ${escapeHtml(photographer.name)}" loading="lazy" />`
    : `<span class="avatar avatar-initial" aria-label="${escapeHtml(photographer.name)}">${escapeHtml((photographer.name || 'P').trim().charAt(0).toUpperCase())}</span>`;
  const cover = photographer.cover
    ? `<img class="cover-image" src="${escapeHtml(photographer.cover)}" alt="Ảnh bìa của ${escapeHtml(photographer.name)}" loading="lazy" />`
    : '<div class="cover-placeholder"><span>Ảnh bìa chưa cập nhật</span></div>';

  const profileUrl = `/pages/photographer-profile.html?id=${encodeURIComponent(photographer.id)}`;
  return `
    <a class="photographer-card" href="${profileUrl}" style="animation-delay: ${index * 45}ms">
      <div class="cover-wrap">
        ${cover}
        <div class="cover-overlay">
          <span class="cover-action-btn">
            <svg class="cover-action-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            Tham khảo thợ ảnh
          </span>
        </div>
      </div>
      <div class="card-info">
        <div class="profile-row">
          ${avatar}
          <div class="profile-main">
            <div class="profile-name">${escapeHtml(photographer.name)} ${verified}</div>
            <div class="stats">${formatStats(photographer)}</div>
            <div class="tags">${locations}</div>
          </div>
        </div>
        <p class="bio">${escapeHtml(photographer.bio || 'Nhiếp ảnh gia Pdun.Foto')}<br /><strong>Thiết bị:</strong> ${escapeHtml(photographer.equipment || 'Chưa cập nhật')}<br /><strong>Kinh nghiệm:</strong> ${escapeHtml(photographer.experience || 'Chưa cập nhật')}</p>
        ${photographer.specialties ? `<div class="tags mini-specialties">${photographer.specialties.split(/[,;|]/).map((specialty) => specialty.trim()).filter(Boolean).slice(0, 4).map((specialty) => `<span class="tag">${escapeHtml(specialty)}</span>`).join('')}</div>` : ''}
        <div class="card-actions">
          <span class="detail-btn">Xem hồ sơ <span>→</span></span>
        </div>
      </div>
    </a>
  `;
}

function renderPhotographers(photographers) {
  grid.innerHTML = photographers.map(renderCard).join('');
  emptyState.hidden = photographers.length > 0;
}

function updatePagination(pagination) {
  state.totalPages = Math.max(pagination.totalPages, 1);
  pageIndicator.textContent = `${pagination.page}/${state.totalPages}`;
  document.getElementById('firstPageBtn').disabled = state.page <= 1;
  document.getElementById('prevPageBtn').disabled = state.page <= 1;
  document.getElementById('nextPageBtn').disabled = state.page >= state.totalPages;
  document.getElementById('lastPageBtn').disabled = state.page >= state.totalPages;
}

async function loadPhotographers() {
  grid.innerHTML = '<p class="empty-state">Đang tải danh sách...</p>';
  const params = new URLSearchParams({
    page: state.page,
    limit: state.limit,
    sort: state.sort,
    search: state.search,
    location: state.location,
  });

  try {
    const response = await fetch(`/api/photographers?${params}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Không thể tải danh sách.');
    renderPhotographers(result.data);
    updatePagination(result.pagination);
  } catch (error) {
    grid.innerHTML = '';
    emptyState.hidden = false;
    emptyState.textContent = error.message || 'Không thể kết nối tới máy chủ.';
    showToast(error.message || 'Không thể kết nối tới máy chủ.');
  }
}

function debounce(callback, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => callback(...args), delay);
  };
}

searchInput.addEventListener('input', debounce((event) => {
  state.search = event.target.value.trim();
  state.page = 1;
  loadPhotographers();
}, 350));

locationSelect.addEventListener('change', (event) => {
  state.location = event.target.value;
  state.page = 1;
  loadPhotographers();
});

document.querySelectorAll('[data-sort]').forEach((button) => {
  button.addEventListener('click', () => {
    state.sort = button.dataset.sort;
    state.page = 1;
    document.querySelectorAll('[data-sort]').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    loadPhotographers();
  });
});

pageSizeSelect.addEventListener('change', (event) => {
  state.limit = Number(event.target.value);
  state.page = 1;
  loadPhotographers();
});

document.getElementById('firstPageBtn').addEventListener('click', () => { state.page = 1; loadPhotographers(); });
document.getElementById('prevPageBtn').addEventListener('click', () => { if (state.page > 1) state.page -= 1; loadPhotographers(); });
document.getElementById('nextPageBtn').addEventListener('click', () => { if (state.page < state.totalPages) state.page += 1; loadPhotographers(); });
document.getElementById('lastPageBtn').addEventListener('click', () => { state.page = state.totalPages; loadPhotographers(); });

loadPhotographers();

if (typeof io === 'function') {
  try {
    const listSocket = io();
    listSocket.on('photographer_rating_updated', (payload) => {
      if (!payload || !payload.photographerId) return;
      const target = photographers.find((p) => Number(p.id) === Number(payload.photographerId));
      if (target) {
        target.rating = Number(payload.rating);
        target.reviewCount = Number(payload.reviewCount);
        renderPhotographers();
      }
    });
  } catch (err) {
    console.warn('Socket connection error in photographers.js:', err);
  }
}
