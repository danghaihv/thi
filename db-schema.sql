-- SePay Webhook Database Schema
CREATE DATABASE IF NOT EXISTS sepay_webhook CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE sepay_webhook;

-- Transactions table: lưu tất cả giao dịch từ SePay
CREATE TABLE IF NOT EXISTS transactions (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    sepay_id        BIGINT NOT NULL UNIQUE,
    gateway         VARCHAR(100) NOT NULL,
    transaction_date DATETIME NOT NULL,
    account_number  VARCHAR(100),
    sub_account     VARCHAR(250),
    code            VARCHAR(250),
    amount_in       BIGINT NOT NULL DEFAULT 0,
    amount_out      BIGINT NOT NULL DEFAULT 0,
    accumulated     BIGINT NOT NULL DEFAULT 0,
    content         TEXT,
    reference_code  VARCHAR(255),
    body            JSON NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_account (account_number, transaction_date),
    INDEX idx_sepay_id (sepay_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Orders table: lưu đơn hàng (ví dụ)
CREATE TABLE IF NOT EXISTS orders (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         VARCHAR(255) NOT NULL,
    code            VARCHAR(250) NOT NULL UNIQUE,
    amount          BIGINT NOT NULL,
    status          ENUM('pending', 'paid', 'failed', 'cancelled') DEFAULT 'pending',
    paid_at         DATETIME NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_code (code),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Payment attempts table: theo dõi các lần thử thanh toán
CREATE TABLE IF NOT EXISTS payment_attempts (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    sepay_tx_id     BIGINT,
    order_code      VARCHAR(250),
    amount_required BIGINT NOT NULL,
    amount_received BIGINT NOT NULL,
    status          ENUM('success', 'insufficient', 'failed') DEFAULT 'failed',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sepay_tx_id (sepay_tx_id),
    INDEX idx_order_code (order_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
