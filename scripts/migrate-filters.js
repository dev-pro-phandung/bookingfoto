const db = require('../config/db');

async function migrate() {
  try {
    try {
      await db.query("ALTER TABLE photographer_profiles ADD COLUMN gender VARCHAR(20) NULL DEFAULT 'Nam'");
      console.log('Added gender column to photographer_profiles');
    } catch (err) {
      if (!err.message.includes('Duplicate column')) {
        console.log('Gender column note:', err.message);
      }
    }

    // Set sample specialties, languages, work_style, experience so filters work realistically with existing data
    await db.query(`
      INSERT INTO photographer_profile_details (photographer_id, bio, specialties, languages, work_style)
      VALUES 
        (2, 'Chuyên chụp cá nhân, ngoại cảnh, kỷ yếu.', 'Cá nhân, Cặp đôi, HSSV', 'Tiếng Việt, Tiếng Anh', 'Cá nhân'),
        (3, 'Đam mê nhiếp ảnh đường phố và phóng sự cưới.', 'Cá nhân, Sự kiện, Gia đình', 'Tiếng Việt', 'Có Ekip'),
        (4, 'Nhiếp ảnh gia chuyên nghiệp thời trang & chân dung.', 'Cá nhân, Cặp đôi, Gia đình, Sự kiện', 'Tiếng Việt, Tiếng Anh, Tiếng Hàn', 'Có Ekip')
      ON DUPLICATE KEY UPDATE
        specialties = VALUES(specialties),
        languages = VALUES(languages),
        work_style = VALUES(work_style)
    `);

    await db.query("UPDATE photographer_profiles SET gender = 'Nam', experience = 'Từ 1-3 năm' WHERE photographer_id = 2");
    await db.query("UPDATE photographer_profiles SET gender = 'Nam', experience = 'Trên 3 năm' WHERE photographer_id = 3");
    await db.query("UPDATE photographer_profiles SET gender = 'Nữ', experience = 'Dưới 1 năm' WHERE photographer_id = 4");

    const [cols] = await db.query('DESCRIBE photographer_profiles');
    console.log('Columns in photographer_profiles:', cols.map(c => c.Field));
    console.log('Filter migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
