const token = localStorage.getItem('token') || '';
const adminStatus = document.getElementById('adminStatus');
const photographerDialog = document.getElementById('photographerDialog');
const photographerDetail = document.getElementById('photographerDetail');
const state = { photographers: [], activeView: 'reviewsView' };

const bookingLabels = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  in_progress: 'Đang chụp',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};
const statusLabels = { pending: 'Chờ duyệt', active: 'Đang hoạt động', inactive: 'Ngừng hoạt động' };

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value) {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('vi-VN');
}

function formatMoney(value) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value) || 0);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const result = await response.json();
  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/pages/auth.html';
    throw new Error('Phiên đăng nhập đã hết hạn.');
  }
  if (!response.ok || !result.success) throw new Error(result.message || 'Không thể tải dữ liệu quản trị.');
  return result.data !== undefined ? result.data : result;
}

function setStatus(message, isError = true) {
  adminStatus.textContent = message;
  adminStatus.classList.toggle('success', !isError);
}

function imageOrPlaceholder(url, className, alt) {
  return url
    ? `<img class="${className}" src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy" />`
    : `<div class="${className} image-placeholder" role="img" aria-label="${escapeHtml(alt)}">P</div>`;
}

function statusPill(status, labels = statusLabels) {
  return `<span class="status-pill ${escapeHtml(status)}">${escapeHtml(labels[status] || status)}</span>`;
}

async function loadDashboard() {
  const data = await api('/api/admin/dashboard');
  document.getElementById('metricPhotographers').textContent = Number(data.photographers.total || 0).toLocaleString('vi-VN');
  document.getElementById('metricPending').textContent = Number(data.photographers.pending || 0).toLocaleString('vi-VN');
  document.getElementById('metricActive').textContent = Number(data.photographers.active || 0).toLocaleString('vi-VN');
  document.getElementById('metricBookings').textContent = Number(data.bookings.total || 0).toLocaleString('vi-VN');
  document.getElementById('metricCompleted').textContent = Number(data.bookings.completed || 0).toLocaleString('vi-VN');
  document.getElementById('metricClients').textContent = Number(data.clients.total || 0).toLocaleString('vi-VN');
  document.getElementById('pendingTabCount').textContent = Number(data.photographers.pending || 0).toLocaleString('vi-VN');
}

async function loadPhotographers() {
  const result = await api('/api/admin/photographers?status=all');
  state.photographers = result;
  populateBookingPhotographerOptions(result);
  renderReviewQueue(result.filter((photographer) => photographer.status === 'pending'));
  const status = document.getElementById('photographerStatusFilter').value;
  renderPhotographerTable(status === 'all' ? result : result.filter((photographer) => photographer.status === status));
}

function populateBookingPhotographerOptions(photographers) {
  const select = document.getElementById('bookingPhotographerFilter');
  const selected = select.value;
  const rows = [...photographers].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  select.innerHTML = '<option value="">Tất cả thợ</option>' + rows.map((photographer) =>
    `<option value="${photographer.id}">${escapeHtml(photographer.name)}</option>`,
  ).join('');
  if (rows.some((photographer) => String(photographer.id) === selected)) select.value = selected;
}

function renderReviewQueue(photographers) {
  const queue = document.getElementById('reviewQueue');
  document.getElementById('reviewResultCount').textContent = `${photographers.length} hồ sơ`;
  if (!photographers.length) {
    queue.innerHTML = '<p class="empty-state">Không có hồ sơ đang chờ xét duyệt.</p>';
    return;
  }
  queue.innerHTML = photographers.map((photographer) => `
    <article class="review-row">
      ${imageOrPlaceholder(photographer.cover, 'review-thumb', `Ảnh ${photographer.name}`)}
      <div><p class="review-name">${escapeHtml(photographer.name)}</p><div class="review-meta">${escapeHtml(photographer.location)} · ${escapeHtml(photographer.experience)}</div><div class="review-meta">Gửi ngày ${escapeHtml(formatDate(photographer.createdAt))}</div></div>
      <div class="review-contact">${escapeHtml(photographer.email)}<br />${escapeHtml(photographer.phone)}<br />${escapeHtml(photographer.equipment || 'Chưa có thiết bị')}</div>
      <div class="review-stats"><span>${photographer.photoCount} ảnh bộ sưu tập</span><span>${photographer.bookingCount} lịch · ${photographer.completedBookingCount} buổi hoàn thành</span></div>
      <div class="row-actions"><button class="button-secondary" type="button" data-detail-id="${photographer.id}">Chi tiết</button><button class="button-primary" type="button" data-activate-id="${photographer.id}">Active</button></div>
    </article>
  `).join('');
}

function renderPhotographerTable(photographers) {
  const tbody = document.getElementById('photographersTable');
  document.getElementById('photographersEmpty').hidden = photographers.length > 0;
  tbody.innerHTML = photographers.map((photographer) => `
    <tr>
      <td><div class="table-person">${imageOrPlaceholder(photographer.cover, 'table-avatar', `Ảnh ${photographer.name}`)}<div><strong>${escapeHtml(photographer.name)}</strong><small>${escapeHtml(photographer.experience)}</small></div></div></td>
      <td>${escapeHtml(photographer.email)}<br />${escapeHtml(photographer.phone)}</td>
      <td>${escapeHtml(photographer.location)}</td>
      <td><strong>${photographer.completedBookingCount}</strong> hoàn thành<br /><small>${photographer.bookingCount} tổng lịch</small></td>
      <td>★ ${Number(photographer.rating).toFixed(1)}</td>
      <td>${statusPill(photographer.status)}</td>
      <td><button class="row-detail-button" type="button" data-detail-id="${photographer.id}">Xem chi tiết</button></td>
    </tr>
  `).join('');
  tbody.querySelectorAll('[data-detail-id]').forEach((button) => button.addEventListener('click', () => showPhotographerDetail(button.dataset.detailId)));
}

async function loadBookings() {
  const parameters = new URLSearchParams();
  const photographerId = document.getElementById('bookingPhotographerFilter').value;
  const status = document.getElementById('bookingStatusFilter').value;
  if (photographerId) parameters.set('photographerId', photographerId);
  if (status) parameters.set('status', status);
  const rows = await api(`/api/admin/bookings?${parameters}`);
  const tbody = document.getElementById('bookingsTable');
  document.getElementById('bookingsEmpty').hidden = rows.length > 0;
  tbody.innerHTML = rows.map((booking) => `
    <tr>
      <td><strong>${escapeHtml(formatDate(booking.bookingDate))}</strong><br />${escapeHtml(String(booking.startTime || '').slice(0, 5))}</td>
      <td>${escapeHtml(booking.bookingCode)}</td>
      <td>${escapeHtml(booking.photographerName || 'Chưa phân thợ')}</td>
      <td>${escapeHtml(booking.clientName)}<br /><small>${escapeHtml(booking.clientPhone)}</small></td>
      <td>${escapeHtml(booking.packageName)}<br /><small>${escapeHtml(formatMoney(booking.packagePrice))}</small></td>
      <td>${escapeHtml(booking.location)}</td>
      <td>${statusPill(booking.status, bookingLabels)}</td>
    </tr>
  `).join('');
}

async function showPhotographerDetail(id) {
  setStatus('');
  try {
    const photographer = await api(`/api/admin/photographers/${encodeURIComponent(id)}`);
    const actions = photographer.status === 'pending'
      ? `<button class="button-danger" type="button" data-status="inactive">Từ chối / ngừng hoạt động</button><button class="button-primary" type="button" data-status="active">Active tài khoản</button>`
      : photographer.status === 'active'
        ? '<button class="button-danger" type="button" data-status="inactive">Ngừng hoạt động</button>'
        : '<button class="button-primary" type="button" data-status="active">Kích hoạt lại</button>';
    photographerDetail.innerHTML = `
      <div class="detail-content">
        <div class="detail-header">${imageOrPlaceholder(photographer.cover, 'detail-cover', `Ảnh ${photographer.name}`)}<div><h2>${escapeHtml(photographer.name)}</h2><p>${statusPill(photographer.status)}<br />Mã thợ #${photographer.id} · Tham gia ${escapeHtml(formatDate(photographer.accountCreatedAt))}</p></div></div>
        <div class="detail-grid">
          <div class="detail-field"><span>Email</span><strong>${escapeHtml(photographer.email)}</strong></div>
          <div class="detail-field"><span>Số điện thoại</span><strong>${escapeHtml(photographer.phone)}</strong></div>
          <div class="detail-field"><span>Ngày sinh</span><strong>${escapeHtml(formatDate(photographer.dob))}</strong></div>
          <div class="detail-field"><span>Khu vực hoạt động</span><strong>${escapeHtml(photographer.location)}</strong></div>
          <div class="detail-field"><span>Kinh nghiệm</span><strong>${escapeHtml(photographer.experience)}</strong></div>
          <div class="detail-field"><span>Thiết bị</span><strong>${escapeHtml(photographer.equipment)}</strong></div>
          <div class="detail-field"><span>Buổi chụp hoàn thành</span><strong>${photographer.completedBookingCount}</strong></div>
          <div class="detail-field"><span>Tổng lịch đã nhận</span><strong>${photographer.bookingCount}</strong></div>
          <div class="detail-field"><span>Thể loại</span><strong>${escapeHtml(photographer.specialties || 'Chưa cập nhật')}</strong></div>
          <div class="detail-field"><span>Ngôn ngữ</span><strong>${escapeHtml(photographer.languages || 'Chưa cập nhật')}</strong></div>
          <div class="detail-field"><span>Mô hình làm việc</span><strong>${escapeHtml(photographer.workStyle || 'Chưa cập nhật')}</strong></div>
          <div class="detail-field"><span>Giới thiệu</span><strong>${escapeHtml(photographer.bio || 'Chưa cập nhật')}</strong></div>
        </div>
        <h3 class="detail-section-title">Bộ ảnh (${photographer.photos.length})</h3>
        <div class="detail-photos">${photographer.photos.map((photo, index) => `<img src="${escapeHtml(photo.url)}" alt="Ảnh ${index + 1} của ${escapeHtml(photographer.name)}" loading="lazy" />`).join('') || '<p>Chưa tải ảnh.</p>'}</div>
        <div class="detail-actions">${actions}</div>
      </div>
    `;
    photographerDetail.querySelectorAll('[data-status]').forEach((button) => button.addEventListener('click', async () => {
      await updateStatus(photographer.id, button.dataset.status);
      if (photographerDialog.open) photographerDialog.close();
    }));
    photographerDialog.showModal();
  } catch (error) {
    setStatus(error.message);
  }
}

async function updateStatus(id, status) {
  const verb = status === 'active' ? 'kích hoạt' : 'ngừng hoạt động';
  if (!window.confirm(`Bạn có chắc muốn ${verb} tài khoản thợ ảnh này?`)) return;
  try {
    const result = await api(`/api/admin/photographers/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    const message = result?.message || (status === 'active' ? 'Đã kích hoạt tài khoản thợ ảnh.' : 'Đã ngừng kích hoạt tài khoản thợ ảnh.');
    setStatus(message, false);
    await refreshData();
  } catch (error) {
    setStatus(error.message);
  }
}

async function refreshData() {
  setStatus('');
  try {
    await Promise.all([loadDashboard(), loadPhotographers()]);
    if (state.activeView === 'bookingsView') await loadBookings();
  } catch (error) {
    setStatus(error.message);
    if (error.message.includes('quyền truy cập')) {
      document.querySelector('.admin-shell').innerHTML = `<section class="access-denied"><h1>Không có quyền truy cập</h1><p>${escapeHtml(error.message)}</p><a href="/">Về trang chủ</a></section>`;
    }
  }
}

function setActiveView(viewId) {
  state.activeView = viewId;
  document.querySelectorAll('.admin-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.view === viewId));
  document.querySelectorAll('.admin-view').forEach((view) => { view.hidden = view.id !== viewId; });
  if (viewId === 'photographersView' && !state.photographers.length) loadPhotographers().catch((error) => setStatus(error.message));
  if (viewId === 'bookingsView') loadBookings().catch((error) => setStatus(error.message));
}

document.getElementById('adminName').textContent = localStorage.getItem('userFullName') || 'Quản trị viên';
document.getElementById('logoutButton').addEventListener('click', () => {
  ['token', 'userId', 'userRole', 'userFullName'].forEach((key) => localStorage.removeItem(key));
  window.location.href = '/pages/auth.html';
});
document.getElementById('refreshButton').addEventListener('click', refreshData);
document.getElementById('photographerStatusFilter').addEventListener('change', (event) => {
  const filtered = event.target.value === 'all'
    ? state.photographers
    : state.photographers.filter((photographer) => photographer.status === event.target.value);
  renderPhotographerTable(filtered);
});
document.getElementById('bookingPhotographerFilter').addEventListener('change', () => loadBookings().catch((error) => setStatus(error.message)));
document.getElementById('bookingStatusFilter').addEventListener('change', () => loadBookings().catch((error) => setStatus(error.message)));
document.querySelectorAll('.admin-tab').forEach((tab) => tab.addEventListener('click', () => setActiveView(tab.dataset.view)));
document.getElementById('photographerDialog').addEventListener('click', (event) => {
  if (event.target === photographerDialog) photographerDialog.close();
});

document.getElementById('reviewQueue').addEventListener('click', (event) => {
  const detailButton = event.target.closest('[data-detail-id]');
  const activeButton = event.target.closest('[data-activate-id]');
  if (detailButton) showPhotographerDetail(detailButton.dataset.detailId);
  if (activeButton) updateStatus(activeButton.dataset.activateId, 'active');
});

document.getElementById('photographersTable').addEventListener('click', (event) => {
  const detailButton = event.target.closest('[data-detail-id]');
  if (detailButton) showPhotographerDetail(detailButton.dataset.detailId);
});

refreshData();
