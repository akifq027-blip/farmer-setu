import fs from 'fs';
import path from 'path';
import { mysqlDb } from './db/mysql.js';

// Types
export interface Farmer {
  id: string;
  full_name: string;
  mobile_number: string;
  email?: string;
  password_hash: string;
  village: string;
  district: string;
  state: string;
  land_record_id?: string;
  preferred_language: 'en' | 'te' | 'hi';
  created_at: string;
  updated_at: string;
}

export interface ProcurementCenter {
  id: string;
  center_name: string;
  location: string;
  district: string;
  state: string;
  contact_number: string;
  in_charge_name: string;
  crops_accepted: string[];
  opening_time: string;
  closing_time: string;
  daily_capacity_quintals: number;
  google_maps_url: string;
  status: 'Open' | 'Closed' | 'Capacity Full';
  created_at: string;
}

export interface ProcurementSchedule {
  id: string;
  center_id: string;
  crop_name: string;
  procurement_date: string; // YYYY-MM-DD
  start_time: string;
  end_time: string;
  available_slots: number;
  remaining_slots: number;
  status: 'Available' | 'Limited' | 'Full' | 'Rescheduled';
  created_at: string;
}

export type RequestStatus =
  | 'Request Submitted'
  | 'Token Assigned'
  | 'Scheduled'
  | 'In Queue'
  | 'Processing'
  | 'Completed'
  | 'Rejected';

export interface ProcurementRequest {
  id: string;
  farmer_id: string;
  farmer_name?: string;
  farmer_mobile?: string;
  farmer_village?: string;
  center_id: string;
  center_name?: string;
  crop_name: string;
  quantity_quintals: number;
  preferred_date: string;
  transport_mode: string;
  vehicle_number?: string;
  token_number: string;
  status: RequestStatus;
  queue_position: number;
  estimated_waiting_minutes: number;
  admin_notes?: string;
  gate_entry_time?: string;
  weighment_completed_time?: string;
  payment_status: 'Pending' | 'Verified' | 'Credited via DBT';
  submitted_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: 'Urgent' | 'Normal' | 'Info';
  announcement_date: string;
  center_id?: string | null;
  center_name?: string;
  created_at: string;
}

export interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  role: string;
  assigned_center_id?: string;
  created_at: string;
}

export interface StoreData {
  farmers: Farmer[];
  procurement_centers: ProcurementCenter[];
  procurement_schedules: ProcurementSchedule[];
  procurement_requests: ProcurementRequest[];
  announcements: Announcement[];
  admin_users: AdminUser[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

// Initial realistic default data
const getInitialData = (): StoreData => {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const dayAfter = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];

  return {
    farmers: [
      {
        id: 'f1111111-1111-1111-1111-111111111111',
        full_name: 'Ramesh Kumar Goud',
        mobile_number: '9876543210',
        email: 'ramesh.farmer@example.com',
        password_hash: 'password123',
        village: 'Velair',
        district: 'Warangal',
        state: 'Telangana',
        land_record_id: 'TS-WGL-2024-8891',
        preferred_language: 'en',
        created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'f2222222-2222-2222-2222-222222222222',
        full_name: 'Lakshmi Devi Reddy',
        mobile_number: '9876543211',
        email: 'lakshmi.reddy@example.com',
        password_hash: 'password123',
        village: 'Orvakal',
        district: 'Kurnool',
        state: 'Andhra Pradesh',
        land_record_id: 'AP-KNL-2024-4412',
        preferred_language: 'te',
        created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'f3333333-3333-3333-3333-333333333333',
        full_name: 'Suresh Chandra Yadav',
        mobile_number: '9876543212',
        email: 'suresh.yadav@example.com',
        password_hash: 'password123',
        village: 'Depalpur',
        district: 'Indore',
        state: 'Madhya Pradesh',
        land_record_id: 'MP-IND-2024-1109',
        preferred_language: 'hi',
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    procurement_centers: [
      {
        id: 'c1111111-1111-1111-1111-111111111111',
        center_name: 'APMC Main Agricultural Yard - Warangal',
        location: 'Mandi Road, Enumamula',
        district: 'Warangal',
        state: 'Telangana',
        contact_number: '9848012345',
        in_charge_name: 'Shri R. Prabhakar Rao',
        crops_accepted: ['Paddy (Grade A)', 'Cotton', 'Maize', 'Chilli'],
        opening_time: '08:00 AM',
        closing_time: '06:00 PM',
        daily_capacity_quintals: 1200,
        google_maps_url: 'https://maps.google.com/?q=Enumamula+Mandi+Warangal',
        status: 'Open',
        created_at: new Date(Date.now() - 86400000 * 30).toISOString()
      },
      {
        id: 'c2222222-2222-2222-2222-222222222222',
        center_name: 'Kurnool District Farmer Grain Purchase Center',
        location: 'Near Market Yard, Nandyal Road',
        district: 'Kurnool',
        state: 'Andhra Pradesh',
        contact_number: '9849023456',
        in_charge_name: 'Smt. K. Sarojini Devi',
        crops_accepted: ['Paddy (Common)', 'Bengal Gram', 'Sunflower', 'Maize'],
        opening_time: '08:30 AM',
        closing_time: '05:30 PM',
        daily_capacity_quintals: 800,
        google_maps_url: 'https://maps.google.com/?q=Kurnool+Market+Yard',
        status: 'Open',
        created_at: new Date(Date.now() - 86400000 * 30).toISOString()
      },
      {
        id: 'c3333333-3333-3333-3333-333333333333',
        center_name: 'Guntur Cotton & Grain Procurement Hub',
        location: 'Mirchi Yard Complex, GT Road',
        district: 'Guntur',
        state: 'Andhra Pradesh',
        contact_number: '9848034567',
        in_charge_name: 'Shri V. Venkateswarlu',
        crops_accepted: ['Cotton', 'Paddy (Grade A)', 'Black Gram', 'Turmeric'],
        opening_time: '08:00 AM',
        closing_time: '05:00 PM',
        daily_capacity_quintals: 1000,
        google_maps_url: 'https://maps.google.com/?q=Guntur+Mirchi+Yard',
        status: 'Open',
        created_at: new Date(Date.now() - 86400000 * 30).toISOString()
      },
      {
        id: 'c4444444-4444-4444-4444-444444444444',
        center_name: 'Indore Krishi Upaj Mandi Procurement Center',
        location: 'Sanwer Road Sector C',
        district: 'Indore',
        state: 'Madhya Pradesh',
        contact_number: '9826045678',
        in_charge_name: 'Shri Anand Sharma',
        crops_accepted: ['Wheat (Sharbati)', 'Soybean (Yellow)', 'Gram', 'Mustard'],
        opening_time: '08:30 AM',
        closing_time: '06:00 PM',
        daily_capacity_quintals: 1500,
        google_maps_url: 'https://maps.google.com/?q=Indore+Krishi+Upaj+Mandi',
        status: 'Open',
        created_at: new Date(Date.now() - 86400000 * 30).toISOString()
      },
      {
        id: 'c5555555-5555-5555-5555-555555555555',
        center_name: 'Karnal Grain Mandi - Wheat & Paddy Hub',
        location: 'Railway Station Road',
        district: 'Karnal',
        state: 'Haryana',
        contact_number: '9812056789',
        in_charge_name: 'Shri Gurpreet Singh',
        crops_accepted: ['Wheat', 'Paddy (Basmati)', 'Mustard'],
        opening_time: '07:30 AM',
        closing_time: '06:30 PM',
        daily_capacity_quintals: 2000,
        google_maps_url: 'https://maps.google.com/?q=Karnal+New+Grain+Market',
        status: 'Open',
        created_at: new Date(Date.now() - 86400000 * 30).toISOString()
      }
    ],
    procurement_schedules: [
      {
        id: 's1111111-1111-1111-1111-111111111111',
        center_id: 'c1111111-1111-1111-1111-111111111111',
        crop_name: 'Paddy (Grade A)',
        procurement_date: today,
        start_time: '08:30 AM',
        end_time: '05:30 PM',
        available_slots: 60,
        remaining_slots: 14,
        status: 'Limited',
        created_at: new Date().toISOString()
      },
      {
        id: 's2222222-2222-2222-2222-222222222222',
        center_id: 'c1111111-1111-1111-1111-111111111111',
        crop_name: 'Cotton (Medium Staple)',
        procurement_date: tomorrow,
        start_time: '09:00 AM',
        end_time: '05:00 PM',
        available_slots: 50,
        remaining_slots: 38,
        status: 'Available',
        created_at: new Date().toISOString()
      },
      {
        id: 's3333333-3333-3333-3333-333333333333',
        center_id: 'c1111111-1111-1111-1111-111111111111',
        crop_name: 'Maize',
        procurement_date: dayAfter,
        start_time: '08:30 AM',
        end_time: '04:30 PM',
        available_slots: 40,
        remaining_slots: 32,
        status: 'Available',
        created_at: new Date().toISOString()
      },
      {
        id: 's4444444-4444-4444-4444-444444444444',
        center_id: 'c2222222-2222-2222-2222-222222222222',
        crop_name: 'Paddy (Common)',
        procurement_date: today,
        start_time: '08:30 AM',
        end_time: '05:30 PM',
        available_slots: 50,
        remaining_slots: 8,
        status: 'Limited',
        created_at: new Date().toISOString()
      },
      {
        id: 's5555555-5555-5555-5555-555555555555',
        center_id: 'c2222222-2222-2222-2222-222222222222',
        crop_name: 'Bengal Gram',
        procurement_date: tomorrow,
        start_time: '09:00 AM',
        end_time: '05:00 PM',
        available_slots: 45,
        remaining_slots: 41,
        status: 'Available',
        created_at: new Date().toISOString()
      },
      {
        id: 's6666666-6666-6666-6666-666666666666',
        center_id: 'c4444444-4444-4444-4444-444444444444',
        crop_name: 'Soybean (Yellow)',
        procurement_date: today,
        start_time: '08:00 AM',
        end_time: '06:00 PM',
        available_slots: 75,
        remaining_slots: 4,
        status: 'Limited',
        created_at: new Date().toISOString()
      },
      {
        id: 's7777777-7777-7777-7777-777777777777',
        center_id: 'c4444444-4444-4444-4444-444444444444',
        crop_name: 'Wheat (Sharbati)',
        procurement_date: tomorrow,
        start_time: '08:00 AM',
        end_time: '06:00 PM',
        available_slots: 80,
        remaining_slots: 65,
        status: 'Available',
        created_at: new Date().toISOString()
      }
    ],
    procurement_requests: [
      {
        id: 'r1111111-1111-1111-1111-111111111111',
        farmer_id: 'f1111111-1111-1111-1111-111111111111',
        farmer_name: 'Ramesh Kumar Goud',
        farmer_mobile: '9876543210',
        farmer_village: 'Velair, Warangal',
        center_id: 'c1111111-1111-1111-1111-111111111111',
        center_name: 'APMC Main Agricultural Yard - Warangal',
        crop_name: 'Paddy (Grade A)',
        quantity_quintals: 85.5,
        preferred_date: today,
        transport_mode: 'Tractor Trolley',
        vehicle_number: 'TS-03-AB-4512',
        token_number: 'A-104',
        status: 'In Queue',
        queue_position: 3,
        estimated_waiting_minutes: 45,
        admin_notes: 'Gate entry verified at 09:15 AM. Moisture tested at 14.2% (Passed standard). Moisture certificate issued.',
        gate_entry_time: new Date().toISOString(),
        payment_status: 'Pending',
        submitted_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'r2222222-2222-2222-2222-222222222222',
        farmer_id: 'f1111111-1111-1111-1111-111111111111',
        farmer_name: 'Ramesh Kumar Goud',
        farmer_mobile: '9876543210',
        farmer_village: 'Velair, Warangal',
        center_id: 'c1111111-1111-1111-1111-111111111111',
        center_name: 'APMC Main Agricultural Yard - Warangal',
        crop_name: 'Maize',
        quantity_quintals: 40.0,
        preferred_date: new Date(Date.now() - 86400000 * 14).toISOString().split('T')[0],
        transport_mode: 'Tractor',
        vehicle_number: 'TS-03-AB-4512',
        token_number: 'M-089',
        status: 'Completed',
        queue_position: 0,
        estimated_waiting_minutes: 0,
        admin_notes: '40.00 Quintals procured at MSP Rs 2,090/Qtl. Weighment slip #7712 issued. Direct DBT credited to registered bank account.',
        weighment_completed_time: new Date(Date.now() - 86400000 * 14).toISOString(),
        payment_status: 'Credited via DBT',
        submitted_at: new Date(Date.now() - 86400000 * 15).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 14).toISOString()
      },
      {
        id: 'r3333333-3333-3333-3333-333333333333',
        farmer_id: 'f2222222-2222-2222-2222-222222222222',
        farmer_name: 'Lakshmi Devi Reddy',
        farmer_mobile: '9876543211',
        farmer_village: 'Orvakal, Kurnool',
        center_id: 'c2222222-2222-2222-2222-222222222222',
        center_name: 'Kurnool District Farmer Grain Purchase Center',
        crop_name: 'Paddy (Common)',
        quantity_quintals: 120.0,
        preferred_date: today,
        transport_mode: 'Small Truck',
        vehicle_number: 'AP-21-TX-9081',
        token_number: 'K-201',
        status: 'Processing',
        queue_position: 1,
        estimated_waiting_minutes: 15,
        admin_notes: 'Vehicle placed on weighbridge #2. Gross weight recorded. Offloading in progress.',
        gate_entry_time: new Date().toISOString(),
        payment_status: 'Pending',
        submitted_at: new Date(Date.now() - 3600000 * 4).toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'r4444444-4444-4444-4444-444444444444',
        farmer_id: 'f3333333-3333-3333-3333-333333333333',
        farmer_name: 'Suresh Chandra Yadav',
        farmer_mobile: '9876543212',
        farmer_village: 'Depalpur, Indore',
        center_id: 'c4444444-4444-4444-4444-444444444444',
        center_name: 'Indore Krishi Upaj Mandi Procurement Center',
        crop_name: 'Soybean (Yellow)',
        quantity_quintals: 65.0,
        preferred_date: tomorrow,
        transport_mode: 'Tractor',
        vehicle_number: 'MP-09-KA-3321',
        token_number: 'S-312',
        status: 'Scheduled',
        queue_position: 0,
        estimated_waiting_minutes: 0,
        admin_notes: 'Token assigned for tomorrow morning 09:00 AM slot. Please carry Aadhaar and Bank passbook copy.',
        payment_status: 'Pending',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    announcements: [
      {
        id: 'm1111111-1111-1111-1111-111111111111',
        title: 'Extra Weighment Counters Opened at Warangal Center',
        message: 'Due to high arrivals of Paddy (Grade A), two additional weighbridge electronic counters have been activated today to reduce waiting time to under 30 minutes.',
        priority: 'Urgent',
        announcement_date: today,
        center_id: 'c1111111-1111-1111-1111-111111111111',
        center_name: 'APMC Main Agricultural Yard - Warangal',
        created_at: new Date().toISOString()
      },
      {
        id: 'm2222222-2222-2222-2222-222222222222',
        title: 'Moisture Standards Notice for Paddy & Soybean',
        message: 'Farmers are requested to ensure crop moisture content is below 17% for Paddy and 12% for Soybean before arriving at the procurement center for instant quality approval.',
        priority: 'Normal',
        announcement_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        center_id: null,
        center_name: 'All Procurement Centers',
        created_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'm3333333-3333-3333-3333-333333333333',
        title: 'Direct Benefit Transfer (DBT) Payment Timeline',
        message: 'All MSP procurement payments for approved weighment slips will be credited directly to registered farmer bank accounts within 48 to 72 bank working hours.',
        priority: 'Info',
        announcement_date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0],
        center_id: null,
        center_name: 'All Procurement Centers',
        created_at: new Date(Date.now() - 86400000 * 3).toISOString()
      }
    ],
    admin_users: [
      {
        id: 'a1111111-1111-1111-1111-111111111111',
        full_name: 'Procurement Officer Akif Quadri',
        email: 'akifquadri000@gmail.com',
        password_hash: '6472425227',
        role: 'Super Admin',
        assigned_center_id: 'c1111111-1111-1111-1111-111111111111',
        created_at: new Date().toISOString()
      }
    ]
  };
};

class Store {
  private data: StoreData;
  private mysqlDb = mysqlDb;
  private isMySQLLoaded: boolean = false;

  constructor() {
    this.data = getInitialData();
    this.initFileStore();
    this.initMySQLSync();
  }

  private initFileStore() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        this.data = { ...this.data, ...parsed };
      } else {
        this.saveToFile();
      }
    } catch (e) {
      console.warn('File store init fallback to memory:', e);
    }
  }

  public saveToFile() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving store to file:', e);
    }
  }

  public resetToDefaults() {
    this.data = getInitialData();
    this.saveToFile();
    return this.data;
  }

  /**
   * Sync and load from Aiven MySQL database if connected
   */
  public async initMySQLSync() {
    try {
      const isConnected = await this.mysqlDb.init();
      if (!isConnected) {
        console.log('[Store] Operating with local JSON/Memory store.');
        return;
      }

      console.log('[Store] MySQL connected. Synchronizing records with Aiven MySQL...');
      const pool = this.mysqlDb.getPool();
      if (!pool) return;

      // Check if procurement centers exist in MySQL
      const [centerRows]: any = await pool.query('SELECT COUNT(*) as count FROM procurement_centers');
      const count = centerRows[0]?.count || 0;

      if (count === 0) {
        // MySQL is empty, seed initial data from current store into MySQL
        console.log('[Store] Populating initial dataset into Aiven MySQL...');
        await this.syncAllToMySQL();
      } else {
        // MySQL has data, load latest data from MySQL into active memory
        await this.loadFromMySQL();
      }

      this.isMySQLLoaded = true;
      console.log('[Store] ✅ Aiven MySQL synchronization active and operational.');
    } catch (err: any) {
      console.warn('[Store] MySQL sync warning:', err.message);
    }
  }

  /**
   * Load authoritative data from MySQL into local memory
   */
  public async loadFromMySQL() {
    const pool = this.mysqlDb.getPool();
    if (!pool) return;

    try {
      // 1. Centers
      const [centers]: any = await pool.query('SELECT * FROM procurement_centers ORDER BY created_at DESC');
      if (centers && centers.length > 0) {
        this.data.procurement_centers = centers.map((c: any) => ({
          ...c,
          crops_accepted: typeof c.crops_accepted === 'string' ? JSON.parse(c.crops_accepted) : (c.crops_accepted || [])
        }));
      }

      // 2. Farmers
      const [farmers]: any = await pool.query('SELECT * FROM farmers ORDER BY created_at DESC');
      if (farmers && farmers.length > 0) {
        this.data.farmers = farmers;
      }

      // 3. Schedules
      const [schedules]: any = await pool.query('SELECT * FROM procurement_schedules ORDER BY procurement_date ASC');
      if (schedules && schedules.length > 0) {
        this.data.procurement_schedules = schedules.map((s: any) => ({
          ...s,
          procurement_date: s.procurement_date instanceof Date ? s.procurement_date.toISOString().split('T')[0] : String(s.procurement_date)
        }));
      }

      // 4. Requests
      const [requests]: any = await pool.query('SELECT * FROM procurement_requests ORDER BY submitted_at DESC');
      if (requests && requests.length > 0) {
        this.data.procurement_requests = requests.map((r: any) => {
          const center = this.data.procurement_centers.find(c => c.id === r.center_id);
          const farmer = this.data.farmers.find(f => f.id === r.farmer_id);
          return {
            ...r,
            farmer_name: farmer?.full_name || r.farmer_name,
            farmer_mobile: farmer?.mobile_number || r.farmer_mobile,
            farmer_village: farmer?.village || r.farmer_village,
            center_name: center?.center_name || r.center_name,
            quantity_quintals: parseFloat(r.quantity_quintals),
            preferred_date: r.preferred_date instanceof Date ? r.preferred_date.toISOString().split('T')[0] : String(r.preferred_date)
          };
        });
      }

      // 5. Announcements
      const [announcements]: any = await pool.query('SELECT * FROM announcements ORDER BY announcement_date DESC');
      if (announcements && announcements.length > 0) {
        this.data.announcements = announcements.map((a: any) => ({
          ...a,
          announcement_date: a.announcement_date instanceof Date ? a.announcement_date.toISOString().split('T')[0] : String(a.announcement_date)
        }));
      }

      // 6. Admin Users
      const [admins]: any = await pool.query('SELECT * FROM admin_users ORDER BY created_at DESC');
      if (admins && admins.length > 0) {
        this.data.admin_users = admins;
      }

      // Save synced state to local fallback file
      this.saveToFile();
    } catch (err: any) {
      console.error('[Store] Failed to load data from MySQL:', err.message);
    }
  }

  /**
   * Seed all in-memory items to MySQL
   */
  public async syncAllToMySQL() {
    const pool = this.mysqlDb.getPool();
    if (!pool) return;

    try {
      // Centers
      for (const c of this.data.procurement_centers) {
        await pool.query(
          `INSERT IGNORE INTO procurement_centers (id, center_name, location, district, state, contact_number, in_charge_name, crops_accepted, opening_time, closing_time, daily_capacity_quintals, google_maps_url, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [c.id, c.center_name, c.location, c.district, c.state, c.contact_number, c.in_charge_name, JSON.stringify(c.crops_accepted), c.opening_time, c.closing_time, c.daily_capacity_quintals, c.google_maps_url, c.status]
        );
      }

      // Farmers
      for (const f of this.data.farmers) {
        await pool.query(
          `INSERT IGNORE INTO farmers (id, full_name, mobile_number, email, password_hash, village, district, state, land_record_id, preferred_language)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [f.id, f.full_name, f.mobile_number, f.email || null, f.password_hash, f.village, f.district, f.state, f.land_record_id || null, f.preferred_language]
        );
      }

      // Admins
      for (const a of this.data.admin_users) {
        await pool.query(
          `INSERT IGNORE INTO admin_users (id, full_name, email, password_hash, role, assigned_center_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [a.id, a.full_name, a.email, a.password_hash, a.role, a.assigned_center_id || null]
        );
      }

      // Schedules
      for (const s of this.data.procurement_schedules) {
        await pool.query(
          `INSERT IGNORE INTO procurement_schedules (id, center_id, crop_name, procurement_date, start_time, end_time, available_slots, remaining_slots, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [s.id, s.center_id, s.crop_name, s.procurement_date, s.start_time, s.end_time, s.available_slots, s.remaining_slots, s.status]
        );
      }

      // Requests
      for (const r of this.data.procurement_requests) {
        await pool.query(
          `INSERT IGNORE INTO procurement_requests (id, farmer_id, center_id, crop_name, quantity_quintals, preferred_date, transport_mode, vehicle_number, token_number, status, queue_position, estimated_waiting_minutes, admin_notes, payment_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [r.id, r.farmer_id, r.center_id, r.crop_name, r.quantity_quintals, r.preferred_date, r.transport_mode, r.vehicle_number || '', r.token_number, r.status, r.queue_position, r.estimated_waiting_minutes, r.admin_notes || '', r.payment_status]
        );
      }

      // Announcements
      for (const a of this.data.announcements) {
        await pool.query(
          `INSERT IGNORE INTO announcements (id, title, message, priority, announcement_date, center_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [a.id, a.title, a.message, a.priority, a.announcement_date, a.center_id || null]
        );
      }
    } catch (err: any) {
      console.warn('[Store] syncAllToMySQL error:', err.message);
    }
  }

  public getDatabaseStatus() {
    const status = this.mysqlDb.getStatus();
    return {
      databaseType: 'MySQL (Aiven)',
      connected: status.connected,
      error: status.error,
      isMySQLLoaded: this.isMySQLLoaded,
      recordCounts: {
        farmers: this.data.farmers.length,
        centers: this.data.procurement_centers.length,
        schedules: this.data.procurement_schedules.length,
        requests: this.data.procurement_requests.length,
        announcements: this.data.announcements.length,
        admins: this.data.admin_users.length
      }
    };
  }

  public getMySQL() {
    return this.mysqlDb;
  }

  // Getters
  public getFarmers() { return this.data.farmers; }
  public getCenters() { return this.data.procurement_centers; }
  public getSchedules() { return this.data.procurement_schedules; }
  public getRequests() { return this.data.procurement_requests; }
  public getAnnouncements() { return this.data.announcements; }
  public getAdmins() { return this.data.admin_users; }

  // Farmer operations
  public findFarmerByMobileOrEmail(identifier: string) {
    if (!identifier) return undefined;
    const clean = identifier.trim().toLowerCase();
    const cleanDigits = identifier.replace(/\D/g, ''); // Extract only numbers

    return this.data.farmers.find(f => {
      const fMobile = (f.mobile_number || '').trim();
      const fMobileDigits = fMobile.replace(/\D/g, '');
      const fEmail = (f.email || '').trim().toLowerCase();

      // Check exact match or email match
      if (fMobile === clean || fEmail === clean) return true;

      // Check numeric/phone match (e.g. last 10 digits for Indian mobile numbers)
      if (cleanDigits.length >= 10 && fMobileDigits.length >= 10) {
        if (cleanDigits.slice(-10) === fMobileDigits.slice(-10)) return true;
      }

      return false;
    });
  }

  public findFarmerById(id: string) {
    return this.data.farmers.find(f => f.id === id);
  }

  public addFarmer(farmer: Farmer) {
    this.data.farmers.unshift(farmer);
    this.saveToFile();
    this.persistFarmerToMySQL(farmer);
    return farmer;
  }

  public updateFarmer(id: string, updates: Partial<Farmer>) {
    const idx = this.data.farmers.findIndex(f => f.id === id);
    if (idx !== -1) {
      this.data.farmers[idx] = { ...this.data.farmers[idx], ...updates, updated_at: new Date().toISOString() };
      this.saveToFile();
      this.persistFarmerUpdateToMySQL(id, updates);
      return this.data.farmers[idx];
    }
    return null;
  }

  // Admin operations
  public findAdminByEmail(email: string) {
    if (!email) return undefined;
    const clean = email.trim().toLowerCase();

    // 1. Direct match from data
    const existing = this.data.admin_users.find(a => a.email.toLowerCase() === clean);
    if (existing) return existing;

    // 2. Default officer account fallback
    if (
      clean === 'akifquadri000@gmail.com' ||
      clean === 'akif' ||
      clean === 'admin' ||
      clean === 'admin@gov.in'
    ) {
      let targetAdmin = this.data.admin_users.find(a => a.email.toLowerCase() === 'akifquadri000@gmail.com');
      if (!targetAdmin) {
        targetAdmin = {
          id: 'a1111111-1111-1111-1111-111111111111',
          full_name: 'Procurement Officer Akif Quadri',
          email: 'akifquadri000@gmail.com',
          password_hash: '6472425227',
          role: 'Super Admin',
          assigned_center_id: 'c1111111-1111-1111-1111-111111111111',
          created_at: new Date().toISOString()
        };
        this.data.admin_users.unshift(targetAdmin);
        this.saveToFile();
        this.persistAdminToMySQL(targetAdmin);
      }
      return targetAdmin;
    }

    return undefined;
  }

  // Center operations
  public findCenterById(id: string) {
    return this.data.procurement_centers.find(c => c.id === id);
  }

  public addCenter(center: ProcurementCenter) {
    this.data.procurement_centers.unshift(center);
    this.saveToFile();
    this.persistCenterToMySQL(center);
    return center;
  }

  public updateCenter(id: string, updates: Partial<ProcurementCenter>) {
    const idx = this.data.procurement_centers.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.data.procurement_centers[idx] = { ...this.data.procurement_centers[idx], ...updates };
      this.saveToFile();
      this.persistCenterUpdateToMySQL(id, updates);
      return this.data.procurement_centers[idx];
    }
    return null;
  }

  public deleteCenter(id: string) {
    const idx = this.data.procurement_centers.findIndex(c => c.id === id);
    if (idx !== -1) {
      const removed = this.data.procurement_centers.splice(idx, 1)[0];
      this.saveToFile();
      this.deleteCenterFromMySQL(id);
      return removed;
    }
    return null;
  }

  // Schedule operations
  public findScheduleById(id: string) {
    return this.data.procurement_schedules.find(s => s.id === id);
  }

  public addSchedule(schedule: ProcurementSchedule) {
    this.data.procurement_schedules.unshift(schedule);
    this.saveToFile();
    this.persistScheduleToMySQL(schedule);
    return schedule;
  }

  public updateSchedule(id: string, updates: Partial<ProcurementSchedule>) {
    const idx = this.data.procurement_schedules.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.data.procurement_schedules[idx] = { ...this.data.procurement_schedules[idx], ...updates };
      this.saveToFile();
      this.persistScheduleUpdateToMySQL(id, updates);
      return this.data.procurement_schedules[idx];
    }
    return null;
  }

  public deleteSchedule(id: string) {
    const idx = this.data.procurement_schedules.findIndex(s => s.id === id);
    if (idx !== -1) {
      const removed = this.data.procurement_schedules.splice(idx, 1)[0];
      this.saveToFile();
      this.deleteScheduleFromMySQL(id);
      return removed;
    }
    return null;
  }

  // Request operations
  public findRequestById(id: string) {
    return this.data.procurement_requests.find(r => r.id === id);
  }

  public findRequestByToken(tokenNumber: string) {
    const clean = tokenNumber.trim().toUpperCase();
    return this.data.procurement_requests.find(r => r.token_number.toUpperCase() === clean);
  }

  public getRequestsByFarmerId(farmerId: string) {
    return this.data.procurement_requests.filter(r => r.farmer_id === farmerId);
  }

  public addRequest(req: ProcurementRequest) {
    this.data.procurement_requests.unshift(req);
    this.recalculateQueuePositions(req.center_id);
    this.saveToFile();
    this.persistRequestToMySQL(req);
    return req;
  }

  public updateRequest(id: string, updates: Partial<ProcurementRequest>) {
    const idx = this.data.procurement_requests.findIndex(r => r.id === id);
    if (idx !== -1) {
      this.data.procurement_requests[idx] = {
        ...this.data.procurement_requests[idx],
        ...updates,
        updated_at: new Date().toISOString()
      };
      this.recalculateQueuePositions(this.data.procurement_requests[idx].center_id);
      this.saveToFile();
      this.persistRequestUpdateToMySQL(id, updates);
      return this.data.procurement_requests[idx];
    }
    return null;
  }

  public deleteRequest(id: string) {
    const idx = this.data.procurement_requests.findIndex(r => r.id === id);
    if (idx !== -1) {
      const removed = this.data.procurement_requests.splice(idx, 1)[0];
      this.recalculateQueuePositions(removed.center_id);
      this.saveToFile();
      this.deleteRequestFromMySQL(id);
      return removed;
    }
    return null;
  }

  // Queue Recalculation logic
  public recalculateQueuePositions(centerId: string) {
    // Active queue for today in this center
    const activeInQueue = this.data.procurement_requests.filter(
      r => r.center_id === centerId && (r.status === 'In Queue' || r.status === 'Processing')
    );

    // Sort by submitted_at
    activeInQueue.sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());

    activeInQueue.forEach((req, index) => {
      req.queue_position = index; // 0 means currently processing or next up
      req.estimated_waiting_minutes = index * 15; // ~15 minutes per farmer weighment
      this.persistRequestUpdateToMySQL(req.id, {
        queue_position: req.queue_position,
        estimated_waiting_minutes: req.estimated_waiting_minutes
      });
    });
  }

  // Announcements
  public addAnnouncement(announcement: Announcement) {
    this.data.announcements.unshift(announcement);
    this.saveToFile();
    this.persistAnnouncementToMySQL(announcement);
    return announcement;
  }

  public deleteAnnouncement(id: string) {
    const idx = this.data.announcements.findIndex(a => a.id === id);
    if (idx !== -1) {
      const removed = this.data.announcements.splice(idx, 1)[0];
      this.saveToFile();
      this.deleteAnnouncementFromMySQL(id);
      return removed;
    }
    return null;
  }

  // ==========================================
  // Background MySQL Persistence Helpers
  // ==========================================
  private async persistFarmerToMySQL(farmer: Farmer) {
    const pool = this.mysqlDb.getPool();
    if (!pool) return;
    try {
      await pool.query(
        `INSERT INTO farmers (id, full_name, mobile_number, email, password_hash, village, district, state, land_record_id, preferred_language)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), village = VALUES(village), updated_at = NOW()`,
        [farmer.id, farmer.full_name, farmer.mobile_number, farmer.email || null, farmer.password_hash, farmer.village, farmer.district, farmer.state, farmer.land_record_id || null, farmer.preferred_language]
      );
    } catch (e: any) {
      console.warn('[MySQL] Error persisting farmer:', e.message);
    }
  }

  private async persistFarmerUpdateToMySQL(id: string, updates: Partial<Farmer>) {
    const pool = this.mysqlDb.getPool();
    if (!pool) return;
    try {
      const sets: string[] = [];
      const values: any[] = [];
      for (const [key, val] of Object.entries(updates)) {
        if (key === 'id') continue;
        sets.push(`${key} = ?`);
        values.push(val);
      }
      if (sets.length > 0) {
        values.push(id);
        await pool.query(`UPDATE farmers SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
      }
    } catch (e: any) {
      console.warn('[MySQL] Error updating farmer:', e.message);
    }
  }

  private async persistCenterToMySQL(c: ProcurementCenter) {
    const pool = this.mysqlDb.getPool();
    if (!pool) return;
    try {
      await pool.query(
        `INSERT INTO procurement_centers (id, center_name, location, district, state, contact_number, in_charge_name, crops_accepted, opening_time, closing_time, daily_capacity_quintals, google_maps_url, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE center_name = VALUES(center_name), contact_number = VALUES(contact_number), status = VALUES(status)`,
        [c.id, c.center_name, c.location, c.district, c.state, c.contact_number, c.in_charge_name, JSON.stringify(c.crops_accepted), c.opening_time, c.closing_time, c.daily_capacity_quintals, c.google_maps_url, c.status]
      );
    } catch (e: any) {
      console.warn('[MySQL] Error persisting center:', e.message);
    }
  }

  private async persistCenterUpdateToMySQL(id: string, updates: Partial<ProcurementCenter>) {
    const pool = this.mysqlDb.getPool();
    if (!pool) return;
    try {
      const sets: string[] = [];
      const values: any[] = [];
      for (const [key, val] of Object.entries(updates)) {
        if (key === 'id') continue;
        sets.push(`${key} = ?`);
        values.push(key === 'crops_accepted' && Array.isArray(val) ? JSON.stringify(val) : val);
      }
      if (sets.length > 0) {
        values.push(id);
        await pool.query(`UPDATE procurement_centers SET ${sets.join(', ')} WHERE id = ?`, values);
      }
    } catch (e: any) {
      console.warn('[MySQL] Error updating center:', e.message);
    }
  }

  private async deleteCenterFromMySQL(id: string) {
    const pool = this.mysqlDb.getPool();
    if (!pool) return;
    try {
      await pool.query('DELETE FROM procurement_centers WHERE id = ?', [id]);
    } catch (e: any) {
      console.warn('[MySQL] Error deleting center:', e.message);
    }
  }

  private async persistScheduleToMySQL(s: ProcurementSchedule) {
    const pool = this.mysqlDb.getPool();
    if (!pool) return;
    try {
      await pool.query(
        `INSERT INTO procurement_schedules (id, center_id, crop_name, procurement_date, start_time, end_time, available_slots, remaining_slots, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE remaining_slots = VALUES(remaining_slots), status = VALUES(status)`,
        [s.id, s.center_id, s.crop_name, s.procurement_date, s.start_time, s.end_time, s.available_slots, s.remaining_slots, s.status]
      );
    } catch (e: any) {
      console.warn('[MySQL] Error persisting schedule:', e.message);
    }
  }

  private async persistScheduleUpdateToMySQL(id: string, updates: Partial<ProcurementSchedule>) {
    const pool = this.mysqlDb.getPool();
    if (!pool) return;
    try {
      const sets: string[] = [];
      const values: any[] = [];
      for (const [key, val] of Object.entries(updates)) {
        if (key === 'id') continue;
        sets.push(`${key} = ?`);
        values.push(val);
      }
      if (sets.length > 0) {
        values.push(id);
        await pool.query(`UPDATE procurement_schedules SET ${sets.join(', ')} WHERE id = ?`, values);
      }
    } catch (e: any) {
      console.warn('[MySQL] Error updating schedule:', e.message);
    }
  }

  private async deleteScheduleFromMySQL(id: string) {
    const pool = this.mysqlDb.getPool();
    if (!pool) return;
    try {
      await pool.query('DELETE FROM procurement_schedules WHERE id = ?', [id]);
    } catch (e: any) {
      console.warn('[MySQL] Error deleting schedule:', e.message);
    }
  }

  private async persistRequestToMySQL(r: ProcurementRequest) {
    const pool = this.mysqlDb.getPool();
    if (!pool) return;
    try {
      await pool.query(
        `INSERT INTO procurement_requests (id, farmer_id, center_id, crop_name, quantity_quintals, preferred_date, transport_mode, vehicle_number, token_number, status, queue_position, estimated_waiting_minutes, admin_notes, payment_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE status = VALUES(status), queue_position = VALUES(queue_position), estimated_waiting_minutes = VALUES(estimated_waiting_minutes), updated_at = NOW()`,
        [r.id, r.farmer_id, r.center_id, r.crop_name, r.quantity_quintals, r.preferred_date, r.transport_mode, r.vehicle_number || '', r.token_number, r.status, r.queue_position, r.estimated_waiting_minutes, r.admin_notes || '', r.payment_status]
      );
    } catch (e: any) {
      console.warn('[MySQL] Error persisting request:', e.message);
    }
  }

  private async persistRequestUpdateToMySQL(id: string, updates: Partial<ProcurementRequest>) {
    const pool = this.mysqlDb.getPool();
    if (!pool) return;
    try {
      const sets: string[] = [];
      const values: any[] = [];
      for (const [key, val] of Object.entries(updates)) {
        if (key === 'id' || key === 'farmer_name' || key === 'center_name' || key === 'farmer_mobile' || key === 'farmer_village') continue;
        sets.push(`${key} = ?`);
        values.push(val);
      }
      if (sets.length > 0) {
        values.push(id);
        await pool.query(`UPDATE procurement_requests SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
      }
    } catch (e: any) {
      console.warn('[MySQL] Error updating request:', e.message);
    }
  }

  private async deleteRequestFromMySQL(id: string) {
    const pool = this.mysqlDb.getPool();
    if (!pool) return;
    try {
      await pool.query('DELETE FROM procurement_requests WHERE id = ?', [id]);
    } catch (e: any) {
      console.warn('[MySQL] Error deleting request:', e.message);
    }
  }

  private async persistAnnouncementToMySQL(a: Announcement) {
    const pool = this.mysqlDb.getPool();
    if (!pool) return;
    try {
      await pool.query(
        `INSERT INTO announcements (id, title, message, priority, announcement_date, center_id)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title = VALUES(title), message = VALUES(message)`,
        [a.id, a.title, a.message, a.priority, a.announcement_date, a.center_id || null]
      );
    } catch (e: any) {
      console.warn('[MySQL] Error persisting announcement:', e.message);
    }
  }

  private async deleteAnnouncementFromMySQL(id: string) {
    const pool = this.mysqlDb.getPool();
    if (!pool) return;
    try {
      await pool.query('DELETE FROM announcements WHERE id = ?', [id]);
    } catch (e: any) {
      console.warn('[MySQL] Error deleting announcement:', e.message);
    }
  }

  private async persistAdminToMySQL(admin: AdminUser) {
    const pool = this.mysqlDb.getPool();
    if (!pool) return;
    try {
      await pool.query(
        `INSERT INTO admin_users (id, full_name, email, password_hash, role, assigned_center_id)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), role = VALUES(role)`,
        [admin.id, admin.full_name, admin.email, admin.password_hash, admin.role, admin.assigned_center_id || null]
      );
    } catch (e: any) {
      console.warn('[MySQL] Error persisting admin user:', e.message);
    }
  }
}

export const store = new Store();
