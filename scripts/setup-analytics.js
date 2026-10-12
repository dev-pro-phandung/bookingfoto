const db = require("../config/db");

async function setupAnalytics() {
  console.log("Đang thiết lập bảng thống kê lưu lượng visitor_logs...");
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS visitor_logs (
      log_id INT NOT NULL AUTO_INCREMENT,
      ip_address VARCHAR(45) NULL,
      user_agent VARCHAR(255) NULL,
      page_url VARCHAR(255) NOT NULL,
      referrer VARCHAR(255) NULL,
      device_type VARCHAR(20) DEFAULT 'desktop',
      session_id VARCHAR(64) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (log_id),
      KEY ix_visitor_created_at (created_at),
      KEY ix_visitor_page_url (page_url)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  const [[{ count }]] = await db.execute("SELECT COUNT(*) AS count FROM visitor_logs");

  if (Number(count) < 50) {
    console.log("Đang tạo dữ liệu lưu lượng mẫu (7 ngày qua và hôm nay)...");
    const pages = [
      { url: "/", weight: 0.38 },
      { url: "/pages/photographers.html", weight: 0.28 },
      { url: "/pages/booking.html", weight: 0.16 },
      { url: "/pages/blogs.html", weight: 0.12 },
      { url: "/pages/photographer-profile.html", weight: 0.06 },
    ];

    const devices = ["desktop", "mobile", "tablet"];
    const deviceWeights = [0.55, 0.40, 0.05];

    function getRandomItem(items, weights) {
      const rand = Math.random();
      let sum = 0;
      for (let i = 0; i < items.length; i++) {
        sum += weights[i];
        if (rand <= sum) return items[i];
      }
      return items[0];
    }

    // Hourly weight profile (0h to 23h): peak from 19:00 to 22:00, low at 02:00 to 06:00
    const hourlyWeights = [
      0.015, 0.010, 0.005, 0.003, 0.003, 0.008, 0.020, 0.035, // 0 - 7
      0.050, 0.065, 0.070, 0.060, 0.045, 0.050, 0.060, 0.065, // 8 - 15
      0.070, 0.080, 0.090, 0.110, 0.120, 0.090, 0.050, 0.025  // 16 - 23
    ];

    const insertValues = [];
    const now = new Date();

    // Sinh dữ liệu 7 ngày trước đến hôm nay
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      // Số lượng khách mỗi ngày dao động 80 - 180 khách (cuối tuần đông hơn)
      const isWeekend = (now.getDay() - dayOffset + 7) % 7 === 0 || (now.getDay() - dayOffset + 7) % 7 === 6;
      const baseDailyVisits = isWeekend ? 160 + Math.floor(Math.random() * 60) : 100 + Math.floor(Math.random() * 40);

      for (let h = 0; h < 24; h++) {
        // Nếu là hôm nay và chưa đến giờ này thì dừng
        if (dayOffset === 0 && h > now.getHours()) break;

        const hourCount = Math.max(1, Math.round(baseDailyVisits * (hourlyWeights[h] || 0.04)));
        for (let v = 0; v < hourCount; v++) {
          const visitDate = new Date(now);
          visitDate.setDate(visitDate.getDate() - dayOffset);
          visitDate.setHours(h);
          visitDate.setMinutes(Math.floor(Math.random() * 60));
          visitDate.setSeconds(Math.floor(Math.random() * 60));

          const page = getRandomItem(pages.map(p => p.url), pages.map(p => p.weight));
          const device = getRandomItem(devices, deviceWeights);
          const ip = `192.168.${Math.floor(Math.random() * 20) + 1}.${Math.floor(Math.random() * 250) + 1}`;
          const formattedDate = visitDate.toISOString().slice(0, 19).replace('T', ' ');

          insertValues.push([ip, 'Mozilla/5.0 User', page, null, device, 'sess_' + Math.random().toString(36).slice(2, 10), formattedDate]);
        }
      }
    }

    if (insertValues.length) {
      const batchSize = 100;
      for (let i = 0; i < insertValues.length; i += batchSize) {
        const batch = insertValues.slice(i, i + batchSize);
        const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?, ?)").join(", ");
        const flatValues = batch.flat();
        await db.execute(
          `INSERT INTO visitor_logs (ip_address, user_agent, page_url, referrer, device_type, session_id, created_at) VALUES ${placeholders}`,
          flatValues
        );
      }
      console.log(`Đã tạo thành công ${insertValues.length} lượt truy cập mẫu.`);
    }
  } else {
    console.log(`Bảng visitor_logs đã có ${count} bản ghi.`);
  }

  console.log("Hoàn tất thiết lập bảng thống kê lưu lượng!");
}

setupAnalytics()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Lỗi thiết lập analytics:", err);
    process.exit(1);
  });
