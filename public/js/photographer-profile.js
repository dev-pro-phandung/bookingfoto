const profilePage = document.getElementById('profilePage');
const profileContent = document.getElementById('profileContent');
const profileError = document.getElementById('profileError');
const profileErrorMessage = document.getElementById('profileErrorMessage');
const parameters = new URLSearchParams(window.location.search);
const ownProfile = parameters.get('me') === '1';
const profileState = { photographer: null, photos: [], coverUrl: null, sorting: false };

function safeImageUrl(value) {
  const imageUrl = String(value || '').trim();
  if (imageUrl.startsWith('/')) return imageUrl;

  try {
    const parsedUrl = new URL(imageUrl, window.location.origin);
    return ['http:', 'https:'].includes(parsedUrl.protocol) ? parsedUrl.href : '';
  } catch {
    return '';
  }
}

function formatCount(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value) || 0);
}

function showProfileError(message) {
  profilePage.setAttribute('aria-busy', 'false');
  document.querySelector('.profile-cover').hidden = true;
  document.querySelector('.profile-heading').hidden = true;
  profileContent.hidden = true;
  profileError.hidden = false;
  profileErrorMessage.textContent = message;
}

function setProfileImage(imageElement, imageUrl) {
  const safeUrl = safeImageUrl(imageUrl);
  if (!safeUrl) {
    imageElement.hidden = true;
    return;
  }

  imageElement.src = safeUrl;
  imageElement.hidden = false;
  imageElement.addEventListener('error', () => {
    imageElement.hidden = true;
  }, { once: true });
}

function safeExternalUrl(value) {
  try {
    const parsedUrl = new URL(String(value || ''));
    return ['http:', 'https:'].includes(parsedUrl.protocol) ? parsedUrl.href : '';
  } catch {
    return '';
  }
}

function formatReviewDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN');
}

const starFeedbackMap = {
  1: '1/5 - Rất thất vọng',
  2: '2/5 - Chưa hài lòng',
  3: '3/5 - Bình thường',
  4: '4/5 - Rất tốt, hài lòng',
  5: '5/5 - Tuyệt vời, rất hài lòng!',
};
let currentSelectedRating = 5;
let reviewSocket = null;
let toastTimeout = null;

function createReviewCardHtml(review, isNewArrival = false) {
  const rating = Math.min(5, Math.max(1, Number(review.rating) || 5));
  const stars = `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`;
  const dateStr = formatReviewDate(review.createdAt || new Date());
  return `
    <article class="review-card ${isNewArrival ? 'new-arrival' : ''}" data-review-id="${escapeHtml(review.reviewId || '')}">
      <div class="review-card-heading">
        <strong>${escapeHtml(review.clientName || 'Khách hàng')}</strong>
        <time>${escapeHtml(dateStr)}</time>
      </div>
      <div class="review-stars" aria-label="${rating} trên 5 sao">${stars}</div>
      <p>${escapeHtml(review.comment || 'Khách hàng chưa để lại nhận xét.')}</p>
    </article>
  `;
}

function updateReviewStats(stats) {
  const rating = Number(stats.rating) || 0;
  const reviewCount = Number(stats.reviewCount) || 0;
  const bookingCount = profileState.photographer ? Number(profileState.photographer.bookingCount) || 0 : 0;

  const ratingValEl = document.getElementById('ratingValue');
  if (ratingValEl) ratingValEl.textContent = rating.toFixed(1);

  const ratingSummaryEl = document.getElementById('ratingSummary');
  if (ratingSummaryEl) {
    ratingSummaryEl.innerHTML = `<strong>${rating.toFixed(1)}</strong><span aria-label="sao">★</span> ${formatCount(reviewCount)} đánh giá`;
  }

  const reviewCountLabel = document.getElementById('reviewCountLabel');
  if (reviewCountLabel) reviewCountLabel.textContent = formatCount(reviewCount);

  const reviewCountAside = document.getElementById('reviewCountAside');
  if (reviewCountAside) reviewCountAside.textContent = formatCount(reviewCount);

  const reviewsDesc = document.getElementById('reviewsDescription');
  if (reviewsDesc) {
    reviewsDesc.textContent = `${formatCount(reviewCount)} đánh giá · ${formatCount(bookingCount)} buổi chụp đã hoàn thành`;
  }

  const reviewsEmptyTitle = document.getElementById('reviewsEmptyTitle');
  if (reviewsEmptyTitle) {
    reviewsEmptyTitle.textContent = reviewCount
      ? 'Nội dung đánh giá đang được cập nhật'
      : 'Chưa có đánh giá';
  }

  const reviewsEmptyMsg = document.getElementById('reviewsEmptyMessage');
  if (reviewsEmptyMsg) {
    reviewsEmptyMsg.textContent = reviewCount
      ? 'Điểm đánh giá đã được ghi nhận.'
      : 'Nhận xét từ khách hàng sẽ xuất hiện tại đây sau các buổi chụp.';
  }
}

function addReviewToUi(review, isNewArrival = false) {
  if (!profileState.reviews) profileState.reviews = [];
  const existingIndex = profileState.reviews.findIndex((r) => r.reviewId && r.reviewId === review.reviewId);
  if (existingIndex !== -1) return;

  profileState.reviews.unshift(review);

  const reviewList = document.getElementById('reviewsList');
  const emptyState = document.getElementById('reviewsEmpty');
  if (emptyState) emptyState.hidden = true;
  if (reviewList) {
    reviewList.hidden = false;
    const cardHtml = createReviewCardHtml(review, isNewArrival);
    reviewList.insertAdjacentHTML('afterbegin', cardHtml);
  }

  if (review.stats) {
    updateReviewStats(review.stats);
  } else {
    const totalCount = profileState.reviews.length;
    const avg = profileState.reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / totalCount;
    updateReviewStats({ rating: avg, reviewCount: totalCount });
  }
}

function renderReviews(reviews) {
  profileState.reviews = Array.isArray(reviews) ? reviews.slice() : [];
  const reviewList = document.getElementById('reviewsList');
  const emptyState = document.getElementById('reviewsEmpty');
  if (!profileState.reviews.length) {
    if (emptyState) emptyState.hidden = false;
    if (reviewList) reviewList.hidden = true;
    return;
  }

  if (emptyState) emptyState.hidden = true;
  if (reviewList) {
    reviewList.hidden = false;
    reviewList.innerHTML = profileState.reviews.map((review) => createReviewCardHtml(review, false)).join('');
  }
}

function updateStarPickerVisuals(rating) {
  const buttons = document.querySelectorAll('.star-picker-btn');
  buttons.forEach((btn) => {
    const val = Number(btn.dataset.value);
    btn.classList.toggle('active', val <= rating);
  });
  const feedbackEl = document.getElementById('starFeedbackText');
  if (feedbackEl) {
    feedbackEl.textContent = starFeedbackMap[rating] || `${rating}/5 sao`;
  }
}

function showReviewStatus(msg, type) {
  const statusEl = document.getElementById('reviewFormStatus');
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.className = `review-status-msg ${type || ''}`;
}

function updateRealtimeBadge(isOnline) {
  const badge = document.getElementById('realtimeBadge');
  if (!badge) return;
  badge.classList.toggle('offline', !isOnline);
  const textEl = badge.querySelector('.realtime-text');
  if (textEl) textEl.textContent = isOnline ? 'Real-time' : 'Offline';
  badge.title = isOnline ? 'Kết nối trực tiếp thời gian thực' : 'Không có kết nối thời gian thực';
}

function setupReviewForm() {
  const form = document.getElementById('reviewForm');
  if (!form || form.dataset.initialized === 'true') return;
  form.dataset.initialized = 'true';

  const starButtons = document.querySelectorAll('.star-picker-btn');
  const starContainer = document.getElementById('starRatingPicker');
  const ratingInput = document.getElementById('ratingInput');
  const feedbackText = document.getElementById('starFeedbackText');

  starButtons.forEach((btn) => {
    const val = Number(btn.dataset.value);

    btn.addEventListener('mouseenter', () => {
      starButtons.forEach((b) => {
        const bVal = Number(b.dataset.value);
        b.classList.toggle('hovered', bVal <= val);
      });
      if (feedbackText) feedbackText.textContent = starFeedbackMap[val] || `${val}/5 sao`;
    });

    btn.addEventListener('click', () => {
      currentSelectedRating = val;
      if (ratingInput) ratingInput.value = String(val);
      updateStarPickerVisuals(val);
    });
  });

  if (starContainer) {
    starContainer.addEventListener('mouseleave', () => {
      starButtons.forEach((b) => b.classList.remove('hovered'));
      updateStarPickerVisuals(currentSelectedRating);
    });
  }

  updateStarPickerVisuals(currentSelectedRating);

  const token = localStorage.getItem('token');
  const userFullName = localStorage.getItem('userFullName');
  const loggedInIdentity = document.getElementById('loggedInIdentity');
  const guestIdentity = document.getElementById('guestIdentity');
  const loggedInUserName = document.getElementById('loggedInUserName');
  const userAvatarTag = document.getElementById('userAvatarTag');
  const reviewAuthLink = document.getElementById('reviewAuthLink');

  if (token && userFullName) {
    if (loggedInIdentity) loggedInIdentity.hidden = false;
    if (guestIdentity) guestIdentity.hidden = true;
    if (loggedInUserName) loggedInUserName.textContent = userFullName;
    if (userAvatarTag) userAvatarTag.textContent = userFullName.trim().charAt(0).toUpperCase();
  } else {
    if (loggedInIdentity) loggedInIdentity.hidden = true;
    if (guestIdentity) guestIdentity.hidden = false;
    if (reviewAuthLink) {
      reviewAuthLink.href = `/pages/auth.html?redirect=${encodeURIComponent(window.location.href)}`;
    }
  }

  const commentInput = document.getElementById('reviewCommentInput');
  const commentCharCount = document.getElementById('commentCharCount');
  if (commentInput && commentCharCount) {
    commentInput.addEventListener('input', () => {
      commentCharCount.textContent = `${commentInput.value.length}/1000`;
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const photographerId = profileState.photographer ? profileState.photographer.id : parameters.get('id');
    if (!photographerId) {
      showReviewStatus('Không xác định được mã nhiếp ảnh gia.', 'error');
      return;
    }

    const rating = currentSelectedRating;
    const comment = commentInput ? commentInput.value.trim() : '';
    if (!comment) {
      showReviewStatus('Vui lòng nhập nội dung đánh giá.', 'error');
      if (commentInput) commentInput.focus();
      return;
    }

    let clientName = '';
    if (token && userFullName) {
      clientName = userFullName;
    } else {
      const nameInput = document.getElementById('clientNameInput');
      clientName = nameInput ? nameInput.value.trim() : '';
      if (!clientName) {
        showReviewStatus('Vui lòng nhập họ tên của bạn trước khi gửi đánh giá.', 'error');
        if (nameInput) nameInput.focus();
        return;
      }
    }

    const submitBtn = document.getElementById('submitReviewButton');
    const spinner = document.getElementById('reviewBtnSpinner');
    const btnText = document.getElementById('submitReviewBtnText');

    try {
      if (submitBtn) submitBtn.disabled = true;
      if (spinner) spinner.hidden = false;
      if (btnText) btnText.textContent = 'Đang gửi...';
      showReviewStatus('', '');

      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`/api/photographers/${encodeURIComponent(photographerId)}/reviews`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ rating, comment, clientName }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Không thể gửi đánh giá.');
      }

      showReviewStatus(result.message || 'Cảm ơn bạn đã gửi đánh giá!', 'success');
      if (commentInput) {
        commentInput.value = '';
        if (commentCharCount) commentCharCount.textContent = '0/1000';
      }

      addReviewToUi(result.data, true);
    } catch (err) {
      showReviewStatus(err.message || 'Lỗi gửi đánh giá. Vui lòng thử lại.', 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (spinner) spinner.hidden = true;
      if (btnText) btnText.textContent = 'Gửi đánh giá';
    }
  });
}

function setupRealtimeReviews(photographerId) {
  if (typeof io !== 'function') {
    updateRealtimeBadge(false);
    return;
  }

  try {
    if (reviewSocket) {
      reviewSocket.disconnect();
    }

    reviewSocket = io();

    reviewSocket.on('connect', () => {
      updateRealtimeBadge(true);
      reviewSocket.emit('join_photographer', photographerId);
    });

    reviewSocket.on('disconnect', () => {
      updateRealtimeBadge(false);
    });

    reviewSocket.on('new_review', (newReview) => {
      if (!newReview) return;
      if (String(newReview.photographerId) !== String(photographerId)) return;

      const toastEl = document.getElementById('realtimeLiveToast');
      const msgEl = document.getElementById('realtimeLiveMessage');
      if (toastEl && msgEl) {
        msgEl.textContent = `Vừa có đánh giá mới từ ${escapeHtml(newReview.clientName || 'Khách hàng')} (★ ${newReview.rating})!`;
        toastEl.hidden = false;
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
          toastEl.hidden = true;
        }, 4500);
      }

      addReviewToUi(newReview, true);
    });
  } catch (err) {
    console.warn('Lỗi kết nối Socket.IO:', err);
    updateRealtimeBadge(false);
  }
}

function renderProfile(photographer) {
  profileState.photographer = photographer;
  profileState.photos = Array.isArray(photographer.photos) ? photographer.photos.slice() : [];
  profileState.coverUrl = photographer.cover || profileState.photos[0] || null;
  const locations = Array.isArray(photographer.locations) ? photographer.locations : [];
  const rating = Number(photographer.rating) || 0;
  const reviewCount = Number(photographer.reviewCount) || 0;
  const bookingUrl = `/pages/booking.html?photographerId=${encodeURIComponent(photographer.id)}`;

  document.title = `${photographer.name || 'Nhiếp ảnh gia'} | Pdun.Foto`;
  document.getElementById('photographerName').textContent = photographer.name || 'Nhiếp ảnh gia';
  document.getElementById('experienceLabel').textContent = photographer.experience || 'Nhiếp ảnh gia Pdun.Foto';
  document.getElementById('locationLabel').textContent = locations.join(' · ') || 'Chưa cập nhật khu vực';
  document.getElementById('photographerEquipment').textContent = photographer.equipment || 'Chưa cập nhật thiết bị chụp.';
  document.getElementById('photographerBio').textContent = photographer.bio || 'Chưa cập nhật giới thiệu.';
  document.getElementById('experienceDetail').textContent = photographer.experience || 'Chưa cập nhật kinh nghiệm.';
  document.getElementById('bookingCount').textContent = formatCount(photographer.bookingCount);
  document.getElementById('reviewCountLabel').textContent = formatCount(reviewCount);
  document.getElementById('reviewCountAside').textContent = formatCount(reviewCount);
  document.getElementById('ratingSummary').innerHTML = `<strong>${rating.toFixed(1)}</strong><span aria-label="sao">★</span> ${formatCount(reviewCount)} đánh giá`;
  document.getElementById('ratingValue').textContent = rating.toFixed(1);
  document.getElementById('reviewsDescription').textContent = `${formatCount(reviewCount)} đánh giá · ${formatCount(photographer.bookingCount)} buổi chụp đã hoàn thành`;
  document.getElementById('reviewsEmptyTitle').textContent = reviewCount
    ? 'Nội dung đánh giá đang được cập nhật'
    : 'Chưa có đánh giá';
  document.getElementById('reviewsEmptyMessage').textContent = reviewCount
    ? 'Điểm đánh giá đã được ghi nhận; nội dung nhận xét chưa có trong dữ liệu.'
    : 'Nhận xét từ khách hàng sẽ xuất hiện tại đây sau các buổi chụp.';
  document.getElementById('locationTags').innerHTML = locations.length
    ? locations.map((location) => `<span>${escapeHtml(location)}</span>`).join('')
    : '<span>Chưa cập nhật</span>';
  document.getElementById('specialtyTags').innerHTML = renderTags(photographer.specialties);
  document.getElementById('languageTags').innerHTML = renderTags(photographer.languages);
  document.getElementById('workStyleTags').innerHTML = renderTags(photographer.workStyle);

  setProfileImage(document.getElementById('coverImage'), profileState.coverUrl);
  setProfileImage(document.getElementById('avatarImage'), profileState.photos[0] || photographer.avatar);
  if (!safeImageUrl(profileState.photos[0] || photographer.avatar)) {
    const avatarFallback = document.getElementById('avatarFallback');
    avatarFallback.textContent = (photographer.name || 'P').trim().charAt(0).toUpperCase();
    avatarFallback.hidden = false;
  }

  const portfolioUrl = safeExternalUrl(photographer.portfolioUrl);
  const portfolioLink = document.getElementById('portfolioLink');
  if (portfolioUrl) {
    portfolioLink.href = portfolioUrl;
    portfolioLink.hidden = false;
  }
  renderPortfolio();
  renderReviews(Array.isArray(photographer.reviews) ? photographer.reviews : []);

  for (const buttonId of ['bookButton', 'secondaryBookButton']) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.href = bookingUrl;
      button.removeAttribute('aria-disabled');
      button.addEventListener('click', () => {
        sessionStorage.setItem('selectedPhotographerId', String(photographer.id));
      });
    }
  }

  const profileNotice = document.getElementById('profileNotice');
  profileNotice.hidden = ownProfile || Boolean(photographer.isVerified);
  document.getElementById('profileNoticeText').textContent = 'Hồ sơ này đang chờ Pdun.Foto xác minh thông tin.';
  setupOwnerEditor(photographer);
  profilePage.setAttribute('aria-busy', 'false');
  profileContent.hidden = false;
}

function renderPortfolio() {
  const portfolioGrid = document.getElementById('portfolioGrid');
  const portfolioEmpty = document.getElementById('portfolioEmpty');
  const validPhotos = profileState.photos.map(safeImageUrl).filter(Boolean);
  portfolioGrid.innerHTML = validPhotos.map((photoUrl, index) => `
    <figure class="portfolio-item${profileState.sorting ? ' is-sorting' : ''}" draggable="${profileState.sorting && ownProfile}" data-photo-index="${index}">
      <img class="portfolio-photo" src="${escapeHtml(photoUrl)}" alt="Ảnh ${index + 1} của ${escapeHtml(profileState.photographer.name || 'nhiếp ảnh gia')}" loading="lazy" />
      ${ownProfile ? `<label class="photo-select"><input type="checkbox" value="${index}" aria-label="Chọn ảnh ${index + 1}" /><span></span></label>` : ''}
      ${profileState.sorting && ownProfile ? '<span class="drag-hint" aria-hidden="true">↕</span>' : ''}
    </figure>
  `).join('');
  portfolioEmpty.hidden = validPhotos.length > 0;
  document.getElementById('avatarImage').src = safeImageUrl(validPhotos[0]) || '';
  document.getElementById('avatarImage').hidden = !validPhotos.length;
  document.getElementById('avatarFallback').hidden = validPhotos.length > 0;
  if (validPhotos.length) {
    document.getElementById('coverImage').src = safeImageUrl(profileState.coverUrl || validPhotos[0]);
    document.getElementById('coverImage').hidden = false;
  }
  if (profileState.sorting && ownProfile) setupPhotoDragSort(portfolioGrid);
}

function renderTags(value) {
  const tags = String(value || '').split(/[,;|]/).map((tag) => tag.trim()).filter(Boolean);
  return tags.length
    ? tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')
    : '<span>Chưa cập nhật</span>';
}

function setupOwnerEditor(photographer) {
  if (!ownProfile) return;
  document.getElementById('editProfileButton').hidden = false;
  document.getElementById('photographerScheduleLink').hidden = false;
  document.getElementById('galleryActions').hidden = false;
  document.getElementById('galleryGuidance').hidden = false;
  document.getElementById('changeCoverButton').hidden = false;
  document.getElementById('changeAvatarButton').hidden = false;
  document.getElementById('secondaryBookButton').hidden = true;
  document.getElementById('editBio').value = photographer.bio || '';
  document.getElementById('editEquipment').value = photographer.equipment || '';
  document.getElementById('editLocation').value = (photographer.locations || []).join(', ');
  document.getElementById('editExperience').value = photographer.experience || 'Dưới 1 năm';
  document.getElementById('editSpecialties').value = photographer.specialties || '';
  document.getElementById('editLanguages').value = photographer.languages || '';
  document.getElementById('editWorkStyle').value = photographer.workStyle || '';

  document.getElementById('editProfileButton').addEventListener('click', () => {
    const form = document.getElementById('profileEditForm');
    form.hidden = !form.hidden;
    document.getElementById('editProfileButton').textContent = form.hidden ? '✎ Chỉnh sửa hồ sơ' : '× Đóng chỉnh sửa';
    if (!form.hidden) form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  document.getElementById('galleryFileInput').addEventListener('change', uploadGalleryPhotos);
  document.getElementById('coverFileInput').addEventListener('change', uploadCoverPhoto);
  document.getElementById('saveGalleryButton').addEventListener('click', saveOwnProfile);
  document.getElementById('avatarFileInput').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const url = await uploadImage(file);
    if (url) {
      profileState.photos.unshift(url);
      if (profileState.photos.length > 12) profileState.photos.pop();
      renderPortfolio();
      markProfileDirty();
    }
    event.target.value = '';
  });
  document.getElementById('changeCoverButton').addEventListener('click', () => document.getElementById('coverFileInput').click());
  document.getElementById('changeAvatarButton').addEventListener('click', () => document.getElementById('avatarFileInput').click());
  document.getElementById('deletePhotosButton').addEventListener('click', () => {
    const selected = [...document.querySelectorAll('.photo-select input:checked')]
      .map((checkbox) => Number(checkbox.value));
    if (!selected.length) {
      document.querySelector('.portfolio-grid').classList.toggle('selecting');
      return;
    }
    profileState.photos = profileState.photos.filter((photo, index) => !selected.includes(index));
    renderPortfolio();
    markProfileDirty();
  });
  document.getElementById('sortPhotosButton').addEventListener('click', (event) => {
    profileState.sorting = !profileState.sorting;
    event.currentTarget.classList.toggle('active', profileState.sorting);
    event.currentTarget.textContent = profileState.sorting ? '✓ Xong sắp xếp' : '☷ Sắp xếp';
    renderPortfolio();
  });
  document.getElementById('profileEditForm').addEventListener('submit', saveOwnProfile);
}

function setupPhotoDragSort(grid) {
  let draggedIndex = null;
  grid.querySelectorAll('.portfolio-item').forEach((item) => {
    item.addEventListener('dragstart', () => { draggedIndex = Number(item.dataset.photoIndex); });
    item.addEventListener('dragover', (event) => event.preventDefault());
    item.addEventListener('drop', (event) => {
      event.preventDefault();
      const targetIndex = Number(item.dataset.photoIndex);
      if (draggedIndex === null || draggedIndex === targetIndex) return;
      const [photo] = profileState.photos.splice(draggedIndex, 1);
      profileState.photos.splice(targetIndex, 0, photo);
      renderPortfolio();
      markProfileDirty();
    });
  });
}

async function uploadImage(file) {
  const status = document.getElementById('profileSaveStatus');
  if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type) || file.size > 25 * 1024 * 1024) {
    status.textContent = 'Chỉ hỗ trợ JPG, PNG, GIF hoặc WEBP tối đa 25 MB.';
    return null;
  }
  const formData = new FormData();
  formData.append('image', file);
  try {
    const response = await fetch('/api/upload', { method: 'POST', body: formData });
    const result = await response.json();
    if (!response.ok || !result.url) throw new Error(result.error || 'Không thể tải ảnh lên.');
    status.textContent = 'Ảnh đã tải lên. Nhấn Lưu hồ sơ để áp dụng thay đổi.';
    return result.url;
  } catch (error) {
    status.textContent = error.message || 'Không thể tải ảnh lên.';
    return null;
  }
}

async function uploadGalleryPhotos(event) {
  const selectedFiles = Array.from(event.target.files);
  const remaining = 12 - profileState.photos.length;
  if (selectedFiles.length > remaining) {
    document.getElementById('profileSaveStatus').textContent = `Bộ sưu tập chỉ chứa tối đa 12 ảnh; hiện còn thêm được ${remaining} ảnh.`;
    event.target.value = '';
    return;
  }
  for (const file of selectedFiles) {
    const url = await uploadImage(file);
    if (url) profileState.photos.push(url);
  }
  renderPortfolio();
  event.target.value = '';
}

async function uploadCoverPhoto(event) {
  const file = event.target.files[0];
  if (file) {
    const url = await uploadImage(file);
    if (url) {
      profileState.coverUrl = url;
      setProfileImage(document.getElementById('coverImage'), url);
      markProfileDirty();
    }
  }
  event.target.value = '';
}

function markProfileDirty() {
  document.getElementById('saveGalleryButton').hidden = false;
}

async function saveOwnProfile(event) {
  event?.preventDefault();
  const button = document.getElementById('saveProfileButton');
  const galleryButton = document.getElementById('saveGalleryButton');
  const status = document.getElementById('profileSaveStatus');
  button.disabled = true;
  galleryButton.disabled = true;
  status.textContent = 'Đang lưu hồ sơ...';
  try {
    const response = await fetch('/api/photographers/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      },
      body: JSON.stringify({
        location: document.getElementById('editLocation').value.trim(),
        experience: document.getElementById('editExperience').value,
        equipment: document.getElementById('editEquipment').value.trim(),
        bio: document.getElementById('editBio').value.trim(),
        specialties: document.getElementById('editSpecialties').value.trim(),
        languages: document.getElementById('editLanguages').value.trim(),
        workStyle: document.getElementById('editWorkStyle').value.trim(),
        coverUrl: profileState.coverUrl,
        photoUrls: profileState.photos,
      }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Không thể lưu hồ sơ.');
    status.textContent = 'Đã lưu hồ sơ.';
    galleryButton.hidden = true;
    profileState.photographer = {
      ...profileState.photographer,
      bio: document.getElementById('editBio').value.trim(),
      equipment: document.getElementById('editEquipment').value.trim(),
      locations: document.getElementById('editLocation').value.split(',').map((item) => item.trim()).filter(Boolean),
      experience: document.getElementById('editExperience').value,
      specialties: document.getElementById('editSpecialties').value.trim(),
      languages: document.getElementById('editLanguages').value.trim(),
      workStyle: document.getElementById('editWorkStyle').value.trim(),
    };
    document.getElementById('photographerBio').textContent = profileState.photographer.bio || 'Chưa cập nhật giới thiệu.';
    document.getElementById('photographerEquipment').textContent = profileState.photographer.equipment;
    document.getElementById('experienceDetail').textContent = profileState.photographer.experience;
    document.getElementById('locationLabel').textContent = profileState.photographer.locations.join(' · ');
    document.getElementById('locationTags').innerHTML = profileState.photographer.locations.map((location) => `<span>${escapeHtml(location)}</span>`).join('');
    document.getElementById('specialtyTags').innerHTML = renderTags(profileState.photographer.specialties);
    document.getElementById('languageTags').innerHTML = renderTags(profileState.photographer.languages);
    document.getElementById('workStyleTags').innerHTML = renderTags(profileState.photographer.workStyle);
    renderPortfolio();
  } catch (error) {
    status.textContent = error.message || 'Không thể lưu hồ sơ.';
  } finally {
    button.disabled = false;
    galleryButton.disabled = false;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setupTabs() {
  document.querySelectorAll('.profile-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.profile-tab').forEach((item) => {
        const selected = item === tab;
        item.classList.toggle('active', selected);
        item.setAttribute('aria-selected', String(selected));
      });

      document.querySelectorAll('.tab-panel').forEach((panel) => {
        panel.hidden = panel.id !== tab.dataset.panel;
      });
    });
  });
}

async function loadProfile() {
  setupTabs();
  const photographerId = parameters.get('id');
  if (!ownProfile && (!photographerId || !/^\d+$/.test(photographerId))) {
    showProfileError('Hãy mở hồ sơ từ danh sách nhiếp ảnh gia để xem thông tin chi tiết.');
    return;
  }

  try {
    const headers = ownProfile ? { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } : {};
    const endpoint = ownProfile
      ? '/api/photographers/me'
      : `/api/photographers/${encodeURIComponent(photographerId)}`;
    const response = await fetch(endpoint, { headers });
    const result = await response.json();
    if (!response.ok || !result.success || !result.data) {
      throw new Error(result.message || 'Không tìm thấy hồ sơ nhiếp ảnh gia này.');
    }
    renderProfile(result.data);
    setupReviewForm();
    setupRealtimeReviews(result.data.id);
  } catch (error) {
    showProfileError(error.message || 'Không thể kết nối tới máy chủ. Vui lòng thử lại.');
  }
}

loadProfile();
