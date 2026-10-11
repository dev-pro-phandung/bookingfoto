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

function renderReviews(reviews) {
  const reviewList = document.getElementById('reviewsList');
  const emptyState = document.getElementById('reviewsEmpty');
  if (!reviews.length) {
    emptyState.hidden = false;
    reviewList.hidden = true;
    return;
  }

  emptyState.hidden = true;
  reviewList.hidden = false;
  reviewList.innerHTML = reviews.map((review) => {
    const rating = Math.min(5, Math.max(0, Number(review.rating) || 0));
    const stars = `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`;
    return `
      <article class="review-card">
        <div class="review-card-heading">
          <strong>${escapeHtml(review.clientName || 'Khách hàng')}</strong>
          <time>${escapeHtml(formatReviewDate(review.createdAt))}</time>
        </div>
        <div class="review-stars" aria-label="${rating} trên 5 sao">${stars}</div>
        <p>${escapeHtml(review.comment || 'Khách hàng chưa để lại nhận xét.')}</p>
      </article>
    `;
  }).join('');
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
    button.href = bookingUrl;
    button.removeAttribute('aria-disabled');
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
  } catch (error) {
    showProfileError(error.message || 'Không thể kết nối tới máy chủ. Vui lòng thử lại.');
  }
}

loadProfile();
