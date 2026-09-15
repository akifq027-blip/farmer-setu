import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

async function seed() {
  console.log('🌾 KisanSetu - Seeding Aiven MySQL Database...\n');

  const rawUri =
    process.env.AIVEN_MYSQL_URL ||
    process.env.MYSQL_URL ||
    process.env.MYSQL_URI ||
    process.env.DATABASE_URL;

  let poolConfig: mysql.PoolOptions;

  if (rawUri && (rawUri.startsWith('mysql://') || rawUri.startsWith('mysql2://'))) {
    const parsed = new URL(rawUri);
    poolConfig = {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 3306,
      user: decodeURIComponent(parsed.username || 'avnadmin'),
      password: decodeURIComponent(parsed.password || ''),
      database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'defaultdb',
      ssl: { rejectUnauthorized: false }
    };
  } else {
    const host = process.env.MYSQL_HOST || process.env.AIVEN_MYSQL_HOST;
    const user = process.env.MYSQL_USER || process.env.AIVEN_MYSQL_USER || 'avnadmin';
    const password = process.env.MYSQL_PASSWORD || process.env.AIVEN_MYSQL_PASSWORD || '';
    const database = process.env.MYSQL_DATABASE || process.env.AIVEN_MYSQL_DATABASE || 'defaultdb';
    const port = parseInt(process.env.MYSQL_PORT || process.env.AIVEN_MYSQL_PORT || '3306', 10);

    if (!host) {
      console.error('❌ Error: No MySQL connection settings found in .env');
      process.exit(1);
    }

    poolConfig = {
      host,
      port,
      user,
      password,
      database,
      ssl: { rejectUnauthorized: false }
    };
  }

  const conn = await mysql.createConnection(poolConfig);
  try {
    console.log('Connected to MySQL. Reading initial data from data/store.json or defaults...');

    const storePath = path.join(process.cwd(), 'data', 'store.json');
    let seedData: any = null;
    if (fs.existsSync(storePath)) {
      seedData = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    }

    if (seedData) {
      // 1. Centers
      if (seedData.procurement_centers) {
        for (const c of seedData.procurement_centers) {
          await conn.query(
            `INSERT INTO procurement_centers (id, center_name, location, district, state, contact_number, in_charge_name, crops_accepted, opening_time, closing_time, daily_capacity_quintals, google_maps_url, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE center_name = VALUES(center_name), contact_number = VALUES(contact_number), status = VALUES(status)`,
            [
              c.id,
              c.center_name,
              c.location,
              c.district,
              c.state,
              c.contact_number,
              c.in_charge_name,
              JSON.stringify(c.crops_accepted || []),
              c.opening_time || '08:30 AM',
              c.closing_time || '05:30 PM',
              c.daily_capacity_quintals || 500,
              c.google_maps_url || '',
              c.status || 'Open'
            ]
          );
        }
        console.log(`✅ Seeded ${seedData.procurement_centers.length} procurement centers`);
      }

      // 2. Farmers
      if (seedData.farmers) {
        for (const f of seedData.farmers) {
          await conn.query(
            `INSERT INTO farmers (id, full_name, mobile_number, email, password_hash, village, district, state, land_record_id, preferred_language)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), village = VALUES(village)`,
            [
              f.id,
              f.full_name,
              f.mobile_number,
              f.email || null,
              f.password_hash || 'password123',
              f.village,
              f.district,
              f.state,
              f.land_record_id || null,
              f.preferred_language || 'en'
            ]
          );
        }
        console.log(`✅ Seeded ${seedData.farmers.length} farmers`);
      }

      // 3. Admin Users
      if (seedData.admin_users) {
        for (const a of seedData.admin_users) {
          await conn.query(
            `INSERT INTO admin_users (id, full_name, email, password_hash, role, assigned_center_id)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), role = VALUES(role)`,
            [
              a.id,
              a.full_name,
              a.email,
              a.password_hash,
              a.role,
              a.assigned_center_id || null
            ]
          );
        }
        console.log(`✅ Seeded ${seedData.admin_users.length} admin accounts`);
      }

      // 4. Schedules
      if (seedData.procurement_schedules) {
        for (const s of seedData.procurement_schedules) {
          await conn.query(
            `INSERT INTO procurement_schedules (id, center_id, crop_name, procurement_date, start_time, end_time, available_slots, remaining_slots, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE remaining_slots = VALUES(remaining_slots), status = VALUES(status)`,
            [
              s.id,
              s.center_id,
              s.crop_name,
              s.procurement_date,
              s.start_time || '08:30 AM',
              s.end_time || '05:30 PM',
              s.available_slots || 50,
              s.remaining_slots || 50,
              s.status || 'Available'
            ]
          );
        }
        console.log(`✅ Seeded ${seedData.procurement_schedules.length} schedules`);
      }

      // 5. Requests
      if (seedData.procurement_requests) {
        for (const r of seedData.procurement_requests) {
          await conn.query(
            `INSERT INTO procurement_requests (id, farmer_id, center_id, crop_name, quantity_quintals, preferred_date, transport_mode, vehicle_number, token_number, status, queue_position, estimated_waiting_minutes, admin_notes, payment_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE status = VALUES(status), queue_position = VALUES(queue_position), estimated_waiting_minutes = VALUES(estimated_waiting_minutes)`,
            [
              r.id,
              r.farmer_id,
              r.center_id,
              r.crop_name,
              r.quantity_quintals,
              r.preferred_date,
              r.transport_mode || 'Tractor',
              r.vehicle_number || '',
              r.token_number,
              r.status || 'Request Submitted',
              r.queue_position || 0,
              r.estimated_waiting_minutes || 0,
              r.admin_notes || '',
              r.payment_status || 'Pending'
            ]
          );
        }
        console.log(`✅ Seeded ${seedData.procurement_requests.length} procurement requests`);
      }
    }

    console.log('\n🎉 Database seeding completed successfully!\n');
  } catch (err: any) {
    console.error('❌ Seeding error:', err.message);
  } finally {
    await conn.end().catch(() => {});
  }
}

seed().catch(console.error);
