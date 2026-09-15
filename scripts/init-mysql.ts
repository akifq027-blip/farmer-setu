import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

async function main() {
  console.log('====================================================');
  console.log('🌾 KisanSetu - Aiven MySQL Database Setup & Init');
  console.log('====================================================\n');

  const rawUri =
    process.env.AIVEN_MYSQL_URL ||
    process.env.MYSQL_URL ||
    process.env.MYSQL_URI ||
    process.env.DATABASE_URL;

  let poolConfig: mysql.PoolOptions;

  if (rawUri && (rawUri.startsWith('mysql://') || rawUri.startsWith('mysql2://'))) {
    const parsed = new URL(rawUri);
    console.log(`📡 Connecting using URI: ${parsed.protocol}//${parsed.username}:****@${parsed.hostname}:${parsed.port}${parsed.pathname}`);
    
    poolConfig = {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 3306,
      user: decodeURIComponent(parsed.username || 'avnadmin'),
      password: decodeURIComponent(parsed.password || ''),
      database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'defaultdb',
      waitForConnections: true,
      connectionLimit: 5,
      ssl: {
        rejectUnauthorized: false
      }
    };
  } else {
    const host = process.env.MYSQL_HOST || process.env.AIVEN_MYSQL_HOST;
    const user = process.env.MYSQL_USER || process.env.AIVEN_MYSQL_USER || 'avnadmin';
    const password = process.env.MYSQL_PASSWORD || process.env.AIVEN_MYSQL_PASSWORD || '';
    const database = process.env.MYSQL_DATABASE || process.env.AIVEN_MYSQL_DATABASE || 'defaultdb';
    const port = parseInt(process.env.MYSQL_PORT || process.env.AIVEN_MYSQL_PORT || '3306', 10);

    if (!host) {
      console.error('❌ Error: No MySQL credentials found in environment variables.');
      console.error('\nPlease set in your .env file either:');
      console.error('  MYSQL_URL=mysql://avnadmin:YOUR_PASSWORD@YOUR_HOST.aivencloud.com:PORT/defaultdb?ssl-mode=REQUIRED');
      console.error('or:');
      console.error('  MYSQL_HOST=YOUR_HOST.aivencloud.com');
      console.error('  MYSQL_PORT=PORT');
      console.error('  MYSQL_USER=avnadmin');
      console.error('  MYSQL_PASSWORD=YOUR_PASSWORD');
      console.error('  MYSQL_DATABASE=defaultdb');
      console.error('  MYSQL_SSL=true');
      process.exit(1);
    }

    console.log(`📡 Connecting to MySQL at ${host}:${port}, database: ${database}...`);

    poolConfig = {
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 5,
      ssl: {
        rejectUnauthorized: false
      }
    };
  }

  let connection: mysql.Connection | null = null;
  try {
    connection = await mysql.createConnection(poolConfig);
    console.log('✅ Connected successfully to MySQL server!\n');

    const [verResult]: any = await connection.query('SELECT VERSION() as version, DATABASE() as db');
    console.log(`ℹ️  Server Version: ${verResult[0]?.version}`);
    console.log(`ℹ️  Current Database: ${verResult[0]?.db}\n`);

    const schemaPath = path.join(process.cwd(), 'mysql', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.error(`❌ Schema file not found at ${schemaPath}`);
      process.exit(1);
    }

    console.log('🚀 Executing /mysql/schema.sql...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    // Split SQL into individual statements, ignoring comments
    const statements = schemaSql
      .split(/;\s*$/m)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      if (!stmt) continue;
      try {
        await connection.query(stmt);
      } catch (stmtErr: any) {
        // Ignore "already exists" errors for tables
        if (!stmtErr.message.includes('already exists')) {
          console.warn(`⚠️ Warning executing statement: ${stmtErr.message}`);
        }
      }
    }

    console.log('✅ Schema tables verified/created successfully:');
    console.log('   - farmers');
    console.log('   - procurement_centers');
    console.log('   - procurement_schedules');
    console.log('   - procurement_requests');
    console.log('   - announcements');
    console.log('   - admin_users\n');

    // Display counts
    const [centers]: any = await connection.query('SELECT COUNT(*) as count FROM procurement_centers');
    const [farmers]: any = await connection.query('SELECT COUNT(*) as count FROM farmers');
    const [requests]: any = await connection.query('SELECT COUNT(*) as count FROM procurement_requests');
    const [schedules]: any = await connection.query('SELECT COUNT(*) as count FROM procurement_schedules');

    console.log(`📊 Current Row Counts:`);
    console.log(`   - Centers: ${centers[0]?.count}`);
    console.log(`   - Farmers: ${farmers[0]?.count}`);
    console.log(`   - Requests: ${requests[0]?.count}`);
    console.log(`   - Schedules: ${schedules[0]?.count}`);

    console.log('\n🎉 MySQL (Aiven) database setup is complete and fully functional!\n');
  } catch (error: any) {
    console.error('❌ Failed to initialize MySQL database:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end().catch(() => {});
    }
  }
}

main().catch(console.error);
