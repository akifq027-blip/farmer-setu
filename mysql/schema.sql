-- ==============================================================================
-- KisanSetu - Farmer Procurement & Token Queue Management System
-- Aiven MySQL 8.x Production Schema & Seed Data
-- ==============================================================================

-- Create Database if not exists (for local or custom setup)
CREATE DATABASE IF NOT EXISTS defaultdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE defaultdb;

-- ------------------------------------------------------------------------------
-- Table 1: farmers (Farmer Profiles & Authentication)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS farmers (
    id VARCHAR(36) PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    mobile_number VARCHAR(15) NOT NULL UNIQUE,
    email VARCHAR(150) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    village VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    land_record_id VARCHAR(50),
    preferred_language VARCHAR(10) DEFAULT 'en', -- 'en', 'te', 'hi', 'pa', 'mr'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    INDEX idx_farmers_mobile (mobile_number),
    INDEX idx_farmers_district (district)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table 2: procurement_centers (Procurement Centers / Mandis / Purchase Yards)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS procurement_centers (
    id VARCHAR(36) PRIMARY KEY,
    center_name VARCHAR(200) NOT NULL,
    location VARCHAR(255) NOT NULL,
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    in_charge_name VARCHAR(150) NOT NULL,
    crops_accepted JSON NOT NULL, -- JSON array: ["Paddy", "Wheat", "Maize"]
    opening_time VARCHAR(20) DEFAULT '08:30 AM',
    closing_time VARCHAR(20) DEFAULT '05:30 PM',
    daily_capacity_quintals INT DEFAULT 500,
    google_maps_url TEXT,
    status VARCHAR(30) DEFAULT 'Open', -- 'Open', 'Closed', 'Capacity Full'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    INDEX idx_centers_state_district (state, district),
    INDEX idx_centers_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table 3: procurement_schedules (Date-wise procurement slots per center)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS procurement_schedules (
    id VARCHAR(36) PRIMARY KEY,
    center_id VARCHAR(36) NOT NULL,
    crop_name VARCHAR(100) NOT NULL,
    procurement_date DATE NOT NULL,
    start_time VARCHAR(20) DEFAULT '08:30 AM',
    end_time VARCHAR(20) DEFAULT '05:30 PM',
    available_slots INT NOT NULL DEFAULT 50,
    remaining_slots INT NOT NULL DEFAULT 50,
    status VARCHAR(30) DEFAULT 'Available', -- 'Available', 'Limited', 'Full', 'Rescheduled'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (center_id) REFERENCES procurement_centers(id) ON DELETE CASCADE,
    INDEX idx_schedules_center_crop (center_id, crop_name, procurement_date),
    INDEX idx_schedules_date (procurement_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table 4: procurement_requests (Farmer Crop Drop-off Booking & Live Token)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS procurement_requests (
    id VARCHAR(36) PRIMARY KEY,
    farmer_id VARCHAR(36) NOT NULL,
    center_id VARCHAR(36) NOT NULL,
    crop_name VARCHAR(100) NOT NULL,
    quantity_quintals DECIMAL(10, 2) NOT NULL,
    preferred_date DATE NOT NULL,
    transport_mode VARCHAR(50) DEFAULT 'Tractor', -- 'Tractor', 'Bullock Cart', 'Small Commercial Vehicle', 'Truck'
    vehicle_number VARCHAR(50),
    token_number VARCHAR(20) NOT NULL, -- e.g. 'A-104', 'P-202'
    status VARCHAR(30) DEFAULT 'Request Submitted',
    -- Status progression: 'Request Submitted' -> 'Token Assigned' -> 'Scheduled' -> 'In Queue' -> 'Processing' -> 'Completed' (or 'Rejected')
    queue_position INT DEFAULT 0,
    estimated_waiting_minutes INT DEFAULT 0,
    admin_notes TEXT,
    gate_entry_time DATETIME NULL,
    weighment_completed_time DATETIME NULL,
    payment_status VARCHAR(30) DEFAULT 'Pending', -- 'Pending', 'Verified', 'Credited via DBT'
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE,
    FOREIGN KEY (center_id) REFERENCES procurement_centers(id) ON DELETE RESTRICT,
    INDEX idx_requests_farmer (farmer_id),
    INDEX idx_requests_center (center_id),
    INDEX idx_requests_token (token_number),
    INDEX idx_requests_status (status),
    INDEX idx_requests_date (preferred_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table 5: announcements (Center & Government Agricultural Updates)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'Normal', -- 'Urgent', 'Normal', 'Info'
    announcement_date DATE NOT NULL,
    center_id VARCHAR(36) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (center_id) REFERENCES procurement_centers(id) ON DELETE SET NULL,
    INDEX idx_announcements_date (announcement_date DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table 6: admin_users (Authorized Procurement & Mandi Officers)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
    id VARCHAR(36) PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Procurement Officer', -- 'Super Admin', 'Procurement Officer', 'Weighbridge Operator'
    assigned_center_id VARCHAR(36) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (assigned_center_id) REFERENCES procurement_centers(id) ON DELETE SET NULL,
    INDEX idx_admin_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- Initial Seed Data (Realistic Indian Agriculture Procurement Dataset)
-- ==============================================================================

-- 1. Procurement Centers
INSERT IGNORE INTO procurement_centers (id, center_name, location, district, state, contact_number, in_charge_name, crops_accepted, opening_time, closing_time, daily_capacity_quintals, google_maps_url, status)
VALUES
('c1111111-1111-1111-1111-111111111111', 'APMC Main Agricultural Yard - Warangal', 'Mandi Road, Enumamula', 'Warangal', 'Telangana', '9848012345', 'Shri R. Prabhakar Rao', '["Paddy", "Cotton", "Maize", "Chilli"]', '08:00 AM', '06:00 PM', 1200, 'https://maps.google.com/?q=Enumamula+Mandi+Warangal', 'Open'),
('c2222222-2222-2222-2222-222222222222', 'Kurnool District Farmer Grain Purchase Center', 'Near Market Yard, Nandyal Road', 'Kurnool', 'Andhra Pradesh', '9849023456', 'Smt. K. Sarojini Devi', '["Paddy", "Bengal Gram", "Sunflower", "Maize"]', '08:30 AM', '05:30 PM', 800, 'https://maps.google.com/?q=Kurnool+Market+Yard', 'Open'),
('c3333333-3333-3333-3333-333333333333', 'Guntur Cotton & Grain Procurement Center', 'Mirchi Yard Complex, GT Road', 'Guntur', 'Andhra Pradesh', '9848034567', 'Shri V. Venkateswarlu', '["Cotton", "Paddy", "Black Gram", "Turmeric"]', '08:00 AM', '05:00 PM', 1000, 'https://maps.google.com/?q=Guntur+Mirchi+Yard', 'Open'),
('c4444444-4444-4444-4444-444444444444', 'Indore Krishi Upaj Mandi Procurement Hub', 'Sanwer Road Sector C', 'Indore', 'Madhya Pradesh', '9826045678', 'Shri Anand Sharma', '["Wheat", "Soybean", "Gram", "Mustard"]', '08:30 AM', '06:00 PM', 1500, 'https://maps.google.com/?q=Indore+Krishi+Upaj+Mandi', 'Open'),
('c5555555-5555-5555-5555-555555555555', 'Karnal Grain Mandi - Wheat & Paddy Center', 'Railway Station Road', 'Karnal', 'Haryana', '9812056789', 'Shri Gurpreet Singh', '["Wheat", "Paddy (Basmati)", "Mustard"]', '07:30 AM', '06:30 PM', 2000, 'https://maps.google.com/?q=Karnal+New+Grain+Market', 'Open');

-- 2. Farmers
INSERT IGNORE INTO farmers (id, full_name, mobile_number, email, password_hash, village, district, state, land_record_id, preferred_language)
VALUES
('f1111111-1111-1111-1111-111111111111', 'Ramesh Kumar Goud', '9876543210', 'ramesh.farmer@example.com', 'password123', 'Velair', 'Warangal', 'Telangana', 'TS-WGL-2024-8891', 'en'),
('f2222222-2222-2222-2222-222222222222', 'Lakshmi Devi Reddy', '9876543211', 'lakshmi.reddy@example.com', 'password123', 'Orvakal', 'Kurnool', 'Andhra Pradesh', 'AP-KNL-2024-4412', 'te'),
('f3333333-3333-3333-3333-333333333333', 'Suresh Chandra Yadav', '9876543212', 'suresh.yadav@example.com', 'password123', 'Depalpur', 'Indore', 'Madhya Pradesh', 'MP-IND-2024-1109', 'hi');

-- 3. Admin Users
INSERT IGNORE INTO admin_users (id, full_name, email, password_hash, role, assigned_center_id)
VALUES
('a1111111-1111-1111-1111-111111111111', 'Procurement Officer Akif Quadri', 'akifquadri000@gmail.com', '6472425227', 'Super Admin', 'c1111111-1111-1111-1111-111111111111'),
('a2222222-2222-2222-2222-222222222222', 'Officer K. Ramanathan', 'admin@kisanprocure.gov.in', 'admin123', 'Super Admin', 'c1111111-1111-1111-1111-111111111111');

-- 4. Procurement Schedules
INSERT IGNORE INTO procurement_schedules (id, center_id, crop_name, procurement_date, start_time, end_time, available_slots, remaining_slots, status)
VALUES
('s1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Paddy (Grade A)', CURRENT_DATE, '08:30 AM', '05:30 PM', 60, 14, 'Limited'),
('s2222222-2222-2222-2222-222222222222', 'c1111111-1111-1111-1111-111111111111', 'Cotton (Medium Staple)', DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), '09:00 AM', '05:00 PM', 50, 38, 'Available'),
('s3333333-3333-3333-3333-333333333333', 'c1111111-1111-1111-1111-111111111111', 'Maize', DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY), '08:30 AM', '04:30 PM', 40, 32, 'Available'),
('s4444444-4444-4444-4444-444444444444', 'c2222222-2222-2222-2222-222222222222', 'Paddy (Common)', CURRENT_DATE, '08:30 AM', '05:30 PM', 50, 8, 'Limited'),
('s5555555-5555-5555-5555-555555555555', 'c2222222-2222-2222-2222-222222222222', 'Bengal Gram', DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), '09:00 AM', '05:00 PM', 45, 41, 'Available'),
('s6666666-6666-6666-6666-666666666666', 'c4444444-4444-4444-4444-444444444444', 'Soybean (Yellow)', CURRENT_DATE, '08:00 AM', '06:00 PM', 75, 4, 'Limited'),
('s7777777-7777-7777-7777-777777777777', 'c4444444-4444-4444-4444-444444444444', 'Wheat (Sharbati)', DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), '08:00 AM', '06:00 PM', 80, 65, 'Available');

-- 5. Procurement Requests (with Live Token & Queue Numbers)
INSERT IGNORE INTO procurement_requests (id, farmer_id, center_id, crop_name, quantity_quintals, preferred_date, transport_mode, vehicle_number, token_number, status, queue_position, estimated_waiting_minutes, admin_notes, payment_status)
VALUES
('r1111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Paddy (Grade A)', 85.50, CURRENT_DATE, 'Tractor Trolley', 'TS-03-AB-4512', 'A-104', 'In Queue', 3, 45, 'Gate entry completed at 09:15 AM. Moisture tested at 14.2% (Passed standard).', 'Pending'),
('r2222222-2222-2222-2222-222222222222', 'f1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Maize', 40.00, DATE_SUB(CURRENT_DATE, INTERVAL 14 DAY), 'Tractor', 'TS-03-AB-4512', 'M-089', 'Completed', 0, 0, '40.00 Quintals procured at MSP. Weighment slip #7712 issued. Direct DBT credited.', 'Credited via DBT'),
('r3333333-3333-3333-3333-333333333333', 'f2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Paddy (Common)', 120.00, CURRENT_DATE, 'Small Truck', 'AP-21-TX-9081', 'K-201', 'Processing', 1, 15, 'Vehicle placed on weighbridge #2. Gross weight recorded.', 'Pending'),
('r4444444-4444-4444-4444-444444444444', 'f3333333-3333-3333-3333-333333333333', 'c4444444-4444-4444-4444-444444444444', 'Soybean (Yellow)', 65.00, DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), 'Tractor', 'MP-09-KA-3321', 'S-312', 'Scheduled', 0, 0, 'Token assigned for tomorrow 09:00 AM slot. Please carry Aadhaar and Bank passbook copy.', 'Pending');

-- 6. Announcements
INSERT IGNORE INTO announcements (id, title, message, priority, announcement_date, center_id)
VALUES
('m1111111-1111-1111-1111-111111111111', 'Extra Weighment Counters Opened at Warangal Center', 'Due to high arrivals of Paddy (Grade A), two additional weighbridge electronic counters have been activated today to reduce waiting time.', 'Urgent', CURRENT_DATE, 'c1111111-1111-1111-1111-111111111111'),
('m2222222-2222-2222-2222-222222222222', 'Moisture Standards Notice for Paddy & Soybean', 'Farmers are requested to ensure crop moisture content is below 17% for Paddy and 12% for Soybean before arriving at the center.', 'Normal', DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), NULL),
('m3333333-3333-3333-3333-333333333333', 'Direct Benefit Transfer (DBT) Payment Timeline', 'All MSP procurement payments for approved weighment slips will be credited directly to registered farmer bank accounts within 48 to 72 bank hours.', 'Info', DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY), NULL);
