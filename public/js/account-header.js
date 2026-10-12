(() => {
  const accountLink = document.querySelector('[data-account-link]');

  let role = localStorage.getItem('userRole');
  let profileHref = role === 'photographer'
    ? '/pages/photographer-profile.html?me=1'
    : '/pages/my-bookings.html';
  const savedName = localStorage.getItem('userFullName');

  function applyBookingButtonsVisibility(userRole) {
    const isPhotographer = userRole === 'photographer';
    if (isPhotographer) {
      document.documentElement.setAttribute('data-user-role', 'photographer');
    } else {
      document.documentElement.removeAttribute('data-user-role');
    }

    // 1. Ẩn/hiện link Đặt lịch trên nav / header
    document.querySelectorAll('a[href*="/pages/booking.html"]').forEach((link) => {
      if (
        link.closest('nav') ||
        link.closest('header') ||
        link.closest('.bookings-header') ||
        link.id === 'headerBookingLink' ||
        link.classList.contains('new-booking') ||
        link.id === 'newBookingBtn'
      ) {
        if (isPhotographer) {
          link.style.display = 'none';
          link.hidden = true;
        } else {
          link.style.removeProperty('display');
          link.hidden = false;
        }
      }
    });

    // 2. Ẩn/hiện nút Đặt buổi chụp trên trang Lịch của tôi
    const newBookingBtn = document.getElementById('newBookingBtn');
    if (newBookingBtn) {
      if (isPhotographer) {
        newBookingBtn.style.display = 'none';
        newBookingBtn.hidden = true;
      } else {
        newBookingBtn.style.removeProperty('display');
        newBookingBtn.hidden = false;
      }
    }

    // 3. Ẩn/hiện nút Đặt lịch trên các thẻ thợ ảnh (.card-book-btn)
    document.querySelectorAll('.card-book-btn').forEach((btn) => {
      if (isPhotographer) {
        btn.style.display = 'none';
        btn.hidden = true;
      } else {
        btn.style.removeProperty('display');
        btn.hidden = false;
      }
    });

    // 4. Ẩn/hiện nút Đặt lịch trên trang chi tiết thợ
    ['bookButton', 'secondaryBookButton'].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) {
        if (isPhotographer) {
          btn.style.display = 'none';
          btn.hidden = true;
        } else {
          btn.style.removeProperty('display');
          btn.hidden = false;
        }
      }
    });
  }

  // Chạy ngay lập tức để đồng bộ giao diện
  applyBookingButtonsVisibility(role);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applyBookingButtonsVisibility(role));
  }

  if (!accountLink || !localStorage.getItem('token')) {
    applyBookingButtonsVisibility(null);
    return;
  }

  function showSignedInAccount(name) {
    accountLink.href = profileHref;
    accountLink.classList.add('signed-in-name');
    accountLink.textContent = name || 'Tài khoản';
    accountLink.title = name || 'Tài khoản';
    accountLink.setAttribute('aria-label', `Tài khoản: ${name || 'Tài khoản'}`);

    // Tránh thêm nhiều wrapper nếu đã có
    let menuWrapper = accountLink.closest('.account-menu-wrapper');
    if (!menuWrapper) {
      menuWrapper = document.createElement('span');
      menuWrapper.className = 'account-menu-wrapper';
      accountLink.parentNode.insertBefore(menuWrapper, accountLink);
      menuWrapper.append(accountLink);
    }

    // Xóa menu cũ nếu có
    const oldMenu = menuWrapper.querySelector('.account-menu');
    if (oldMenu) oldMenu.remove();

    const accountMenu = document.createElement('div');
    accountMenu.className = 'account-menu';
    accountMenu.setAttribute('role', 'menu');

    const profileItem = document.createElement('a');
    profileItem.href = profileHref;
    profileItem.textContent = 'Hồ sơ của tôi';
    profileItem.setAttribute('role', 'menuitem');
    accountMenu.append(profileItem);

    if (role === 'photographer') {
      const scheduleItem = document.createElement('a');
      scheduleItem.href = '/pages/photographer-bookings.html';
      scheduleItem.className = 'photographer-schedule-menu-item';
      scheduleItem.setAttribute('role', 'menuitem');
      scheduleItem.innerHTML = 'Lịch chụp <span class="menu-pending-badge" hidden></span>';
      accountMenu.append(scheduleItem);

      const updatePendingBadges = async () => {
        try {
          const response = await fetch('/api/bookings/photographer/notifications', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
          });
          if (!response.ok) return;
          const result = await response.json();
          document.querySelectorAll('.menu-pending-badge, .photographer-pending-badge').forEach((badge) => {
            const count = Number(result.pendingCount) || 0;
            badge.textContent = String(count);
            badge.hidden = count === 0;
            badge.setAttribute('aria-label', `${count} yêu cầu đặt lịch mới`);
          });
        } catch {
        }
      };
      updatePendingBadges();
      window.setInterval(updatePendingBadges, 30000);
    }

    const logoutButton = document.createElement('button');
    logoutButton.type = 'button';
    logoutButton.textContent = 'Đăng xuất';
    logoutButton.setAttribute('role', 'menuitem');
    logoutButton.addEventListener('click', () => {
      ['token', 'userId', 'userRole', 'userFullName', 'photographerId'].forEach((key) => localStorage.removeItem(key));
      applyBookingButtonsVisibility(null);
      window.location.href = '/pages/auth.html';
    });

    accountMenu.append(logoutButton);
    menuWrapper.append(accountMenu);
    accountLink.setAttribute('aria-haspopup', 'menu');
    accountLink.setAttribute('aria-expanded', 'false');

    // Hỗ trợ thiết bị cảm ứng khi không có con trỏ hover
    accountLink.addEventListener('click', (event) => {
      if (window.matchMedia('(hover: none)').matches) {
        event.preventDefault();
        const isOpen = menuWrapper.classList.toggle('is-open');
        accountLink.setAttribute('aria-expanded', String(isOpen));
      }
    });

    document.addEventListener('click', (event) => {
      if (!menuWrapper.contains(event.target)) {
        menuWrapper.classList.remove('is-open');
        accountLink.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuWrapper.classList.contains('is-open')) {
        menuWrapper.classList.remove('is-open');
        accountLink.setAttribute('aria-expanded', 'false');
        accountLink.focus();
      }
    });
  }

  if (savedName) {
    showSignedInAccount(savedName);
    applyBookingButtonsVisibility(role);
  }

  // Luôn xác thực vai trò với máy chủ trong nền để đảm bảo đồng bộ mới nhất
  fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  })
    .then((response) => {
      if (!response.ok) throw new Error('Phiên đăng nhập không còn hợp lệ.');
      return response.json();
    })
    .then((result) => {
      const user = result.user;
      if (!user?.fullName) throw new Error('Không tìm thấy tên tài khoản.');
      localStorage.setItem('userFullName', user.fullName);
      if (user.role) {
        role = user.role;
        localStorage.setItem('userRole', role);
        profileHref = role === 'photographer'
          ? '/pages/photographer-profile.html?me=1'
          : '/pages/my-bookings.html';
      }
      if (user.photographerId) {
        localStorage.setItem('photographerId', String(user.photographerId));
      }
      applyBookingButtonsVisibility(role);
      showSignedInAccount(user.fullName);
    })
    .catch(() => {
      if (!savedName) {
        accountLink.textContent = 'Đăng nhập';
        accountLink.href = '/pages/auth.html';
        accountLink.classList.remove('signed-in-name');
        applyBookingButtonsVisibility(null);
      }
    });
})();

// Điều hướng Đặt Lịch: chặn thợ ảnh, với người dùng yêu cầu chọn thợ trước
document.addEventListener('click', (event) => {
  const bookingLink = event.target.closest('a[href="/pages/booking.html"], a[href^="/pages/booking.html?"]');
  if (bookingLink) {
    const currentRole = localStorage.getItem('userRole');
    if (currentRole === 'photographer') {
      event.preventDefault();
      alert('Tài khoản nhiếp ảnh gia không thể đặt lịch chụp hình.');
      return;
    }
    const selectedPhotographerId = sessionStorage.getItem('selectedPhotographerId');
    const isDirectBookingUrl = bookingLink.getAttribute('href').includes('photographerId=');
    if (!selectedPhotographerId && !isDirectBookingUrl) {
      event.preventDefault();
      sessionStorage.setItem('bookingNotice', 'Vui lòng chọn nhiếp ảnh gia trước khi đặt lịch chụp hình!');
      window.location.href = '/pages/photographers.html';
    } else if (selectedPhotographerId && !isDirectBookingUrl) {
      bookingLink.href = `/pages/booking.html?photographerId=${encodeURIComponent(selectedPhotographerId)}`;
    }
  }
});

