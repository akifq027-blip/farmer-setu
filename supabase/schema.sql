-- ==============================================================================
-- KisanSetu - Farmer Procurement & Token Queue Management System
-- Supabase PostgreSQL Schema with Row Level Security (RLS) & Seed Data
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- Table 1: farmers (Farmer Profiles)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS farmers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(150) NOT NULL,
    mobile_number VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    village VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    land_record_id VARCHAR(50),
    preferred_language VARCHAR(10) DEFAULT 'en', -- 'en', 'te', 'hi'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- Table 2: procurement_centers (Procurement Centers / Mandis / Purchase Centers)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS procurement_centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    center_name VARCHAR(200) NOT NULL,
    location VARCHAR(255) NOT NULL,
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    in_charge_name VARCHAR(150) NOT NULL,
    crops_accepted TEXT[] NOT NULL, -- e.g. ARRAY['Paddy', 'Wheat', 'Maize']
    opening_time VARCHAR(20) DEFAULT '08:30 AM',
    closing_time VARCHAR(20) DEFAULT '05:30 PM',
    daily_capacity_quintals INT DEFAULT 500,
    google_maps_url TEXT,
    status VARCHAR(20) DEFAULT 'Open', -- 'Open', 'Closed', 'Capacity Full'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- Table 3: procurement_schedules (Date-wise procurement slots)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS procurement_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    center_id UUID REFERENCES procurement_centers(id) ON DELETE CASCADE NOT NULL,
    crop_name VARCHAR(100) NOT NULL,
    procurement_date DATE NOT NULL,
    start_time VARCHAR(20) DEFAULT '08:30 AM',
    end_time VARCHAR(20) DEFAULT '05:30 PM',
    available_slots INT NOT NULL DEFAULT 50,
    remaining_slots INT NOT NULL DEFAULT 50,
    status VARCHAR(30) DEFAULT 'Available', -- 'Available', 'Limited', 'Full', 'Rescheduled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- Table 4: procurement_requests (Farmer Crop Drop-off Booking & Live Token)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS procurement_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE NOT NULL,
    center_id UUID REFERENCES procurement_centers(id) ON DELETE RESTRICT NOT NULL,
    crop_name VARCHAR(100) NOT NULL,
    quantity_quintals NUMERIC(10, 2) NOT NULL,
    preferred_date DATE NOT NULL,
    transport_mode VARCHAR(50) DEFAULT 'Tractor', -- 'Tractor', 'Bullock Cart', 'Small Commercial Vehicle', 'Truck'
    vehicle_number VARCHAR(50),
    token_number VARCHAR(20) NOT NULL, -- e.g. 'A-104', 'P-202'
    status VARCHAR(30) DEFAULT 'Request Submitted',
    -- Status progression: 'Request Submitted' -> 'Token Assigned' -> 'Scheduled' -> 'In Queue' -> 'Processing' -> 'Completed' (or 'Rejected')
    queue_position INT DEFAULT 0,
    estimated_waiting_minutes INT DEFAULT 0,
    admin_notes TEXT,
    gate_entry_time TIMESTAMP WITH TIME ZONE,
    weighment_completed_time TIMESTAMP WITH TIME ZONE,
    payment_status VARCHAR(30) DEFAULT 'Pending', -- 'Pending', 'Verified', 'Credited via DBT'
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- Table 5: announcements (Center & Authority Updates)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'Normal', -- 'Urgent', 'Normal', 'Info'
    announcement_date DATE DEFAULT CURRENT_DATE,
    center_id UUID REFERENCES procurement_centers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- Table 6: admin_users (Authorized Procurement Officers)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Procurement Officer', -- 'Super Admin', 'Procurement Officer', 'Weighbridge Operator'
    assigned_center_id UUID REFERENCES procurement_centers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- Indexes for High Performance Search & Filtering
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_farmers_mobile ON farmers(mobile_number);
CREATE INDEX IF NOT EXISTS idx_requests_farmer ON procurement_requests(farmer_id);
CREATE INDEX IF NOT EXISTS idx_requests_token ON procurement_requests(token_number);
CREATE INDEX IF NOT EXISTS idx_requests_status ON procurement_requests(status);
CREATE INDEX IF NOT EXISTS idx_schedules_center_crop ON procurement_schedules(center_id, crop_name, procurement_date);
CREATE INDEX IF NOT EXISTS idx_announcements_date ON announcements(announcement_date DESC);

-- ------------------------------------------------------------------------------
-- Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Farmers Policy: Can view and update only their own profile
CREATE POLICY "Farmers can view their own profile"
    ON farmers FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Farmers can update their own profile"
    ON farmers FOR UPDATE
    USING (auth.uid() = id);

-- Procurement Centers: Public read access for all farmers
CREATE POLICY "Public read access for centers"
    ON procurement_centers FOR SELECT
    USING (true);

-- Procurement Schedules: Public read access for all farmers
CREATE POLICY "Public read access for schedules"
    ON procurement_schedules FOR SELECT
    USING (true);

-- Announcements: Public read access for all
CREATE POLICY "Public read access for announcements"
    ON announcements FOR SELECT
    USING (true);

-- Procurement Requests: Farmers can see & create their own requests
CREATE POLICY "Farmers can view their own requests"
    ON procurement_requests FOR SELECT
    USING (auth.uid() = farmer_id);

CREATE POLICY "Farmers can insert their own requests"
    ON procurement_requests FOR INSERT
    WITH CHECK (auth.uid() = farmer_id);

-- Admin Full Access Policies (Service Role / Admin Role)
CREATE POLICY "Admins have full access to requests"
    ON procurement_requests FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

CREATE POLICY "Admins have full access to schedules"
    ON procurement_schedules FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

CREATE POLICY "Admins have full access to centers"
    ON procurement_centers FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

CREATE POLICY "Admins have full access to announcements"
    ON announcements FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

-- ==============================================================================
-- Demo Seed Data (Realistic Agriculture Procurement Data)
-- ==============================================================================

-- 1. Insert Procurement Centers
INSERT INTO procurement_centers (id, center_name, location, district, state, contact_number, in_charge_name, crops_accepted, opening_time, closing_time, daily_capacity_quintals, google_maps_url, status)
VALUES
('c1111111-1111-1111-1111-111111111111', 'APMC Main Agricultural Yard - Warangal', 'Mandi Road, Enumamula', 'Warangal', 'Telangana', '9848012345', 'Shri R. Prabhakar Rao', ARRAY['Paddy', 'Cotton', 'Maize', 'Chilli'], '08:00 AM', '06:00 PM', 1200, 'https://maps.google.com/?q=Enumamula+Mandi+Warangal', 'Open'),
('c2222222-2222-2222-2222-222222222222', 'Kurnool District Farmer Grain Purchase Center', 'Near Market Yard, Nandyal Road', 'Kurnool', 'Andhra Pradesh', '9849023456', 'Smt. K. Sarojini Devi', ARRAY['Paddy', 'Bengal Gram', 'Sunflower', 'Maize'], '08:30 AM', '05:30 PM', 800, 'https://maps.google.com/?q=Kurnool+Market+Yard', 'Open'),
('c3333333-3333-3333-3333-333333333333', 'Guntur Cotton & Grain Procurement Center', 'Mirchi Yard Complex, GT Road', 'Guntur', 'Andhra Pradesh', '9848034567', 'Shri V. Venkateswarlu', ARRAY['Cotton', 'Paddy', 'Black Gram', 'Turmeric'], '08:00 AM', '05:00 PM', 1000, 'https://maps.google.com/?q=Guntur+Mirchi+Yard', 'Open'),
('c4444444-4444-4444-4444-444444444444', 'Indore Krishi Upaj Mandi Procurement Hub', 'Sanwer Road Sector C', 'Indore', 'Madhya Pradesh', '9826045678', 'Shri Anand Sharma', ARRAY['Wheat', 'Soybean', 'Gram', 'Mustard'], '08:30 AM', '06:00 PM', 1500, 'https://maps.google.com/?q=Indore+Krishi+Upaj+Mandi', 'Open'),
('c5555555-5555-5555-5555-555555555555', 'Karnal Grain Mandi - Wheat & Paddy Center', 'Railway Station Road', 'Karnal', 'Haryana', '9812056789', 'Shri Gurpreet Singh', ARRAY['Wheat', 'Paddy (Basmati)', 'Mustard'], '07:30 AM', '06:30 PM', 2000, 'https://maps.google.com/?q=Karnal+New+Grain+Market', 'Open')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Demo Farmers
INSERT INTO farmers (id, full_name, mobile_number, email, password_hash, village, district, state, land_record_id, preferred_language)
VALUES
('f1111111-1111-1111-1111-111111111111', 'Ramesh Kumar Goud', '9876543210', 'ramesh.farmer@example.com', 'password123', 'Velair', 'Warangal', 'Telangana', 'TS-WGL-2024-8891', 'en'),
('f2222222-2222-2222-2222-222222222222', 'Lakshmi Devi Reddy', '9876543211', 'lakshmi.reddy@example.com', 'password123', 'Orvakal', 'Kurnool', 'Andhra Pradesh', 'AP-KNL-2024-4412', 'te'),
('f3333333-3333-3333-3333-333333333333', 'Suresh Chandra Yadav', '9876543212', 'suresh.yadav@example.com', 'password123', 'Depalpur', 'Indore', 'Madhya Pradesh', 'MP-IND-2024-1109', 'hi')
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Admin User
INSERT INTO admin_users (id, full_name, email, password_hash, role, assigned_center_id)
VALUES
('a1111111-1111-1111-1111-111111111111', 'Officer K. Ramanathan', 'admin@kisanprocure.gov.in', 'admin123', 'Super Admin', 'c1111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Procurement Schedules
INSERT INTO procurement_schedules (id, center_id, crop_name, procurement_date, start_time, end_time, available_slots, remaining_slots, status)
VALUES
('s1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Paddy (Grade A)', CURRENT_DATE, '08:30 AM', '05:30 PM', 60, 14, 'Limited'),
('s2222222-2222-2222-2222-222222222222', 'c1111111-1111-1111-1111-111111111111', 'Cotton (Medium Staple)', CURRENT_DATE + INTERVAL '1 day', '09:00 AM', '05:00 PM', 50, 38, 'Available'),
('s3333333-3333-3333-3333-333333333333', 'c1111111-1111-1111-1111-111111111111', 'Maize', CURRENT_DATE + INTERVAL '2 days', '08:30 AM', '04:30 PM', 40, 32, 'Available'),
('s4444444-4444-4444-4444-444444444444', 'c2222222-2222-2222-2222-222222222222', 'Paddy (Common)', CURRENT_DATE, '08:30 AM', '05:30 PM', 50, 8, 'Limited'),
('s5555555-5555-5555-5555-555555555555', 'c2222222-2222-2222-2222-222222222222', 'Bengal Gram', CURRENT_DATE + INTERVAL '1 day', '09:00 AM', '05:00 PM', 45, 41, 'Available'),
('s6666666-6666-6666-6666-666666666666', 'c4444444-4444-4444-4444-444444444444', 'Soybean (Yellow)', CURRENT_DATE, '08:00 AM', '06:00 PM', 75, 4, 'Limited'),
('s7777777-7777-7777-7777-777777777777', 'c4444444-4444-4444-4444-444444444444', 'Wheat (Sharbati)', CURRENT_DATE + INTERVAL '1 day', '08:00 AM', '06:00 PM', 80, 65, 'Available')
ON CONFLICT (id) DO NOTHING;

-- 5. Insert Live Procurement Requests (with Token & Queue values)
INSERT INTO procurement_requests (id, farmer_id, center_id, crop_name, quantity_quintals, preferred_date, transport_mode, vehicle_number, token_number, status, queue_position, estimated_waiting_minutes, admin_notes, payment_status)
VALUES
('r1111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Paddy (Grade A)', 85.50, CURRENT_DATE, 'Tractor Trolley', 'TS-03-AB-4512', 'A-104', 'In Queue', 3, 45, 'Gate entry completed at 09:15 AM. Moisture tested at 14.2% (Passed standard). Moisture certificate attached.', 'Pending'),
('r2222222-2222-2222-2222-222222222222', 'f1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Maize', 40.00, CURRENT_DATE - INTERVAL '14 days', 'Tractor', 'TS-03-AB-4512', 'M-089', 'Completed', 0, 0, '40.00 Quintals procured at MSP Rs 2,090/Qtl. Weighment slip #7712 issued. Direct DBT credited to SBI A/c.', 'Credited via DBT'),
('r3333333-3333-3333-3333-333333333333', 'f2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Paddy (Common)', 120.00, CURRENT_DATE, 'Small Truck', 'AP-21-TX-9081', 'K-201', 'Processing', 1, 15, 'Vehicle placed on weighbridge #2. Gross weight recorded. Offloading in progress.', 'Pending'),
('r4444444-4444-4444-4444-444444444444', 'f3333333-3333-3333-3333-333333333333', 'c4444444-4444-4444-4444-444444444444', 'Soybean (Yellow)', 65.00, CURRENT_DATE + INTERVAL '1 day', 'Tractor', 'MP-09-KA-3321', 'S-312', 'Scheduled', 0, 0, 'Token assigned for tomorrow morning 09:00 AM slot. Please carry Aadhaar and Bank passbook copy.', 'Pending')
ON CONFLICT (id) DO NOTHING;

-- 6. Insert Announcements
INSERT INTO announcements (id, title, message, priority, announcement_date, center_id)
VALUES
('m1111111-1111-1111-1111-111111111111', 'Extra Weighment Counters Opened at Warangal Center', 'Due to high arrivals of Paddy (Grade A), two additional weighbridge electronic counters have been activated today to reduce waiting time to under 30 minutes.', 'Urgent', CURRENT_DATE, 'c1111111-1111-1111-1111-111111111111'),
('m2222222-2222-2222-2222-222222222222', 'Moisture Standards Notice for Paddy & Soybean', 'Farmers are requested to ensure crop moisture content is below 17% for Paddy and 12% for Soybean before arriving at the procurement center for instant quality approval.', 'Normal', CURRENT_DATE - INTERVAL '1 day', NULL),
('m3333333-3333-3333-3333-333333333333', 'Direct Benefit Transfer (DBT) Payment Timeline', 'All MSP procurement payments for approved weighment slips will be credited directly to registered farmer bank accounts within 48 to 72 bank working hours.', 'Info', CURRENT_DATE - INTERVAL '3 days', NULL)
ON CONFLICT (id) DO NOTHING;
