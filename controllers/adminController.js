const db = require("../config/db");

exports.getDashboard = async (req, res) => {
  try {
    const [[photographers]] = await db.execute(
      `SELECT
         COUNT(*) AS total,
         SUM(status = 'pending') AS pending,
         SUM(status = 'active') AS active,
         SUM(status = 'inactive') AS inactive
       FROM photographer_profiles`,
    );
    const [[bookings]] = await db.execute(
      `SELECT
         COUNT(*) AS total,
         SUM(status = 'pending') AS pending,
         SUM(status = 'confirmed') AS confirmed,
         SUM(status = 'in_progress') AS inProgress,
         SUM(status = 'completed') AS completed,
         SUM(status = 'cancelled') AS cancelled
       FROM bookings`,
    );
    const [[clients]] = await db.execute("SELECT COUNT(*) AS total FROM users WHERE role = 'client'");
    res.json({ success: true, data: { photographers, bookings, clients } });
  } catch (error) {
    console.error("Lỗi tải tổng quan quản trị:", error);
    res.status(500).json({ success: false, message: "Không thể tải tổng quan quản trị." });
  }
};

exports.listPhotographers = async (req, res) => {
  const allowedStatuses = new Set(["all", "pending", "active", "inactive"]);
  const status = allowedStatuses.has(req.query.status) ? req.query.status : "pending";
  const conditions = status === "all" ? "" : "WHERE pp.status = ?";
  const values = status === "all" ? [] : [status];

  try {
    const [rows] = await db.execute(
      `SELECT
         pp.photographer_id AS id,
         pp.user_id AS userId,
         pp.status,
         pp.location,
         pp.experience,
         pp.equipment,
         pp.portfolio_url AS portfolioUrl,
        u.created_at AS createdAt,
         u.full_name AS name,
         u.email,
         u.phone,
         u.dob,
         d.bio,
         d.specialties,
         d.languages,
         d.work_style AS workStyle,
         COALESCE(d.cover_url, (
           SELECT photo_url FROM photographer_photos pphoto
           WHERE pphoto.photographer_id = pp.photographer_id
           ORDER BY pphoto.photo_id LIMIT 1
         )) AS cover,
         (SELECT COUNT(*) FROM photographer_photos pphoto WHERE pphoto.photographer_id = pp.photographer_id) AS photoCount,
         (SELECT COUNT(*) FROM bookings b WHERE b.photographer_id = pp.photographer_id) AS bookingCount,
         (SELECT COUNT(*) FROM bookings b WHERE b.photographer_id = pp.photographer_id AND b.status = 'completed') AS completedBookingCount,
         COALESCE((
           SELECT AVG(r.rating)
           FROM reviews r
           LEFT JOIN bookings b ON b.booking_id = r.booking_id
           WHERE (r.photographer_id = pp.photographer_id OR b.photographer_id = pp.photographer_id)
         ), 0) AS rating
       FROM photographer_profiles pp
       INNER JOIN users u ON u.user_id = pp.user_id
       LEFT JOIN photographer_profile_details d ON d.photographer_id = pp.photographer_id
       ${conditions}
       ORDER BY FIELD(pp.status, 'pending', 'active', 'inactive'), pp.photographer_id DESC`,
      values,
    );
    res.json({ success: true, data: rows.map((row) => ({
      ...row,
      photoCount: Number(row.photoCount),
      bookingCount: Number(row.bookingCount),
      completedBookingCount: Number(row.completedBookingCount),
      rating: Number(row.rating) || 0,
    })) });
  } catch (error) {
    console.error("Lỗi tải danh sách thợ ảnh quản trị:", error);
    res.status(500).json({ success: false, message: "Không thể tải danh sách thợ ảnh." });
  }
};

exports.getPhotographer = async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ success: false, message: "Mã nhiếp ảnh gia không hợp lệ." });
  }

  try {
    const [rows] = await db.execute(
      `SELECT
         pp.photographer_id AS id,
         pp.user_id AS userId,
         pp.status,
         pp.location,
         pp.experience,
         pp.equipment,
         pp.portfolio_url AS portfolioUrl,
        u.created_at AS createdAt,
         u.full_name AS name,
         u.email,
         u.phone,
         u.dob,
         u.created_at AS accountCreatedAt,
         d.bio,
         d.specialties,
         d.languages,
         d.work_style AS workStyle,
         d.cover_url AS cover,
         (SELECT COUNT(*) FROM bookings b WHERE b.photographer_id = pp.photographer_id) AS bookingCount,
         (SELECT COUNT(*) FROM bookings b WHERE b.photographer_id = pp.photographer_id AND b.status = 'completed') AS completedBookingCount
       FROM photographer_profiles pp
       INNER JOIN users u ON u.user_id = pp.user_id
       LEFT JOIN photographer_profile_details d ON d.photographer_id = pp.photographer_id
       WHERE pp.photographer_id = ?`,
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản thợ ảnh." });

    const [photos] = await db.execute(
      "SELECT photo_url AS url, created_at AS createdAt FROM photographer_photos WHERE photographer_id = ? ORDER BY photo_id",
      [req.params.id],
    );
    res.json({ success: true, data: {
      ...rows[0],
      bookingCount: Number(rows[0].bookingCount),
      completedBookingCount: Number(rows[0].completedBookingCount),
      photos,
    } });
  } catch (error) {
    console.error("Lỗi tải chi tiết thợ ảnh:", error);
    res.status(500).json({ success: false, message: "Không thể tải chi tiết thợ ảnh." });
  }
};

exports.updatePhotographerStatus = async (req, res) => {
  const photographerId = Number(req.params.id);
  const { status } = req.body;
  if (!Number.isInteger(photographerId) || photographerId < 1 || !["active", "inactive"].includes(status)) {
    return res.status(400).json({ success: false, message: "Trạng thái duyệt không hợp lệ." });
  }

  try {
    const [result] = await db.execute(
      "UPDATE photographer_profiles SET status = ? WHERE photographer_id = ?",
      [status, photographerId],
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Không tìm thấy hồ sơ thợ ảnh." });
    const message = status === "active" ? "Đã kích hoạt tài khoản thợ ảnh." : "Đã ngừng kích hoạt tài khoản thợ ảnh.";
    res.json({
      success: true,
      message,
      data: {
        photographerId,
        status,
        message,
      },
    });
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái thợ ảnh:", error);
    res.status(500).json({ success: false, message: "Không thể cập nhật trạng thái thợ ảnh." });
  }
};

exports.listBookings = async (req, res) => {
  const photographerId = req.query.photographerId ? Number(req.query.photographerId) : null;
  const bookingStatus = String(req.query.status || "").trim();
  const conditions = [];
  const values = [];
  if (photographerId !== null) {
    if (!Number.isInteger(photographerId) || photographerId < 1) {
      return res.status(400).json({ success: false, message: "Mã nhiếp ảnh gia không hợp lệ." });
    }
    conditions.push("b.photographer_id = ?");
    values.push(photographerId);
  }
  if (["pending", "confirmed", "in_progress", "completed", "cancelled"].includes(bookingStatus)) {
    conditions.push("b.status = ?");
    values.push(bookingStatus);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const [rows] = await db.execute(
      `SELECT
         b.booking_id AS bookingId,
         b.booking_code AS bookingCode,
         b.booking_date AS bookingDate,
         b.start_time AS startTime,
         b.location,
         b.notes,
         b.status,
         b.created_at AS createdAt,
         package.package_name AS packageName,
         package.price AS packagePrice,
         client.full_name AS clientName,
         client.phone AS clientPhone,
         client.email AS clientEmail,
         pp.photographer_id AS photographerId,
         photographer.full_name AS photographerName
       FROM bookings b
       INNER JOIN packages package ON package.package_id = b.package_id
       INNER JOIN users client ON client.user_id = b.user_id
       LEFT JOIN photographer_profiles pp ON pp.photographer_id = b.photographer_id
       LEFT JOIN users photographer ON photographer.user_id = pp.user_id
       ${whereClause}
       ORDER BY b.booking_date DESC, b.start_time DESC`,
      values,
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Lỗi tải lịch chụp quản trị:", error);
    res.status(500).json({ success: false, message: "Không thể tải lịch chụp." });
  }
};

// API Thống kê lưu lượng khách truy cập (Traffic Analytics)
exports.getAnalytics = async (req, res) => {
  try {
    const period = req.query.period || "7days"; // "today", "7days", "30days"
    const daysLimit = period === "30days" ? 30 : (period === "today" ? 1 : 7);

    // 1. Thống kê hôm nay
    const [[todayRow]] = await db.execute(`
      SELECT 
        COUNT(*) AS todayVisits,
        COUNT(DISTINCT COALESCE(session_id, ip_address)) AS todayUnique
      FROM visitor_logs 
      WHERE DATE(created_at) = CURDATE()
    `);

    // 2. Thống kê hôm qua
    const [[yesterdayRow]] = await db.execute(`
      SELECT 
        COUNT(*) AS yesterdayVisits,
        COUNT(DISTINCT COALESCE(session_id, ip_address)) AS yesterdayUnique
      FROM visitor_logs 
      WHERE DATE(created_at) = SUBDATE(CURDATE(), 1)
    `);

    // 3. Trung bình mỗi ngày trong 7 ngày
    const [[avgRow]] = await db.execute(`
      SELECT AVG(daily_count) AS avgDaily
      FROM (
        SELECT COUNT(*) AS daily_count 
        FROM visitor_logs 
        WHERE created_at >= SUBDATE(CURDATE(), 7)
        GROUP BY DATE(created_at)
      ) AS sub
    `);

    // 4. Lưu lượng theo 24 giờ của hôm nay
    const [hourlyRows] = await db.execute(`
      SELECT 
        HOUR(created_at) AS h, 
        COUNT(*) AS count,
        COUNT(DISTINCT COALESCE(session_id, ip_address)) AS uniqueCount
      FROM visitor_logs 
      WHERE DATE(created_at) = CURDATE()
      GROUP BY HOUR(created_at)
      ORDER BY h ASC
    `);

    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      const match = hourlyRows.find(r => Number(r.h) === hour);
      return {
        hour: `${String(hour).padStart(2, '0')}:00`,
        hourNum: hour,
        visits: match ? Number(match.count) : 0,
        uniqueVisitors: match ? Number(match.uniqueCount) : 0
      };
    });

    // Xác định khung giờ cao điểm nhất hôm nay
    let peakHour = "19:00 - 21:00";
    let peakCount = 0;
    hourlyData.forEach(item => {
      if (item.visits > peakCount) {
        peakCount = item.visits;
        peakHour = `${item.hour} - ${String((item.hourNum + 1) % 24).padStart(2, '0')}:00`;
      }
    });

    // 5. Xu hướng các ngày gần nhất (theo daysLimit)
    const [dailyRows] = await db.execute(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m-%d') AS dateStr,
        DATE_FORMAT(created_at, '%d/%m') AS displayDate,
        DAYOFWEEK(created_at) AS dayOfWeek,
        COUNT(*) AS visits,
        COUNT(DISTINCT COALESCE(session_id, ip_address)) AS uniqueVisitors
      FROM visitor_logs
      WHERE created_at >= SUBDATE(CURDATE(), ?)
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `, [daysLimit - 1]);

    const dayNames = ["", "CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    const dailyTrend = dailyRows.map(r => ({
      dateStr: r.dateStr,
      displayDate: `${dayNames[r.dayOfWeek] || ''} (${r.displayDate})`,
      visits: Number(r.visits),
      uniqueVisitors: Number(r.uniqueVisitors),
      level: Number(r.visits) >= 140 ? 'Cao' : (Number(r.visits) >= 80 ? 'Trung bình' : 'Thấp')
    }));

    // 6. Top trang truy cập nhiều nhất
    const pageNameMap = {
      "/": "Trang chủ Potonow",
      "/pages/photographers.html": "Danh sách Nhiếp ảnh gia",
      "/pages/booking.html": "Trang Đặt lịch chụp",
      "/pages/blogs.html": "Bài viết & Cảm hứng",
      "/pages/photographer-profile.html": "Hồ sơ chi tiết thợ ảnh",
      "/pages/my-bookings.html": "Lịch đặt của tôi",
      "/pages/auth.html": "Trang Đăng nhập / Đăng ký"
    };

    const [topPageRows] = await db.execute(`
      SELECT 
        page_url AS pageUrl,
        COUNT(*) AS visits
      FROM visitor_logs
      WHERE created_at >= SUBDATE(CURDATE(), ?)
      GROUP BY page_url
      ORDER BY visits DESC
      LIMIT 6
    `, [daysLimit - 1]);

    const totalPeriodVisits = topPageRows.reduce((acc, r) => acc + Number(r.visits), 0) || 1;
    const topPages = topPageRows.map(r => ({
      url: r.pageUrl,
      title: pageNameMap[r.pageUrl] || r.pageUrl,
      visits: Number(r.visits),
      percentage: Math.round((Number(r.visits) / totalPeriodVisits) * 100)
    }));

    // 7. Thiết bị truy cập
    const [deviceRows] = await db.execute(`
      SELECT 
        device_type AS deviceType,
        COUNT(*) AS count
      FROM visitor_logs
      WHERE created_at >= SUBDATE(CURDATE(), ?)
      GROUP BY device_type
    `, [daysLimit - 1]);

    const totalDevices = deviceRows.reduce((sum, r) => sum + Number(r.count), 0) || 1;
    const deviceShare = {
      desktop: Math.round(((deviceRows.find(r => r.deviceType === 'desktop')?.count || 0) / totalDevices) * 100),
      mobile: Math.round(((deviceRows.find(r => r.deviceType === 'mobile')?.count || 0) / totalDevices) * 100),
      tablet: Math.round(((deviceRows.find(r => r.deviceType === 'tablet')?.count || 0) / totalDevices) * 100),
    };

    // Đánh giá mức độ lưu lượng (Nhiều hay Ít)
    const todayCount = Number(todayRow?.todayVisits || 0);
    const yesterdayCount = Number(yesterdayRow?.yesterdayVisits || 0);
    const avgCount = Number(avgRow?.avgDaily || 100);

    const periodTotalVisits = dailyTrend.reduce((acc, d) => acc + d.visits, 0);
    const periodDailyAvg = dailyTrend.length ? Math.round(periodTotalVisits / dailyTrend.length) : Math.round(avgCount);

    let trafficLevel = "ỔN ĐỊNH";
    let trafficBadge = "medium";
    let trafficIcon = "⚡";
    let assessmentText = "Lưu lượng khách truy cập ở mức ổn định.";

    if (period === "today") {
      const currentHour = new Date().getHours();
      const hoursElapsed = Math.max(1, currentHour + 1);
      const projectedVisits = Math.round((todayCount / hoursElapsed) * 24);

      if (projectedVisits >= 140 || (yesterdayCount > 0 && todayCount >= yesterdayCount * 1.15)) {
        trafficLevel = "RẤT CAO 🚀";
        trafficBadge = "high";
        trafficIcon = "🚀";
        assessmentText = `Hôm nay lượng khách truy cập RẤT CAO (${todayCount} lượt đến hiện tại, ước tính ~${projectedVisits} lượt cả ngày). Khách hàng tìm kiếm thợ chụp ảnh rất sôi nổi.`;
      } else if (projectedVisits >= 80) {
        trafficLevel = "KHÁ ĐÔNG & ỔN ĐỊNH 📈";
        trafficBadge = "good";
        trafficIcon = "📈";
        assessmentText = `Lượng khách hôm nay DUY TRÌ ỔN ĐỊNH (${todayCount} lượt tính đến hiện tại). Tỷ lệ xem dịch vụ chụp ảnh đồng đều qua các khung giờ.`;
      } else {
        trafficLevel = "THẤP / ÍT KHÁCH 💤";
        trafficBadge = "low";
        trafficIcon = "💤";
        assessmentText = `Lượng khách hôm nay đang THẤP (${todayCount} lượt). Phù hợp để đăng thêm bài viết mới hoặc tạo gói chụp ưu đãi kích cầu.`;
      }
    } else {
      // Đánh giá theo 7 ngày hoặc 30 ngày
      if (periodDailyAvg >= 130) {
        trafficLevel = "RẤT CAO (ĐÔNG KHÁCH) 🚀";
        trafficBadge = "high";
        trafficIcon = "🚀";
        assessmentText = `Lưu lượng ${daysLimit} ngày qua ĐẠT MỨC CAO với trung bình ~${periodDailyAvg} lượt truy cập/ngày (tổng ${new Intl.NumberFormat('vi-VN').format(periodTotalVisits)} lượt). Nhu cầu tìm thợ và book lịch đang tăng mạnh!`;
      } else if (periodDailyAvg >= 75) {
        trafficLevel = "TỐT & ỔN ĐỊNH 📈";
        trafficBadge = "good";
        trafficIcon = "📈";
        assessmentText = `Lưu lượng ${daysLimit} ngày qua DUY TRÌ ỔN ĐỊNH với trung bình ~${periodDailyAvg} lượt truy cập/ngày (tổng ${new Intl.NumberFormat('vi-VN').format(periodTotalVisits)} lượt). Nền tảng hoạt động hiệu quả.`;
      } else {
        trafficLevel = "THẤP / CẦN THÚC ĐẨY 💤";
        trafficBadge = "low";
        trafficIcon = "💤";
        assessmentText = `Lưu lượng ${daysLimit} ngày qua ở mức THẤP (trung bình ~${periodDailyAvg} lượt/ngày). Lượng khách ghé thăm còn ít, cần đẩy mạnh quảng bá dịch vụ.`;
      }
    }

    const growthPercent = yesterdayCount > 0 
      ? Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100) 
      : 0;

    res.json({
      success: true,
      data: {
        summary: {
          todayVisits: todayCount,
          todayUnique: Number(todayRow?.todayUnique || 0),
          yesterdayVisits: yesterdayCount,
          growthPercent,
          trafficLevel,
          trafficBadge,
          trafficIcon,
          assessmentText,
          peakHour,
          peakCount,
          periodDays: daysLimit,
        },
        hourlyData,
        dailyTrend,
        topPages,
        deviceShare
      }
    });
  } catch (error) {
    console.error("Lỗi lấy dữ liệu thống kê lưu lượng:", error);
    res.status(500).json({ success: false, message: "Không thể tải dữ liệu thống kê." });
  }
};
