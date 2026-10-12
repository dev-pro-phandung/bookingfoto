const state = {
  page: 1,
  limit: 6,
  sort: 'newest',
  search: '',
  location: '',
  experience: '',
  languages: [],
  specialties: [],
  gender: '',
  workStyle: '',
  totalPages: 1,
};

let currentPhotographers = [];

const grid = document.getElementById('photographerGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const pageIndicator = document.getElementById('pageIndicator');
const pageSizeSelect = document.getElementById('pageSizeSelect');
const toast = document.getElementById('toast');

// Filter Drawer Elements
const openFilterBtn = document.getElementById('openFilterBtn');
const closeFilterBtn = document.getElementById('closeFilterBtn');
const filterDrawer = document.getElementById('filterDrawer');
const filterBackdrop = document.getElementById('filterBackdrop');
const activeFilterBadge = document.getElementById('activeFilterBadge');
const resetFilterBtn = document.getElementById('resetFilterBtn');
const applyFilterBtn = document.getElementById('applyFilterBtn');
const drawerLocationSelect = document.getElementById('drawerLocationSelect');
const genderPills = document.getElementById('genderPills');
const workStylePills = document.getElementById('workStylePills');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showToast(message) {
  if (!toast) return;
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

  const genderBadge = photographer.gender === 'Nữ'
    ? '<span class="gender-badge female" title="Giới tính: Nữ">♀</span>'
    : '<span class="gender-badge male" title="Giới tính: Nam">♂</span>';

  const experienceText = photographer.experience || 'Dưới 1 năm';

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
            <div class="profile-name">
              ${escapeHtml(photographer.name)}
              ${genderBadge}
              ${verified}
            </div>
            <div class="stats">
              <span class="exp-badge">${escapeHtml(experienceText)}</span>
              ${formatStats(photographer)}
            </div>
            <div class="tags">${locations}</div>
          </div>
        </div>
        <p class="bio">${escapeHtml(photographer.bio || 'Nhiếp ảnh gia Pdun.Foto')}<br /><strong>Thiết bị:</strong> ${escapeHtml(photographer.equipment || 'Chưa cập nhật')}</p>
        ${photographer.specialties ? `<div class="tags mini-specialties">${photographer.specialties.split(/[,;|]/).map((specialty) => specialty.trim()).filter(Boolean).slice(0, 4).map((specialty) => `<span class="tag">${escapeHtml(specialty)}</span>`).join('')}</div>` : ''}
        <div class="card-actions">
          <span class="detail-btn">Xem hồ sơ <span>→</span></span>
          ${localStorage.getItem('userRole') !== 'photographer' ? `<button type="button" class="card-book-btn" data-id="${photographer.id}"><span>＋</span> Đặt lịch</button>` : ''}
        </div>
      </div>
    </a>
  `;
}

function renderPhotographers(photographers) {
  currentPhotographers = photographers;
  grid.innerHTML = photographers.map(renderCard).join('');
  emptyState.hidden = photographers.length > 0;

  grid.querySelectorAll('.card-book-btn').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const photographerId = btn.dataset.id;
      if (photographerId) {
        sessionStorage.setItem('selectedPhotographerId', String(photographerId));
        window.location.href = `/pages/booking.html?photographerId=${encodeURIComponent(photographerId)}`;
      }
    });
  });
}

function updatePagination(pagination) {
  state.totalPages = Math.max(pagination.totalPages, 1);
  pageIndicator.textContent = `${pagination.page}/${state.totalPages}`;
  document.getElementById('firstPageBtn').disabled = state.page <= 1;
  document.getElementById('prevPageBtn').disabled = state.page <= 1;
  document.getElementById('nextPageBtn').disabled = state.page >= state.totalPages;
  document.getElementById('lastPageBtn').disabled = state.page >= state.totalPages;
}

function updateActiveFilterBadge() {
  let count = 0;
  if (state.experience) count += 1;
  if (state.location) count += 1;
  if (state.gender) count += 1;
  if (state.workStyle) count += 1;
  count += state.languages.length;
  count += state.specialties.length;

  if (activeFilterBadge) {
    activeFilterBadge.hidden = count === 0;
    activeFilterBadge.textContent = String(count);
  }
}

async function loadPhotographers() {
  grid.innerHTML = '<p class="empty-state">Đang tải danh sách...</p>';
  const params = new URLSearchParams({
    page: state.page,
    limit: state.limit,
    sort: state.sort,
  });

  if (state.search) params.set('search', state.search);
  if (state.location) params.set('location', state.location);
  if (state.experience) params.set('experience', state.experience);
  if (state.gender) params.set('gender', state.gender);
  if (state.workStyle) params.set('workStyle', state.workStyle);
  if (state.languages.length) params.set('languages', state.languages.join(','));
  if (state.specialties.length) params.set('specialties', state.specialties.join(','));

  try {
    const response = await fetch(`/api/photographers?${params}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Không thể tải danh sách.');
    renderPhotographers(result.data);
    updatePagination(result.pagination);
    updateActiveFilterBadge();
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

// Search input
if (searchInput) {
  searchInput.addEventListener('input', debounce((event) => {
    state.search = event.target.value.trim();
    state.page = 1;
    loadPhotographers();
  }, 350));
}

// Sort row
document.querySelectorAll('[data-sort]').forEach((button) => {
  button.addEventListener('click', () => {
    state.sort = button.dataset.sort;
    state.page = 1;
    document.querySelectorAll('[data-sort]').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    loadPhotographers();
  });
});

// Page size
if (pageSizeSelect) {
  pageSizeSelect.addEventListener('change', (event) => {
    state.limit = Number(event.target.value);
    state.page = 1;
    loadPhotographers();
  });
}

// Pagination buttons
document.getElementById('firstPageBtn')?.addEventListener('click', () => { state.page = 1; loadPhotographers(); });
document.getElementById('prevPageBtn')?.addEventListener('click', () => { if (state.page > 1) state.page -= 1; loadPhotographers(); });
document.getElementById('nextPageBtn')?.addEventListener('click', () => { if (state.page < state.totalPages) state.page += 1; loadPhotographers(); });
document.getElementById('lastPageBtn')?.addEventListener('click', () => { state.page = state.totalPages; loadPhotographers(); });

// Drawer Control Functions
function openDrawer() {
  if (!filterDrawer || !filterBackdrop) return;
  filterBackdrop.hidden = false;
  requestAnimationFrame(() => {
    filterBackdrop.classList.add('show');
    filterDrawer.classList.add('open');
    filterDrawer.setAttribute('aria-hidden', 'false');
    openFilterBtn?.setAttribute('aria-expanded', 'true');
  });
}

function closeDrawer() {
  if (!filterDrawer || !filterBackdrop) return;
  filterDrawer.classList.remove('open');
  filterDrawer.setAttribute('aria-hidden', 'true');
  filterBackdrop.classList.remove('show');
  openFilterBtn?.setAttribute('aria-expanded', 'false');
  setTimeout(() => {
    filterBackdrop.hidden = true;
  }, 260);
}

if (openFilterBtn) openFilterBtn.addEventListener('click', openDrawer);
if (closeFilterBtn) closeFilterBtn.addEventListener('click', closeDrawer);
if (filterBackdrop) filterBackdrop.addEventListener('click', closeDrawer);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && filterDrawer?.classList.contains('open')) {
    closeDrawer();
  }
});

// Segmented Pills Selection Helper
function setupPillGroup(container) {
  if (!container) return;
  const pills = container.querySelectorAll('.pill-btn');
  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      pills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });
}

setupPillGroup(genderPills);
setupPillGroup(workStylePills);

// Apply Filter Button
if (applyFilterBtn) {
  applyFilterBtn.addEventListener('click', () => {
    const expRadio = document.querySelector('input[name="filter_experience"]:checked');
    state.experience = expRadio ? expRadio.value.trim() : '';

    state.languages = Array.from(document.querySelectorAll('input[name="filter_language"]:checked'))
      .map((cb) => cb.value.trim())
      .filter(Boolean);

    state.specialties = Array.from(document.querySelectorAll('input[name="filter_specialty"]:checked'))
      .map((cb) => cb.value.trim())
      .filter(Boolean);

    const activeGenderBtn = genderPills?.querySelector('.pill-btn.active');
    state.gender = activeGenderBtn ? (activeGenderBtn.dataset.gender || '') : '';

    const activeWorkBtn = workStylePills?.querySelector('.pill-btn.active');
    state.workStyle = activeWorkBtn ? (activeWorkBtn.dataset.workstyle || '') : '';

    state.location = drawerLocationSelect ? drawerLocationSelect.value.trim() : '';

    state.page = 1;
    closeDrawer();
    loadPhotographers();
    showToast('Đã áp dụng bộ lọc thành công!');
  });
}

// Reset Filter Button
if (resetFilterBtn) {
  resetFilterBtn.addEventListener('click', () => {
    const allExpRadio = document.querySelector('input[name="filter_experience"][value=""]');
    if (allExpRadio) allExpRadio.checked = true;

    document.querySelectorAll('input[name="filter_language"]').forEach((cb) => { cb.checked = false; });
    document.querySelectorAll('input[name="filter_specialty"]').forEach((cb) => { cb.checked = false; });

    genderPills?.querySelectorAll('.pill-btn').forEach((p) => {
      p.classList.toggle('active', p.dataset.gender === '');
    });

    workStylePills?.querySelectorAll('.pill-btn').forEach((p) => {
      p.classList.toggle('active', p.dataset.workstyle === '');
    });

    if (drawerLocationSelect) drawerLocationSelect.value = '';

    state.experience = '';
    state.languages = [];
    state.specialties = [];
    state.gender = '';
    state.workStyle = '';
    state.location = '';
    state.page = 1;

    closeDrawer();
    loadPhotographers();
    showToast('Đã đặt lại toàn bộ bộ lọc.');
  });
}

// Initial load
loadPhotographers();

const bookingNotice = sessionStorage.getItem('bookingNotice');
if (bookingNotice) {
  sessionStorage.removeItem('bookingNotice');
  setTimeout(() => {
    showToast(bookingNotice);
  }, 400);
}

// Socket.io Real-time Rating Updates
if (typeof io === 'function') {
  try {
    const listSocket = io();
    listSocket.on('photographer_rating_updated', (payload) => {
      if (!payload || !payload.photographerId) return;
      const target = currentPhotographers.find((p) => Number(p.id) === Number(payload.photographerId));
      if (target) {
        target.rating = Number(payload.rating);
        target.reviewCount = Number(payload.reviewCount);
        renderPhotographers(currentPhotographers);
      }
    });
  } catch (err) {
    console.warn('Socket connection error in photographers.js:', err);
  }
}
