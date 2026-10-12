(() => {
  const accountLink = document.querySelector('[data-account-link]');
  if (!accountLink || !localStorage.getItem('token')) return;

  let role = localStorage.getItem('userRole');
  let profileHref = role === 'photographer'
    ? '/pages/photographer-profile.html?me=1'
    : '/pages/my-bookings.html';
  const savedName = localStorage.getItem('userFullName');

  function showSignedInAccount(name) {
    accountLink.href = profileHref;
    accountLink.classList.add('signed-in-name');
    accountLink.textContent = name || 'Tài khoản';
    accountLink.title = name || 'Tài khoản';
    accountLink.setAttribute('aria-label', `Tài khoản: ${name || 'Tài khoản'}`);

    const menuWrapper = document.createElement('span');
    menuWrapper.className = 'account-menu-wrapper';
    accountLink.parentNode.insertBefore(menuWrapper, accountLink);
    menuWrapper.append(accountLink);

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
      ['token', 'userId', 'userRole', 'userFullName'].forEach((key) => localStorage.removeItem(key));
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
    return;
  }

  accountLink.textContent = 'Đang tải...';
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
      showSignedInAccount(user.fullName);
    })
    .catch(() => {
      accountLink.textContent = 'Đăng nhập';
      accountLink.href = '/pages/auth.html';
      accountLink.classList.remove('signed-in-name');
    });
})();

// Điều hướng Đặt Lịch: chỉ khi chọn thợ mới chuyển qua tab đặt lịch
document.addEventListener('click', (event) => {
  const bookingLink = event.target.closest('a[href="/pages/booking.html"], a[href^="/pages/booking.html?"]');
  if (bookingLink) {
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
