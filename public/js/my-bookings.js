(() => {
  const bookingList = document.getElementById('bookingList');
  const listStatus = document.getElementById('listStatus');
  const filterButtons = [...document.querySelectorAll('[data-status]')];
  const calendarContainer = document.getElementById('bookingCalendarContainer');

  const statusLabels = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    in_progress: 'Đang thực hiện',
    completed: 'Hoàn tất',
    cancelled: 'Đã hủy',
  };

  const dayOfWeekNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

  let bookings = [];
  let currentFilter = 'all';
  let currentViewMode = 'calendar'; // 'calendar' hoặc 'list'
  let currentPerspective = 'photographer'; // 'photographer' hoặc 'client'
  let isPhotographerUser = false;
  let targetPhotographerId = null;

  const now = new Date();
  let currentYear = now.getFullYear();
  let currentMonth = now.getMonth();
  let hasSetInitialMonth = false;

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Chưa xác định' : date.toLocaleDateString('vi-VN');
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value) || 0);
  }

  function parseNotes(value) {
    if (!value) return {};
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : { note: String(value) };
    } catch {
      return { note: String(value) };
    }
  }

  function getBookingDateKey(dateVal) {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function getFilteredBookings() {
    return currentFilter === 'all'
      ? bookings
      : bookings.filter((b) => b.status === currentFilter);
  }

  /* ==========================================================================
     VẼ DANH SÁCH CHI TIẾT (LIST VIEW)
     ========================================================================== */
  function renderBookingsList() {
    const visibleBookings = getFilteredBookings();

    if (!visibleBookings.length) {
      bookingList.innerHTML = `
        <div class="empty-state">
          <strong>${bookings.length ? 'Không có lịch ở trạng thái này' : 'Chưa có buổi chụp nào'}</strong>
          <span>${bookings.length ? 'Thử chọn trạng thái khác để xem các buổi chụp.' : (isPhotographerUser && currentPerspective === 'photographer' ? 'Chưa có lịch khách hàng đặt cho bạn vào thời điểm này.' : 'Khi bạn gửi yêu cầu đặt lịch, thông tin sẽ xuất hiện tại đây.')}</span>
          ${!isPhotographerUser ? '<a href="/pages/booking.html">Khám phá gói chụp</a>' : ''}
        </div>
      `;
      return;
    }

    bookingList.innerHTML = visibleBookings.map((booking) => {
      const details = parseNotes(booking.notes);
      const description = [details.description, details.note].filter(Boolean).join('\n');
      const title = details.title || booking.packageName || 'Buổi chụp';
      const isPhotographerPerspective = isPhotographerUser && currentPerspective === 'photographer';

      return `
        <article class="booking-card">
          <div class="booking-card-main">
            <div class="booking-card-heading">
              <h2>${escapeHtml(title)}</h2>
              <span class="booking-code">${escapeHtml(booking.bookingCode)}</span>
            </div>
            <div class="booking-meta">
              <span><strong>📦 Gói:</strong> ${escapeHtml(booking.packageName)}</span>
              <span><strong>⏰ Giờ:</strong> ${escapeHtml(formatDate(booking.bookingDate))} · ${escapeHtml(String(booking.startTime || '').slice(0, 5))}</span>
              <span><strong>📍 Địa điểm:</strong> ${escapeHtml(booking.location)}</span>
              ${isPhotographerPerspective ? `
                <span><strong>👤 Khách hàng:</strong> ${escapeHtml(booking.clientName || 'Khách hàng')} <small>(${escapeHtml(booking.clientPhone || '')})</small></span>
              ` : `
                <span><strong>📷 Thợ ảnh:</strong> ${escapeHtml(booking.photographerName || 'Chưa chọn nhiếp ảnh gia')}</span>
              `}
            </div>
            ${description ? `<p class="booking-description">${escapeHtml(description)}</p>` : ''}
          </div>
          <div class="booking-aside">
            <span class="booking-price">${formatCurrency(booking.packagePrice)}</span>
            <span class="status-chip ${escapeHtml(booking.status)}">${escapeHtml(statusLabels[booking.status] || booking.status)}</span>
            ${isPhotographerPerspective && booking.clientPhone ? `
              <a href="tel:${escapeHtml(booking.clientPhone)}" class="quick-call-link">📞 Gọi khách</a>
            ` : ''}
          </div>
        </article>
      `;
    }).join('');
  }

  /* ==========================================================================
     VẼ BẢNG LỊCH THÁNG HIỂN THỊ TO (BIG CALENDAR VIEW)
     ========================================================================== */
  function renderCalendar() {
    const gridEl = document.getElementById('calendarDaysGrid');
    const titleEl = document.getElementById('calMonthDisplay');
    const summaryEl = document.getElementById('calTotalMonthBookings');
    if (!gridEl || !titleEl) return;

    titleEl.textContent = `Tháng ${currentMonth + 1} / ${currentYear}`;

    const visibleBookings = getFilteredBookings();

    // Nhóm lịch theo chuỗi ngày YYYY-MM-DD
    const bookingsByDate = {};
    let monthTotalBookings = 0;

    visibleBookings.forEach((b) => {
      const key = getBookingDateKey(b.bookingDate);
      if (!key) return;
      if (!bookingsByDate[key]) bookingsByDate[key] = [];
      bookingsByDate[key].push(b);

      const d = new Date(b.bookingDate);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        monthTotalBookings++;
      }
    });

    if (summaryEl) {
      summaryEl.textContent = `${monthTotalBookings} buổi chụp trong tháng`;
      summaryEl.classList.toggle('has-items', monthTotalBookings > 0);
    }

    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const startDayOffset = (firstDay + 6) % 7; // Thứ 2 = 0

    const totalCells = Math.ceil((startDayOffset + daysInCurrentMonth) / 7) * 7;
    const today = new Date();
    const todayKey = getBookingDateKey(today);

    let html = '';

    for (let i = 0; i < totalCells; i++) {
      const colIndex = i % 7;
      const rowIndex = Math.floor(i / 7);

      let cellYear = currentYear;
      let cellMonth = currentMonth;
      let cellDay = 0;
      let isCurrentMonth = true;

      if (i < startDayOffset) {
        isCurrentMonth = false;
        cellDay = daysInPrevMonth - startDayOffset + i + 1;
        cellMonth = currentMonth - 1;
        if (cellMonth < 0) {
          cellMonth = 11;
          cellYear = currentYear - 1;
        }
      } else if (i >= startDayOffset + daysInCurrentMonth) {
        isCurrentMonth = false;
        cellDay = i - (startDayOffset + daysInCurrentMonth) + 1;
        cellMonth = currentMonth + 1;
        if (cellMonth > 11) {
          cellMonth = 0;
          cellYear = currentYear + 1;
        }
      } else {
        cellDay = i - startDayOffset + 1;
      }

      const mStr = String(cellMonth + 1).padStart(2, '0');
      const dStr = String(cellDay).padStart(2, '0');
      const dateKey = `${cellYear}-${mStr}-${dStr}`;

      const isToday = dateKey === todayKey;
      const dayBookings = bookingsByDate[dateKey] || [];
      const hasBookings = dayBookings.length > 0;
      const isWeekend = colIndex >= 5;

      const alignRightClass = colIndex >= 4 ? 'popover-align-right' : '';
      const alignTopClass = rowIndex >= 3 ? 'popover-align-top' : '';

      html += `
        <div class="cal-day-cell ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'is-today' : ''} ${hasBookings ? 'has-bookings' : ''} ${isWeekend ? 'is-weekend' : ''}" data-date="${dateKey}" tabindex="${hasBookings ? '0' : '-1'}">
          <div class="cal-day-top">
            <span class="cal-day-number">${cellDay}</span>
            ${isToday ? '<span class="today-tag">Hôm nay</span>' : ''}
            ${hasBookings ? `<span class="booking-count-badge">${dayBookings.length} lịch</span>` : ''}
          </div>

          <div class="cal-day-content">
            ${hasBookings ? `
              <div class="cal-event-pills">
                ${dayBookings.slice(0, 2).map((b) => {
                  const label = isPhotographerUser && currentPerspective === 'photographer'
                    ? (b.clientName || 'Khách hàng')
                    : (b.photographerName || b.packageName || 'Buổi chụp');
                  return `
                    <div class="cal-event-pill status-${b.status}" title="${escapeHtml(b.bookingCode)} - ${escapeHtml(label)}">
                      <span class="pill-dot"></span>
                      <span class="pill-time">${escapeHtml(String(b.startTime || '').slice(0, 5))}</span>
                      <span class="pill-name">${escapeHtml(label)}</span>
                    </div>
                  `;
                }).join('')}
                ${dayBookings.length > 2 ? `<div class="cal-event-more">+${dayBookings.length - 2} lịch khác</div>` : ''}
              </div>

              <!-- BẢNG THÔNG TIN CHI TIẾT CỦA BUỔI CHỤP KHI HOVER VÀO NGÀY NÀY -->
              <div class="day-popover-card ${alignRightClass} ${alignTopClass}">
                <div class="popover-header">
                  <div class="popover-title">
                    <span class="popover-calendar-icon">📅</span>
                    <div>
                      <strong>Lịch chụp ngày ${dStr}/${mStr}/${cellYear}</strong>
                      <small>${dayOfWeekNames[new Date(cellYear, cellMonth, cellDay).getDay()]} · ${dayBookings.length} buổi chụp</small>
                    </div>
                  </div>
                  <span class="popover-count-pill">${dayBookings.length} buổi</span>
                </div>

                <div class="popover-body">
                  ${dayBookings.map((b) => {
                    const parsed = parseNotes(b.notes);
                    const desc = [b.title, b.description, parsed.description, parsed.note].filter(Boolean).join(' - ');
                    return `
                      <div class="popover-booking-item status-${b.status}">
                        <div class="booking-item-header">
                          <span class="item-booking-code">🔖 ${escapeHtml(b.bookingCode)}</span>
                          <span class="item-status-badge status-${b.status}">${statusLabels[b.status] || b.status}</span>
                        </div>

                        <div class="booking-item-grid">
                          <div class="item-detail-row">
                            <span class="detail-label">⏰ Giờ chụp:</span>
                            <span class="detail-value highlight-time">${escapeHtml(String(b.startTime || '').slice(0, 5))} ${b.durationMinutes ? `<small class="duration-tag">(${b.durationMinutes} phút)</small>` : ''}</span>
                          </div>

                          ${isPhotographerUser && currentPerspective === 'photographer' ? `
                            <div class="item-detail-row">
                              <span class="detail-label">👤 Khách hàng:</span>
                              <span class="detail-value">
                                <strong>${escapeHtml(b.clientName || 'Chưa có tên')}</strong>
                                ${b.clientPhone ? `<small class="detail-sub">(${escapeHtml(b.clientPhone)})</small>` : ''}
                              </span>
                            </div>
                            ${b.clientPhone ? `
                              <div class="item-detail-row">
                                <span class="detail-label">📞 Liên hệ:</span>
                                <span class="detail-value"><a href="tel:${escapeHtml(b.clientPhone)}" class="call-btn-link">Gọi: ${escapeHtml(b.clientPhone)}</a></span>
                              </div>
                            ` : ''}
                          ` : `
                            <div class="item-detail-row">
                              <span class="detail-label">📷 Thợ chụp:</span>
                              <span class="detail-value"><strong>${escapeHtml(b.photographerName || 'Chưa phân thợ')}</strong></span>
                            </div>
                          `}

                          <div class="item-detail-row">
                            <span class="detail-label">📦 Gói chụp:</span>
                            <span class="detail-value">
                              ${escapeHtml(b.packageName)} — <strong class="price-value">${formatCurrency(b.packagePrice)}</strong>
                            </span>
                          </div>

                          <div class="item-detail-row">
                            <span class="detail-label">📍 Địa điểm:</span>
                            <span class="detail-value">${escapeHtml(b.location || 'Chưa cập nhật')}</span>
                          </div>

                          ${desc ? `
                            <div class="item-detail-row full-width">
                              <span class="detail-label">📝 Chi tiết:</span>
                              <span class="detail-value notes-text">${escapeHtml(desc)}</span>
                            </div>
                          ` : ''}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    gridEl.innerHTML = html;
  }

  function renderView() {
    listStatus.textContent = bookings.length ? `${bookings.length} buổi chụp` : '';
    renderCalendar();
    renderBookingsList();
  }

  function setViewMode(mode) {
    currentViewMode = mode;
    const isCal = mode === 'calendar';
    document.querySelectorAll('.view-mode-pill').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    if (calendarContainer) calendarContainer.hidden = !isCal;
    if (bookingList) bookingList.hidden = isCal;
  }

  /* ==========================================================================
     TẢI DỮ LIỆU TỪ MÁY CHỦ (THEO ID THỢ HOẶC TÀI KHOẢN ĐĂNG NHẬP)
     ========================================================================== */
  async function loadBookings() {
    const token = localStorage.getItem('token');
    if (!token) {
      listStatus.textContent = 'Bạn cần đăng nhập để xem lịch đặt.';
      bookingList.hidden = false;
      bookingList.innerHTML = '<div class="empty-state"><strong>Chưa đăng nhập</strong><span>Lịch đặt được lưu theo tài khoản của bạn.</span><a href="/pages/auth.html">Đăng nhập</a></div>';
      if (calendarContainer) calendarContainer.hidden = true;
      return;
    }

    listStatus.textContent = 'Đang tải dữ liệu lịch chụp...';

    const urlParams = new URLSearchParams(window.location.search);
    const queryPhotographerId = urlParams.get('photographerId');
    if (queryPhotographerId) {
      targetPhotographerId = queryPhotographerId;
    }

    // Kiểm tra thông tin tài khoản
    let role = localStorage.getItem('userRole') || '';
    let photographerId = localStorage.getItem('photographerId') || targetPhotographerId;

    try {
      // Xác thực vai trò qua API me
      const meRes = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.user) {
          role = meData.user.role || role;
          photographerId = meData.user.photographerId || photographerId;
          if (role) localStorage.setItem('userRole', role);
          if (photographerId) localStorage.setItem('photographerId', photographerId);
        }
      }
    } catch {
    }

    isPhotographerUser = role === 'photographer' || Boolean(photographerId) || Boolean(targetPhotographerId);

    // Cập nhật giao diện theo vai trò thợ ảnh
    const eyebrowEl = document.getElementById('pageEyebrow');
    const titleEl = document.getElementById('pageTitle');
    const subtitleEl = document.getElementById('pageSubtitle');
    const roleSwitchEl = document.getElementById('photographerRoleSwitch');

    if (isPhotographerUser) {
      if (roleSwitchEl) roleSwitchEl.hidden = false;
      if (currentPerspective === 'photographer') {
        if (eyebrowEl) eyebrowEl.textContent = 'PDUN.FOTO / LỊCH CHỤP CỦA THỢ';
        if (titleEl) titleEl.textContent = 'Lịch chụp của tôi';
        if (subtitleEl) subtitleEl.textContent = 'Theo dõi lịch trình các buổi chụp và thông tin khách hàng đã đặt.';
      } else {
        if (eyebrowEl) eyebrowEl.textContent = 'PDUN.FOTO / TÀI KHOẢN';
        if (titleEl) titleEl.textContent = 'Lịch tôi đã đặt';
        if (subtitleEl) subtitleEl.textContent = 'Các buổi chụp bạn đã đặt với tư cách khách hàng.';
      }
    }

    try {
      let endpoint = '/api/bookings/mine';
      if (isPhotographerUser && currentPerspective === 'photographer') {
        endpoint = '/api/bookings/photographer/mine';
        if (targetPhotographerId) {
          endpoint += `?photographerId=${encodeURIComponent(targetPhotographerId)}`;
        }
      }

      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        // Nếu tải theo photographer thất bại (ví dụ tài khoản không phải thợ), fallback sang mine
        if (endpoint.includes('/photographer/mine')) {
          const fallbackRes = await fetch('/api/bookings/mine', { headers: { Authorization: `Bearer ${token}` } });
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            bookings = fallbackData.data || [];
            currentPerspective = 'client';
            renderView();
            return;
          }
        }
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Không thể tải lịch đặt.');
      }

      const result = await response.json();
      bookings = result.data || [];

      // Tự động đưa lịch về tháng có buổi chụp gần nhất trong lần đầu tải
      if (!hasSetInitialMonth && bookings.length > 0) {
        const firstValidBooking = bookings.find((b) => {
          const d = new Date(b.bookingDate);
          return !Number.isNaN(d.getTime());
        });
        if (firstValidBooking) {
          const d = new Date(firstValidBooking.bookingDate);
          currentYear = d.getFullYear();
          currentMonth = d.getMonth();
          hasSetInitialMonth = true;
        }
      }

      renderView();
    } catch (error) {
      console.error('Lỗi tải lịch chụp:', error);
      listStatus.textContent = error.message || 'Không thể kết nối tới máy chủ.';
    }
  }

  function initEvents() {
    // Điều hướng tháng
    const prevBtn = document.getElementById('calPrevMonth');
    const nextBtn = document.getElementById('calNextMonth');
    const todayBtn = document.getElementById('calTodayBtn');
    const refreshBtn = document.getElementById('refreshScheduleBtn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
          currentMonth = 11;
          currentYear--;
        }
        renderCalendar();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
          currentMonth = 0;
          currentYear++;
        }
        renderCalendar();
      });
    }

    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        const t = new Date();
        currentYear = t.getFullYear();
        currentMonth = t.getMonth();
        renderCalendar();
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', loadBookings);
    }

    // Bộ lọc trạng thái
    filterButtons.forEach((button) => {
      button.addEventListener('click', () => {
        currentFilter = button.dataset.status;
        filterButtons.forEach((item) => item.classList.toggle('active', item === button));
        renderView();
      });
    });

    // Chuyển đổi chế độ xem: Bảng lịch vs Danh sách
    const toggleCalBtn = document.getElementById('toggleCalendarViewBtn');
    const toggleListBtn = document.getElementById('toggleListViewBtn');
    if (toggleCalBtn) toggleCalBtn.addEventListener('click', () => setViewMode('calendar'));
    if (toggleListBtn) toggleListBtn.addEventListener('click', () => setViewMode('list'));

    // Chuyển đổi góc nhìn cho thợ ảnh
    const viewPhotographerShootsBtn = document.getElementById('viewPhotographerShootsBtn');
    const viewClientShootsBtn = document.getElementById('viewClientShootsBtn');

    if (viewPhotographerShootsBtn) {
      viewPhotographerShootsBtn.addEventListener('click', () => {
        currentPerspective = 'photographer';
        viewPhotographerShootsBtn.classList.add('active');
        if (viewClientShootsBtn) viewClientShootsBtn.classList.remove('active');
        loadBookings();
      });
    }

    if (viewClientShootsBtn) {
      viewClientShootsBtn.addEventListener('click', () => {
        currentPerspective = 'client';
        viewClientShootsBtn.classList.add('active');
        if (viewPhotographerShootsBtn) viewPhotographerShootsBtn.classList.remove('active');
        loadBookings();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    loadBookings();
  });
})();
