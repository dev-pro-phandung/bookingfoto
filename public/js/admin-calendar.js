(() => {
  const bookingLabels = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    in_progress: 'Đang chụp',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
  };

  const dayOfWeekNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

  const now = new Date();
  let currentYear = now.getFullYear();
  let currentMonth = now.getMonth(); // 0-indexed (0 = Jan, 9 = Oct)
  let allBookings = [];
  let isInitialized = false;

  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatMoney(value) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value) || 0);
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

  function renderCalendar() {
    const gridEl = document.getElementById('calendarDaysGrid');
    const titleEl = document.getElementById('calMonthDisplay');
    const summaryEl = document.getElementById('calTotalMonthBookings');
    if (!gridEl || !titleEl) return;

    titleEl.textContent = `Tháng ${currentMonth + 1} / ${currentYear}`;

    // Nhóm lịch theo chuỗi ngày YYYY-MM-DD
    const bookingsByDate = {};
    let monthTotalBookings = 0;

    allBookings.forEach((b) => {
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

    // Tính toán số ngày trong tháng và ngày bắt đầu (Thứ 2 = 0, Chủ nhật = 6)
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
    
    // Ngày 1 trong tháng là thứ mấy (0: CN, 1: T2, ..., 6: T7)
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    // Chuyển sang tuần bắt đầu từ Thứ 2:
    const startDayOffset = (firstDay + 6) % 7;

    const totalCells = Math.ceil((startDayOffset + daysInCurrentMonth) / 7) * 7;
    const today = new Date();
    const todayKey = getBookingDateKey(today);

    let html = '';

    for (let i = 0; i < totalCells; i++) {
      const colIndex = i % 7; // 0: Thứ 2, 6: Chủ nhật
      const rowIndex = Math.floor(i / 7);

      let cellYear = currentYear;
      let cellMonth = currentMonth;
      let cellDay = 0;
      let isCurrentMonth = true;

      if (i < startDayOffset) {
        // Ngày của tháng trước
        isCurrentMonth = false;
        cellDay = daysInPrevMonth - startDayOffset + i + 1;
        cellMonth = currentMonth - 1;
        if (cellMonth < 0) {
          cellMonth = 11;
          cellYear = currentYear - 1;
        }
      } else if (i >= startDayOffset + daysInCurrentMonth) {
        // Ngày của tháng sau
        isCurrentMonth = false;
        cellDay = i - (startDayOffset + daysInCurrentMonth) + 1;
        cellMonth = currentMonth + 1;
        if (cellMonth > 11) {
          cellMonth = 0;
          cellYear = currentYear + 1;
        }
      } else {
        // Ngày thuộc tháng hiện tại
        cellDay = i - startDayOffset + 1;
      }

      const mStr = String(cellMonth + 1).padStart(2, '0');
      const dStr = String(cellDay).padStart(2, '0');
      const dateKey = `${cellYear}-${mStr}-${dStr}`;

      const isToday = dateKey === todayKey;
      const dayBookings = bookingsByDate[dateKey] || [];
      const hasBookings = dayBookings.length > 0;
      const isWeekend = colIndex >= 5;

      // Các class bổ trợ vị trí popover để không bị lệch mép màn hình
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
                ${dayBookings.slice(0, 2).map((b) => `
                  <div class="cal-event-pill status-${b.status}" title="${escapeHtml(b.bookingCode)}">
                    <span class="pill-dot"></span>
                    <span class="pill-time">${escapeHtml(String(b.startTime || '').slice(0, 5))}</span>
                    <span class="pill-name">${escapeHtml(b.photographerName || 'Thợ ảnh')}</span>
                  </div>
                `).join('')}
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
                  ${dayBookings.map((b) => `
                    <div class="popover-booking-item status-${b.status}">
                      <div class="booking-item-header">
                        <span class="item-booking-code">🔖 ${escapeHtml(b.bookingCode)}</span>
                        <span class="item-status-badge status-${b.status}">${bookingLabels[b.status] || b.status}</span>
                      </div>

                      <div class="booking-item-grid">
                        <div class="item-detail-row">
                          <span class="detail-label">⏰ Giờ chụp:</span>
                          <span class="detail-value highlight-time">${escapeHtml(String(b.startTime || '').slice(0, 5))}</span>
                        </div>
                        <div class="item-detail-row">
                          <span class="detail-label">📷 Thợ chụp:</span>
                          <span class="detail-value"><strong>${escapeHtml(b.photographerName || 'Chưa phân thợ')}</strong></span>
                        </div>
                        <div class="item-detail-row">
                          <span class="detail-label">👤 Khách hàng:</span>
                          <span class="detail-value">
                            <strong>${escapeHtml(b.clientName)}</strong>
                            <small class="detail-sub">(${escapeHtml(b.clientPhone)})</small>
                          </span>
                        </div>
                        <div class="item-detail-row">
                          <span class="detail-label">📦 Gói chụp:</span>
                          <span class="detail-value">
                            ${escapeHtml(b.packageName)} — <strong class="price-value">${formatMoney(b.packagePrice)}</strong>
                          </span>
                        </div>
                        <div class="item-detail-row">
                          <span class="detail-label">📍 Địa điểm:</span>
                          <span class="detail-value">${escapeHtml(b.location || 'Chưa cập nhật')}</span>
                        </div>
                        ${b.notes ? `
                          <div class="item-detail-row full-width">
                            <span class="detail-label">📝 Ghi chú:</span>
                            <span class="detail-value notes-text">${escapeHtml(b.notes)}</span>
                          </div>
                        ` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    gridEl.innerHTML = html;
  }

  function initCalendarEvents() {
    if (isInitialized) return;
    isInitialized = true;

    const prevBtn = document.getElementById('calPrevMonth');
    const nextBtn = document.getElementById('calNextMonth');
    const todayBtn = document.getElementById('calTodayBtn');

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

    // Chuyển đổi chế độ xem: Bảng lịch tháng vs Danh sách bảng
    const viewCalendarBtn = document.getElementById('viewCalendarBtn');
    const viewTableBtn = document.getElementById('viewTableBtn');
    const calContainer = document.getElementById('bookingCalendarContainer');
    const tableContainer = document.getElementById('bookingTableContainer');

    function setViewMode(mode) {
      const isCal = mode === 'calendar';
      if (viewCalendarBtn) viewCalendarBtn.classList.toggle('active', isCal);
      if (viewTableBtn) viewTableBtn.classList.toggle('active', !isCal);
      if (calContainer) calContainer.hidden = !isCal;
      if (tableContainer) tableContainer.hidden = isCal;
    }

    if (viewCalendarBtn) {
      viewCalendarBtn.addEventListener('click', () => setViewMode('calendar'));
    }
    if (viewTableBtn) {
      viewTableBtn.addEventListener('click', () => setViewMode('table'));
    }
  }

  // Hàm public gọi từ admin.js mỗi khi loadBookings trả về danh sách lịch
  window.renderBookingCalendar = function (bookings) {
    allBookings = Array.isArray(bookings) ? bookings : [];

    // Nếu lần đầu tải và có lịch ở tháng nào đó gần nhất, ưu tiên hiển thị tháng đó
    if (!window.__calendarMonthSelected && allBookings.length > 0) {
      const firstValidBooking = allBookings.find((b) => {
        const d = new Date(b.bookingDate);
        return !Number.isNaN(d.getTime());
      });
      if (firstValidBooking) {
        const bDate = new Date(firstValidBooking.bookingDate);
        currentYear = bDate.getFullYear();
        currentMonth = bDate.getMonth();
        window.__calendarMonthSelected = true;
      }
    }

    initCalendarEvents();
    renderCalendar();
  };

  document.addEventListener('DOMContentLoaded', () => {
    initCalendarEvents();
  });
})();
