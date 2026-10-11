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
           INNER JOIN bookings b ON b.booking_id = r.booking_id
           WHERE b.photographer_id = pp.photographer_id
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
