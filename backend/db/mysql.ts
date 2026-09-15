import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

export interface MySQLConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  uri?: string;
  ssl?: any;
}

class MySQLDatabase {
  private pool: mysql.Pool | null = null;
  private isConnected: boolean = false;
  private connectionError: string | null = null;
  private initPromise: Promise<boolean> | null = null;

  constructor() {
    // Initial attempt to connect if credentials exist
    this.initPromise = this.init();
  }

  /**
   * Parse connection options from environment variables (Supports Aiven MySQL URL & individual params)
   */
  private getPoolConfig(): mysql.PoolOptions | null {
    // Check connection strings first (Aiven MySQL style)
    const rawUri =
      process.env.AIVEN_MYSQL_URL ||
      process.env.MYSQL_URL ||
      process.env.MYSQL_URI ||
      process.env.DATABASE_URL;

    if (rawUri && (rawUri.startsWith('mysql://') || rawUri.startsWith('mysql2://'))) {
      try {
        // Parse URL
        const parsed = new URL(rawUri);
        const config: mysql.PoolOptions = {
          host: parsed.hostname,
          port: parsed.port ? parseInt(parsed.port, 10) : 3306,
          user: decodeURIComponent(parsed.username || 'avnadmin'),
          password: decodeURIComponent(parsed.password || ''),
          database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'defaultdb',
          waitForConnections: true,
          connectionLimit: 10,
          maxIdle: 5,
          idleTimeout: 60000,
          queueLimit: 0,
          enableKeepAlive: true,
          keepAliveInitialDelay: 10000
        };

        // Aiven MySQL enforces SSL
        const sslParam = parsed.searchParams.get('ssl-mode');
        if (
          sslParam === 'REQUIRED' ||
          process.env.MYSQL_SSL === 'true' ||
          process.env.AIVEN_SSL === 'true' ||
          parsed.hostname.includes('aivencloud.com')
        ) {
          config.ssl = {
            rejectUnauthorized: false // Compatible with Aiven self-signed / public CA
          };
        }

        // Custom CA cert support if provided
        if (process.env.MYSQL_CA_CERT) {
          config.ssl = {
            ca: process.env.MYSQL_CA_CERT,
            rejectUnauthorized: true
          };
        } else if (process.env.MYSQL_CA_PATH && fs.existsSync(process.env.MYSQL_CA_PATH)) {
          config.ssl = {
            ca: fs.readFileSync(process.env.MYSQL_CA_PATH, 'utf-8'),
            rejectUnauthorized: true
          };
        }

        return config;
      } catch (err: any) {
        console.warn('[MySQL] Failed to parse connection URI:', err.message);
      }
    }

    // Individual environment variables
    const host = process.env.MYSQL_HOST || process.env.AIVEN_MYSQL_HOST;
    const user = process.env.MYSQL_USER || process.env.AIVEN_MYSQL_USER;
    const password = process.env.MYSQL_PASSWORD || process.env.AIVEN_MYSQL_PASSWORD;
    const database = process.env.MYSQL_DATABASE || process.env.AIVEN_MYSQL_DATABASE || 'defaultdb';
    const port = parseInt(process.env.MYSQL_PORT || process.env.AIVEN_MYSQL_PORT || '3306', 10);

    if (host && user) {
      const config: mysql.PoolOptions = {
        host,
        port,
        user,
        password: password || '',
        database,
        waitForConnections: true,
        connectionLimit: 10,
        enableKeepAlive: true
      };

      // If connecting to Aiven or SSL explicitly enabled
      if (
        host.includes('aivencloud.com') ||
        process.env.MYSQL_SSL === 'true' ||
        process.env.AIVEN_SSL === 'true'
      ) {
        config.ssl = {
          rejectUnauthorized: false
        };
      }

      if (process.env.MYSQL_CA_CERT) {
        config.ssl = {
          ca: process.env.MYSQL_CA_CERT,
          rejectUnauthorized: true
        };
      }

      return config;
    }

    return null;
  }

  /**
   * Initialize pool and test connection
   */
  public async init(): Promise<boolean> {
    const config = this.getPoolConfig();
    if (!config) {
      this.connectionError = 'No MySQL credentials found. Provide MYSQL_URL or MYSQL_HOST in .env.';
      this.isConnected = false;
      return false;
    }

    try {
      if (this.pool) {
        await this.pool.end().catch(() => {});
      }

      console.log(`[MySQL] Connecting to MySQL database at ${config.host}:${config.port}/${config.database}...`);
      this.pool = mysql.createPool(config);

      // Test connection
      const [rows]: any = await this.pool.query('SELECT 1 as test, DATABASE() as db_name, VERSION() as version');
      this.isConnected = true;
      this.connectionError = null;

      console.log(`[MySQL] Connected successfully to ${rows[0]?.db_name || config.database} (MySQL ${rows[0]?.version})`);

      // Ensure tables exist
      await this.ensureTablesExist();

      return true;
    } catch (err: any) {
      this.isConnected = false;
      this.connectionError = err.message || 'Unknown MySQL connection error';
      console.warn(`[MySQL] Connection warning: ${this.connectionError}. Application will use memory/file fallback.`);
      return false;
    }
  }

  /**
   * Automatically creates tables if they do not exist
   */
  public async ensureTablesExist(): Promise<void> {
    if (!this.pool || !this.isConnected) return;

    try {
      console.log('[MySQL] Checking schema tables...');

      // 1. Farmers
      await this.pool.query(`
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
          preferred_language VARCHAR(10) DEFAULT 'en',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
          INDEX idx_farmers_mobile (mobile_number),
          INDEX idx_farmers_district (district)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 2. Procurement Centers
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS procurement_centers (
          id VARCHAR(36) PRIMARY KEY,
          center_name VARCHAR(200) NOT NULL,
          location VARCHAR(255) NOT NULL,
          district VARCHAR(100) NOT NULL,
          state VARCHAR(100) NOT NULL,
          contact_number VARCHAR(20) NOT NULL,
          in_charge_name VARCHAR(150) NOT NULL,
          crops_accepted JSON NOT NULL,
          opening_time VARCHAR(20) DEFAULT '08:30 AM',
          closing_time VARCHAR(20) DEFAULT '05:30 PM',
          daily_capacity_quintals INT DEFAULT 500,
          google_maps_url TEXT,
          status VARCHAR(30) DEFAULT 'Open',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
          INDEX idx_centers_state_district (state, district),
          INDEX idx_centers_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 3. Schedules
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS procurement_schedules (
          id VARCHAR(36) PRIMARY KEY,
          center_id VARCHAR(36) NOT NULL,
          crop_name VARCHAR(100) NOT NULL,
          procurement_date DATE NOT NULL,
          start_time VARCHAR(20) DEFAULT '08:30 AM',
          end_time VARCHAR(20) DEFAULT '05:30 PM',
          available_slots INT NOT NULL DEFAULT 50,
          remaining_slots INT NOT NULL DEFAULT 50,
          status VARCHAR(30) DEFAULT 'Available',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
          INDEX idx_schedules_center_crop (center_id, crop_name, procurement_date),
          INDEX idx_schedules_date (procurement_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 4. Requests
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS procurement_requests (
          id VARCHAR(36) PRIMARY KEY,
          farmer_id VARCHAR(36) NOT NULL,
          center_id VARCHAR(36) NOT NULL,
          crop_name VARCHAR(100) NOT NULL,
          quantity_quintals DECIMAL(10, 2) NOT NULL,
          preferred_date DATE NOT NULL,
          transport_mode VARCHAR(50) DEFAULT 'Tractor',
          vehicle_number VARCHAR(50),
          token_number VARCHAR(20) NOT NULL,
          status VARCHAR(30) DEFAULT 'Request Submitted',
          queue_position INT DEFAULT 0,
          estimated_waiting_minutes INT DEFAULT 0,
          admin_notes TEXT,
          gate_entry_time DATETIME NULL,
          weighment_completed_time DATETIME NULL,
          payment_status VARCHAR(30) DEFAULT 'Pending',
          submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
          INDEX idx_requests_farmer (farmer_id),
          INDEX idx_requests_center (center_id),
          INDEX idx_requests_token (token_number),
          INDEX idx_requests_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 5. Announcements
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS announcements (
          id VARCHAR(36) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          priority VARCHAR(20) DEFAULT 'Normal',
          announcement_date DATE NOT NULL,
          center_id VARCHAR(36) NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
          INDEX idx_announcements_date (announcement_date DESC)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 6. Admin Users
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id VARCHAR(36) PRIMARY KEY,
          full_name VARCHAR(150) NOT NULL,
          email VARCHAR(150) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'Procurement Officer',
          assigned_center_id VARCHAR(36) NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
          INDEX idx_admin_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      console.log('[MySQL] Schema verification complete. All tables are ready.');
    } catch (err: any) {
      console.error('[MySQL] Error verifying tables:', err.message);
    }
  }

  public getPool(): mysql.Pool | null {
    return this.pool;
  }

  public getStatus() {
    return {
      connected: this.isConnected,
      error: this.connectionError,
      poolActive: !!this.pool,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Execute parameterized query
   */
  public async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    if (!this.pool || !this.isConnected) {
      throw new Error('MySQL is not connected');
    }
    const [results] = await this.pool.query(sql, params);
    return results as T[];
  }
}

export const mysqlDb = new MySQLDatabase();
