CREATE DATABASE IF NOT EXISTS photo_booking_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE photo_booking_db;

CREATE TABLE IF NOT EXISTS users (
  user_id INT NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(100) NOT NULL,
  dob DATE NULL,
  email VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('client', 'admin', 'photographer') NULL DEFAULT 'client',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_codes (
  user_id INT NOT NULL,
  code_hash CHAR(64) NOT NULL,
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_password_reset_codes_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS photographer_profiles (
  photographer_id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  location VARCHAR(255) NOT NULL,
  experience VARCHAR(50) NOT NULL,
  equipment TEXT NOT NULL,
  portfolio_url VARCHAR(255) NULL,
  status ENUM('pending', 'active', 'inactive') NULL DEFAULT 'pending',
  PRIMARY KEY (photographer_id),
  UNIQUE KEY uq_photographer_profiles_user (user_id),
  CONSTRAINT fk_photographer_profiles_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS photographer_photos (
  photo_id INT NOT NULL AUTO_INCREMENT,
  photographer_id INT NOT NULL,
  photo_url VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (photo_id),
  KEY ix_photographer_photos_profile (photographer_id, photo_id),
  CONSTRAINT fk_photographer_photos_profile
    FOREIGN KEY (photographer_id) REFERENCES photographer_profiles(photographer_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS photographer_profile_details (
  photographer_id INT NOT NULL,
  bio TEXT NULL,
  specialties VARCHAR(255) NULL,
  languages VARCHAR(255) NULL,
  work_style VARCHAR(100) NULL,
  cover_url VARCHAR(500) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (photographer_id),
  CONSTRAINT fk_photographer_profile_details_profile
    FOREIGN KEY (photographer_id) REFERENCES photographer_profiles(photographer_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS services (
  service_id INT NOT NULL AUTO_INCREMENT,
  service_name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  is_active TINYINT(1) NULL DEFAULT 1,
  PRIMARY KEY (service_id),
  UNIQUE KEY uq_services_name (service_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS packages (
  package_id INT NOT NULL AUTO_INCREMENT,
  service_id INT NOT NULL,
  package_name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration_minutes INT NOT NULL,
  max_edited_photos INT NULL DEFAULT 0,
  deliverables_description TEXT NULL,
  is_active TINYINT(1) NULL DEFAULT 1,
  PRIMARY KEY (package_id),
  KEY ix_packages_service_active (service_id, is_active),
  CONSTRAINT fk_packages_service
    FOREIGN KEY (service_id) REFERENCES services(service_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bookings (
  booking_id INT NOT NULL AUTO_INCREMENT,
  booking_code VARCHAR(20) NOT NULL,
  user_id INT NOT NULL,
  package_id INT NOT NULL,
  photographer_id INT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  location VARCHAR(255) NOT NULL,
  notes TEXT NULL,
  status ENUM('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (booking_id),
  UNIQUE KEY uq_bookings_code (booking_code),
  KEY ix_bookings_user (user_id),
  KEY ix_bookings_photographer (photographer_id),
  CONSTRAINT fk_bookings_user
    FOREIGN KEY (user_id) REFERENCES users(user_id),
  CONSTRAINT fk_bookings_package
    FOREIGN KEY (package_id) REFERENCES packages(package_id),
  CONSTRAINT fk_bookings_photographer
    FOREIGN KEY (photographer_id) REFERENCES photographer_profiles(photographer_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS booking_deliverables (
  deliverable_id INT NOT NULL AUTO_INCREMENT,
  booking_id INT NOT NULL,
  raw_photos_link VARCHAR(255) NULL,
  edited_photos_link VARCHAR(255) NULL,
  delivered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (deliverable_id),
  KEY ix_booking_deliverables_booking (booking_id),
  CONSTRAINT fk_booking_deliverables_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  payment_id INT NOT NULL AUTO_INCREMENT,
  booking_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_type ENUM('deposit', 'final_balance') NOT NULL,
  payment_method ENUM('bank_transfer', 'momo', 'cash', 'vnpay') NOT NULL,
  transaction_code VARCHAR(100) NULL,
  status ENUM('pending', 'success', 'failed') NULL DEFAULT 'pending',
  paid_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (payment_id),
  KEY ix_payments_booking (booking_id),
  CONSTRAINT fk_payments_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reviews (
  review_id INT NOT NULL AUTO_INCREMENT,
  booking_id INT NULL,
  photographer_id INT NULL,
  user_id INT NULL,
  client_name VARCHAR(100) NULL,
  rating TINYINT NULL,
  comment TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (review_id),
  KEY ix_reviews_booking (booking_id),
  KEY ix_reviews_photographer (photographer_id),
  KEY ix_reviews_user (user_id),
  CONSTRAINT fk_reviews_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_reviews_photographer
    FOREIGN KEY (photographer_id) REFERENCES photographer_profiles(photographer_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_reviews_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blog_categories (
  category_id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  PRIMARY KEY (category_id),
  UNIQUE KEY uq_blog_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blog_posts (
  post_id INT NOT NULL AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  excerpt TEXT NULL,
  content LONGTEXT NOT NULL,
  feature_image VARCHAR(500) NULL,
  category_id INT NULL,
  author_name VARCHAR(120) NULL,
  reading_time INT NOT NULL DEFAULT 5,
  status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id),
  UNIQUE KEY uq_blog_posts_slug (slug),
  KEY ix_blog_posts_category_status_created (category_id, status, created_at),
  CONSTRAINT fk_blog_posts_category
    FOREIGN KEY (category_id) REFERENCES blog_categories(category_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blog_post_sources (
  post_id INT NOT NULL,
  source_url VARCHAR(2048) NOT NULL,
  PRIMARY KEY (post_id),
  CONSTRAINT fk_blog_post_sources_post
    FOREIGN KEY (post_id) REFERENCES blog_posts(post_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO blog_categories (name, slug) VALUES
  ('Chân dung', 'chan-dung'),
  ('Cặp đôi', 'cap-doi'),
  ('Nhiếp ảnh gia', 'nhiep-anh-gia'),
  ('Kỹ thuật chụp', 'ky-thuat-chup'),
  ('Gia đình', 'gia-dinh')
ON DUPLICATE KEY UPDATE name = VALUES(name);
