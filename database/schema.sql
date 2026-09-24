-- Greenvaley Junior College — Database Schema
-- Run: mysql -u root -p greenvaley_db < database/schema.sql

CREATE DATABASE IF NOT EXISTS greenvaley_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE greenvaley_db;

-- Sessions (managed by express-mysql-session)
CREATE TABLE IF NOT EXISTS sessions (
  session_id  VARCHAR(128)  NOT NULL PRIMARY KEY,
  expires     INT(11) UNSIGNED NOT NULL,
  data        MEDIUMTEXT,
  INDEX sessions_expires (expires)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Admin users
CREATE TABLE IF NOT EXISTS admins (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('super','editor') NOT NULL DEFAULT 'editor',
  avatar        VARCHAR(255),
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Settings / key-value store
CREATE TABLE IF NOT EXISTS settings (
  `key`   VARCHAR(100) NOT NULL PRIMARY KEY,
  value   TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- News / announcements
CREATE TABLE IF NOT EXISTS news (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) NOT NULL UNIQUE,
  excerpt     VARCHAR(500),
  content     LONGTEXT,
  content_hi  MEDIUMTEXT,
  content_te  MEDIUMTEXT,
  image       VARCHAR(255),
  published   TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- Run if DB already exists (pre-trilingual):
-- ALTER TABLE news ADD COLUMN excerpt VARCHAR(500) DEFAULT NULL AFTER slug;
-- ALTER TABLE news ADD COLUMN content_hi MEDIUMTEXT DEFAULT NULL AFTER content;
-- ALTER TABLE news ADD COLUMN content_te MEDIUMTEXT DEFAULT NULL AFTER content_hi;
CREATE INDEX news_slug ON news(slug);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  event_date  DATE NOT NULL,
  venue       VARCHAR(255),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Faculty
CREATE TABLE IF NOT EXISTS faculty (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  designation VARCHAR(100),
  department  VARCHAR(100),
  qualification VARCHAR(150),
  photo       VARCHAR(255),
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Gallery albums
CREATE TABLE IF NOT EXISTS gallery_albums (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  cover_photo INT UNSIGNED,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Gallery photos
CREATE TABLE IF NOT EXISTS gallery_photos (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  album_id    INT UNSIGNED NOT NULL,
  filename    VARCHAR(255) NOT NULL,
  caption     VARCHAR(255),
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (album_id) REFERENCES gallery_albums(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- Run if DB already exists: ALTER TABLE gallery_photos ADD COLUMN sort_order INT NOT NULL DEFAULT 0;

-- Question papers
CREATE TABLE IF NOT EXISTS question_papers (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  subject     VARCHAR(100) NOT NULL,
  program     ENUM('MPC','BiPC','Both') NOT NULL DEFAULT 'Both',
  year        YEAR NOT NULL,
  exam_type   VARCHAR(50),          -- e.g. "March", "May", "IPE", "Model"
  filename    VARCHAR(255) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Exam results
CREATE TABLE IF NOT EXISTS exam_results (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  roll_number      VARCHAR(50)  NOT NULL,
  name             VARCHAR(100) NOT NULL,
  program          ENUM('MPC','BiPC') NOT NULL,
  exam_type        VARCHAR(50)  NOT NULL,  -- "IPE March", "IPE May", etc.
  year             YEAR NOT NULL,
  marks_physics    TINYINT UNSIGNED,
  marks_chemistry  TINYINT UNSIGNED,
  marks_maths      TINYINT UNSIGNED,
  marks_biology    TINYINT UNSIGNED,
  marks_english    TINYINT UNSIGNED,
  marks_second_lang TINYINT UNSIGNED,
  total_marks      SMALLINT UNSIGNED,
  max_marks        SMALLINT UNSIGNED,
  grade            VARCHAR(10),
  published        TINYINT(1) NOT NULL DEFAULT 0,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY result_unique (roll_number, exam_type, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX results_roll ON exam_results(roll_number);

-- Scholarship applications
CREATE TABLE IF NOT EXISTS scholarship_applications (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(100) NOT NULL,
  dob              DATE NOT NULL,
  program          ENUM('MPC','BiPC') NOT NULL,
  roll_number      VARCHAR(50),
  father_name      VARCHAR(100) NOT NULL,
  mother_name      VARCHAR(100),
  phone            VARCHAR(15)  NOT NULL,
  email            VARCHAR(100),
  address          TEXT NOT NULL,
  annual_income    DECIMAL(10,2),
  caste_category   VARCHAR(50),
  bank_account     VARCHAR(50),
  bank_ifsc        VARCHAR(20),
  bank_name        VARCHAR(100),
  status           ENUM('pending','under_review','approved','sanctioned','rejected')
                   NOT NULL DEFAULT 'pending',
  admin_remarks    TEXT,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Competitive exam / board toppers
CREATE TABLE IF NOT EXISTS toppers (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  photo       VARCHAR(255),
  exam        ENUM('JEE Main','JEE Advanced','NEET','EAPCET','Board') NOT NULL,
  rank_label  VARCHAR(60)  NOT NULL,   -- e.g. 'AIR 1543', 'State Rank 3', '99.8 Percentile'
  score       VARCHAR(50),             -- e.g. '310/360', '98.7%'
  highlight   VARCHAR(100),            -- e.g. 'Telangana State Topper'
  year        YEAR         NOT NULL,
  program     ENUM('MPC','BiPC')       NOT NULL,
  published   TINYINT(1)   NOT NULL DEFAULT 1,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Scholarship results / sanction details
CREATE TABLE IF NOT EXISTS scholarship_results (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  application_id    INT UNSIGNED NOT NULL UNIQUE,
  scholarship_type  VARCHAR(100),
  amount            DECIMAL(10,2),
  disbursement_date DATE,
  remarks           TEXT,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES scholarship_applications(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Contact enquiries
CREATE TABLE IF NOT EXISTS contact_enquiries (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(100),
  phone       VARCHAR(15),
  subject     VARCHAR(200),
  message     TEXT NOT NULL,
  seen        TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Default admin (username: admin / password: admin123 — CHANGE IMMEDIATELY)
INSERT IGNORE INTO admins (name, username, password_hash, role)
VALUES ('Administrator', 'admin',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RX.PkImEW', 'super');
-- Password hash above = 'admin123' — run: node -e "const b=require('bcrypt');b.hash('admin123',12).then(console.log)"
