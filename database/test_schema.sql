-- Scholarship Test System — Migration
-- Run: mysql -u root -p greenvaley_db < database/test_schema.sql

USE greenvaley_db;

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

-- Test sets (A / B / C etc.)
CREATE TABLE IF NOT EXISTS test_sets (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(10)  NOT NULL,
  program       ENUM('MPC','BiPC') NOT NULL,
  timer_enabled TINYINT(1)   NOT NULL DEFAULT 1,
  duration_mins SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  active        TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

-- Registered students
CREATE TABLE IF NOT EXISTS test_students (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  phone       VARCHAR(15)  NOT NULL UNIQUE,
  email       VARCHAR(100),
  school      VARCHAR(200) NOT NULL,
  program     ENUM('MPC','BiPC') NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Test sessions (renamed to avoid clash with express-mysql-session table)
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
  FOREIGN KEY (set_id) REFERENCES test_sets(id),
  INDEX idx_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Questions drawn for a session
CREATE TABLE IF NOT EXISTS test_session_questions (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id   INT UNSIGNED NOT NULL,
  question_id  INT UNSIGNED NOT NULL,
  section      ENUM('math','physics','chemistry','biology') NOT NULL,
  q_order      TINYINT UNSIGNED NOT NULL,
  FOREIGN KEY (session_id) REFERENCES test_sessions_exam(id) ON DELETE CASCADE,
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
