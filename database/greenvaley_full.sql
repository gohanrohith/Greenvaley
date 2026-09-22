-- ============================================================
--  Greenvaley Junior College — Complete Database Schema
--  Import via phpMyAdmin: select greenvaley_db (or create it
--  first), then use the Import tab and upload this file.
-- ============================================================

CREATE DATABASE IF NOT EXISTS greenvaley_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE greenvaley_db;

-- ────────────────────────────────────────────────────────────
--  SECTION 1 · CORE SITE TABLES
-- ────────────────────────────────────────────────────────────

-- Sessions (managed by express-mysql-session)
CREATE TABLE IF NOT EXISTS sessions (
  session_id  VARCHAR(128)     NOT NULL PRIMARY KEY,
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
  image       VARCHAR(255),
  published   TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX IF NOT EXISTS news_slug ON news(slug);

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
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  designation    VARCHAR(100),
  department     VARCHAR(100),
  qualification  VARCHAR(150),
  photo          VARCHAR(255),
  sort_order     INT NOT NULL DEFAULT 0,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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

-- Question papers
CREATE TABLE IF NOT EXISTS question_papers (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  subject     VARCHAR(100) NOT NULL,
  program     ENUM('MPC','BiPC','Both') NOT NULL DEFAULT 'Both',
  year        YEAR NOT NULL,
  exam_type   VARCHAR(50),
  filename    VARCHAR(255) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Exam results
CREATE TABLE IF NOT EXISTS exam_results (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  roll_number       VARCHAR(50)  NOT NULL,
  name              VARCHAR(100) NOT NULL,
  program           ENUM('MPC','BiPC') NOT NULL,
  exam_type         VARCHAR(50)  NOT NULL,
  year              YEAR NOT NULL,
  marks_physics     TINYINT UNSIGNED,
  marks_chemistry   TINYINT UNSIGNED,
  marks_maths       TINYINT UNSIGNED,
  marks_biology     TINYINT UNSIGNED,
  marks_english     TINYINT UNSIGNED,
  marks_second_lang TINYINT UNSIGNED,
  total_marks       SMALLINT UNSIGNED,
  max_marks         SMALLINT UNSIGNED,
  grade             VARCHAR(10),
  published         TINYINT(1) NOT NULL DEFAULT 0,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY result_unique (roll_number, exam_type, year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX IF NOT EXISTS results_roll ON exam_results(roll_number);

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
  rank_label  VARCHAR(60)  NOT NULL,
  score       VARCHAR(50),
  highlight   VARCHAR(100),
  year        YEAR         NOT NULL,
  program     ENUM('MPC','BiPC') NOT NULL,
  published   TINYINT(1)   NOT NULL DEFAULT 1,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Scholarship sanction details
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

-- Default admin  (login: admin / admin123 — change after first login)
INSERT IGNORE INTO admins (name, username, password_hash, role)
VALUES ('Administrator', 'admin',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RX.PkImEW', 'super');


-- ────────────────────────────────────────────────────────────
--  SECTION 2 · SCHOLARSHIP TEST SYSTEM
-- ────────────────────────────────────────────────────────────

-- Question bank
CREATE TABLE IF NOT EXISTS test_questions (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  program     ENUM('MPC','BiPC','both') NOT NULL DEFAULT 'both',
  section     ENUM('math','physics','chemistry','biology') NOT NULL,
  difficulty  ENUM('hard','medium','easy') NOT NULL,
  question    TEXT NOT NULL,
  option_a    TEXT NOT NULL,
  option_b    TEXT NOT NULL,
  option_c    TEXT NOT NULL,
  option_d    TEXT NOT NULL,
  correct     ENUM('A','B','C','D') NOT NULL,
  active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tq_pool (section, difficulty, active, program)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Test sets (A / B / C …)
CREATE TABLE IF NOT EXISTS test_sets (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(10)      NOT NULL,
  program       ENUM('MPC','BiPC') NOT NULL,
  timer_enabled TINYINT(1)       NOT NULL DEFAULT 1,
  duration_mins SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  active        TINYINT(1)       NOT NULL DEFAULT 1,
  created_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY set_prog (name, program)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Per-section difficulty rules for each set
CREATE TABLE IF NOT EXISTS test_set_rules (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  set_id      INT UNSIGNED NOT NULL,
  section     ENUM('math','physics','chemistry','biology') NOT NULL,
  total_qs    TINYINT UNSIGNED NOT NULL DEFAULT 15,
  hard_pct    TINYINT UNSIGNED NOT NULL DEFAULT 60,
  medium_pct  TINYINT UNSIGNED NOT NULL DEFAULT 20,
  easy_pct    TINYINT UNSIGNED NOT NULL DEFAULT 20,
  FOREIGN KEY (set_id) REFERENCES test_sets(id) ON DELETE CASCADE,
  UNIQUE KEY rule_section (set_id, section)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Registered test students
CREATE TABLE IF NOT EXISTS test_students (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  phone       VARCHAR(15)  NOT NULL UNIQUE,
  email       VARCHAR(100),
  school      VARCHAR(200) NOT NULL,
  program     ENUM('MPC','BiPC') NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Test sessions (named to avoid clash with express-mysql-session table)
CREATE TABLE IF NOT EXISTS test_sessions_exam (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id   INT UNSIGNED NOT NULL,
  set_id       INT UNSIGNED NOT NULL,
  token        VARCHAR(64)  NOT NULL UNIQUE,
  start_time   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at   DATETIME     NOT NULL,
  status       ENUM('in_progress','submitted','expired') NOT NULL DEFAULT 'in_progress',
  submitted_at DATETIME,
  sec1_score   TINYINT UNSIGNED,
  sec2_score   TINYINT UNSIGNED,
  sec3_score   TINYINT UNSIGNED,
  total_score  TINYINT UNSIGNED,
  FOREIGN KEY (student_id) REFERENCES test_students(id),
  FOREIGN KEY (set_id)     REFERENCES test_sets(id),
  INDEX idx_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Questions drawn for a session
CREATE TABLE IF NOT EXISTS test_session_questions (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id   INT UNSIGNED NOT NULL,
  question_id  INT UNSIGNED NOT NULL,
  section      ENUM('math','physics','chemistry','biology') NOT NULL,
  q_order      TINYINT UNSIGNED NOT NULL,
  FOREIGN KEY (session_id)  REFERENCES test_sessions_exam(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES test_questions(id),
  UNIQUE KEY sq_order (session_id, section, q_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Auto-saved answers
CREATE TABLE IF NOT EXISTS test_answers (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id  INT UNSIGNED NOT NULL,
  question_id INT UNSIGNED NOT NULL,
  answer      ENUM('A','B','C','D') NOT NULL,
  saved_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES test_sessions_exam(id) ON DELETE CASCADE,
  UNIQUE KEY ans_unique (session_id, question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
