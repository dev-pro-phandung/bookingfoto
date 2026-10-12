(() => {
  let currentPeriod = '7days';
  let charts = {
    hourly: null,
    daily: null,
    device: null,
  };

  function getAuthToken() {
    return localStorage.getItem('token') || '';
  }

  function formatNumber(num) {
    return new Intl.NumberFormat('vi-VN').format(Number(num) || 0);
  }

  function destroyChart(chartKey) {
    if (charts[chartKey]) {
      charts[chartKey].destroy();
      charts[chartKey] = null;
    }
  }

  async function fetchAnalytics(period = '7days') {
    const token = getAuthToken();
    const response = await fetch(`/api/admin/analytics?period=${encodeURIComponent(period)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Không thể tải dữ liệu thống kê lưu lượng.');
    }

    const result = await response.json();
    return result.data;
  }

  function renderAssessment(summary) {
    const badgeEl = document.getElementById('trafficLevelBadge');
    const iconEl = document.getElementById('trafficIcon');
    const levelTextEl = document.getElementById('trafficLevelText');
    const descEl = document.getElementById('trafficAssessmentDesc');
    const meterFillEl = document.getElementById('trafficMeterFill');

    if (!summary || !badgeEl) return;

    if (iconEl) iconEl.textContent = summary.trafficIcon || '📈';
    if (levelTextEl) levelTextEl.textContent = summary.trafficLevel || 'Ổn định';
    if (descEl) descEl.textContent = summary.assessmentText || '';

    // Đặt class màu cho badge
    badgeEl.className = `traffic-level-badge level-${summary.trafficBadge || 'medium'}`;

    // Cập nhật thanh đo mức độ (Traffic Meter)
    let meterPercent = 50;
    if (summary.trafficBadge === 'high') {
      meterPercent = 90;
    } else if (summary.trafficBadge === 'good') {
      meterPercent = 70;
    } else if (summary.trafficBadge === 'medium') {
      meterPercent = 50;
    } else {
      meterPercent = 25;
    }
    if (meterFillEl) {
      meterFillEl.style.width = `${meterPercent}%`;
      meterFillEl.className = `meter-fill meter-${summary.trafficBadge || 'medium'}`;
    }
  }

  function renderMetrics(summary) {
    const totalEl = document.getElementById('statTotalVisits');
    const growthEl = document.getElementById('statVisitsGrowth');
    const uniqueEl = document.getElementById('statUniqueVisitors');
    const uniqueSubEl = document.getElementById('statUniqueSub');
    const peakHourEl = document.getElementById('statPeakHour');
    const peakSubEl = document.getElementById('statPeakSub');
    const rateEl = document.getElementById('statTrafficRate');
    const rateSubEl = document.getElementById('statTrafficRateSub');

    if (totalEl) totalEl.textContent = formatNumber(summary.todayVisits);
    
    if (growthEl) {
      const growth = Number(summary.growthPercent) || 0;
      if (growth > 0) {
        growthEl.innerHTML = `<span class="trend-up">▲ +${growth}%</span> so với ngày hôm qua`;
      } else if (growth < 0) {
        growthEl.innerHTML = `<span class="trend-down">▼ ${growth}%</span> so với ngày hôm qua`;
      } else {
        growthEl.textContent = 'Tương đương ngày hôm qua';
      }
    }

    if (uniqueEl) uniqueEl.textContent = formatNumber(summary.todayUnique);
    if (uniqueSubEl) uniqueSubEl.textContent = `${Math.round((summary.todayUnique / (summary.todayVisits || 1)) * 100)}% lượng truy cập riêng biệt`;

    if (peakHourEl) peakHourEl.textContent = summary.peakHour || '19:00 - 21:00';
    if (peakSubEl) peakSubEl.textContent = `${formatNumber(summary.peakCount)} lượt truy cập trong giờ này`;

    if (rateEl) rateEl.textContent = summary.trafficLevel;
    if (rateSubEl) rateSubEl.textContent = summary.trafficBadge === 'high' ? 'Khách vào nhiều, cơ hội chốt lịch cao' : 'Khách truy cập đều đặn';
  }

  function renderHourlyChart(hourlyData) {
    const canvas = document.getElementById('hourlyChart');
    if (!canvas || !window.Chart) return;

    destroyChart('hourly');

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, 'rgba(233, 87, 0, 0.35)');
    gradient.addColorStop(1, 'rgba(233, 87, 0, 0.01)');

    const labels = hourlyData.map(d => d.hour);
    const dataVisits = hourlyData.map(d => d.visits);

    charts.hourly = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Lượt xem (Pageviews)',
          data: dataVisits,
          borderColor: '#e95700',
          borderWidth: 2.5,
          backgroundColor: gradient,
          fill: true,
          tension: 0.38,
          pointRadius: hourlyData.map(d => d.visits > 10 ? 4 : 2),
          pointHoverRadius: 6,
          pointBackgroundColor: '#e95700',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#13243b',
            titleFont: { family: 'Montserrat, sans-serif', size: 13, weight: '700' },
            bodyFont: { family: 'Montserrat, sans-serif', size: 12 },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (context) => ` Lượt truy cập: ${context.parsed.y} lượt`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              maxTicksLimit: 12,
              color: '#64748b',
              font: { size: 11 },
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(226, 232, 240, 0.6)' },
            ticks: {
              stepSize: 5,
              color: '#64748b',
              font: { size: 11 },
            },
          },
        },
      },
    });
  }

  function renderDailyTrendChart(dailyTrend) {
    const canvas = document.getElementById('dailyTrendChart');
    if (!canvas || !window.Chart) return;

    destroyChart('daily');

    const ctx = canvas.getContext('2d');
    const labels = dailyTrend.map(d => d.displayDate);
    const visits = dailyTrend.map(d => d.visits);

    charts.daily = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Tổng lượt truy cập',
          data: visits,
          backgroundColor: visits.map(v => v >= 140 ? '#e95700' : '#ff914d'),
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 32,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#13243b',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (context) => ` ${context.parsed.y} lượt truy cập`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(226, 232, 240, 0.6)' },
            ticks: { color: '#64748b', font: { size: 11 } },
          },
        },
      },
    });
  }

  function renderTopPages(topPages) {
    const container = document.getElementById('topPagesList');
    if (!container) return;

    if (!topPages || !topPages.length) {
      container.innerHTML = '<p class="empty-state">Chưa có dữ liệu trang.</p>';
      return;
    }

    container.innerHTML = topPages.map((page, idx) => `
      <div class="page-rank-item">
        <div class="page-rank-left">
          <span class="rank-number">${idx + 1}</span>
          <div class="page-rank-info">
            <strong class="page-title">${escapeHtml(page.title)}</strong>
            <span class="page-url">${escapeHtml(page.url)}</span>
          </div>
        </div>
        <div class="page-rank-right">
          <div class="page-bar-wrap">
            <div class="page-bar-fill" style="width: ${page.percentage}%;"></div>
          </div>
          <span class="page-count">${formatNumber(page.visits)} <small>(${page.percentage}%)</small></span>
        </div>
      </div>
    `).join('');
  }

  function renderDeviceChart(deviceShare) {
    const canvas = document.getElementById('deviceChart');
    const statsRow = document.getElementById('deviceStatsRow');
    if (!canvas || !window.Chart) return;

    destroyChart('device');

    const ctx = canvas.getContext('2d');
    const dataValues = [deviceShare.desktop || 0, deviceShare.mobile || 0, deviceShare.tablet || 0];

    charts.device = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Máy tính (Desktop)', 'Điện thoại (Mobile)', 'Máy tính bảng (Tablet)'],
        datasets: [{
          data: dataValues,
          backgroundColor: ['#e95700', '#2563eb', '#10b981'],
          borderWidth: 3,
          borderColor: '#ffffff',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              font: { family: 'Montserrat, sans-serif', size: 11 },
              padding: 14,
            },
          },
        },
      },
    });

    if (statsRow) {
      statsRow.innerHTML = `
        <div class="device-pill"><strong>${deviceShare.desktop}%</strong><span>Desktop</span></div>
        <div class="device-pill"><strong>${deviceShare.mobile}%</strong><span>Mobile</span></div>
        <div class="device-pill"><strong>${deviceShare.tablet}%</strong><span>Tablet</span></div>
      `;
    }
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  async function loadAnalytics() {
    const refreshBtn = document.getElementById('refreshAnalyticsBtn');
    if (refreshBtn) refreshBtn.textContent = 'Đang tải...';

    try {
      const data = await fetchAnalytics(currentPeriod);
      renderAssessment(data.summary);
      renderMetrics(data.summary);
      renderHourlyChart(data.hourlyData);
      renderDailyTrendChart(data.dailyTrend);
      renderTopPages(data.topPages);
      renderDeviceChart(data.deviceShare);
    } catch (error) {
      console.error('Lỗi tải analytics:', error);
      const descEl = document.getElementById('trafficAssessmentDesc');
      if (descEl) descEl.textContent = error.message || 'Không thể kết nối đến máy chủ.';
    } finally {
      if (refreshBtn) refreshBtn.textContent = '↻ Làm mới số liệu';
    }
  }

  // Khởi tạo các sự kiện
  function initEvents() {
    document.querySelectorAll('.period-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentPeriod = btn.dataset.period || '7days';
        loadAnalytics();
      });
    });

    const refreshBtn = document.getElementById('refreshAnalyticsBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', loadAnalytics);
    }
  }

  window.loadAnalytics = loadAnalytics;

  document.addEventListener('DOMContentLoaded', () => {
    initEvents();
  });
})();
