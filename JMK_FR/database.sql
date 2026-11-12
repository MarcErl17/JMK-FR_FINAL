-- JMK FR FOODHOUSE - import in phpMyAdmin (Import tab) or: mysql -u root < database.sql
CREATE DATABASE IF NOT EXISTS jmk_fr CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE jmk_fr;

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(100)  NOT NULL,
  username      VARCHAR(30)   NOT NULL,
  email         VARCHAR(150)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,          -- password_hash() output, never plaintext
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS login_attempts (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  identifier   VARCHAR(150) NOT NULL,
  attempted_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_attempts (identifier, attempted_at)
) ENGINE=InnoDB;
