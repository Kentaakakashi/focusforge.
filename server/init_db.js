import '../boot/verify.js';
import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function init() {
  console.log('Initializing database...');

  try {
    // 1. User Profiles
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar TEXT,
        online BOOLEAN DEFAULT false,
        studying TEXT,
        is_verified BOOLEAN DEFAULT false,
        is_admin BOOLEAN DEFAULT false,
        current_streak INTEGER DEFAULT 0,
        max_streak INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add columns if they don't exist
    await pool.query(`
      ALTER TABLE user_profiles 
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS max_streak INTEGER DEFAULT 0
    `);

    // Add is_verified if it doesn't exist
    await pool.query(`
      ALTER TABLE user_profiles 
      ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS dpdx_access_key TEXT
    `);

    // 2. Tasks
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES user_profiles(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        completed BOOLEAN DEFAULT false,
        priority TEXT DEFAULT 'medium',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Focus Sessions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS focus_sessions (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES user_profiles(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Chat Channels
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_channels (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed initial channels if empty
    const channelCheck = await pool.query('SELECT COUNT(*) FROM chat_channels');
    if (parseInt(channelCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO chat_channels (id, name) VALUES 
        ('global', '🌍 Global Chat'),
        ('doubts', '❓ Doubts Section'),
        ('physics', '⚛️ physics'),
        ('math', '➗ math'),
        ('coding', '💻 coding'),
        ('exams', '✍️ exams')
      `);
    }

    // 5. Chat Messages
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        channel_id TEXT REFERENCES chat_channels(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES user_profiles(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Study Groups
    await pool.query(`
      CREATE TABLE IF NOT EXISTS study_groups (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT,
        subject TEXT,
        description TEXT,
        member_count INTEGER DEFAULT 0,
        max_members INTEGER DEFAULT 50,
        is_private BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed initial groups if empty
    const groupCheck = await pool.query('SELECT COUNT(*) FROM study_groups');
    if (parseInt(groupCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO study_groups (name, icon, subject, description, member_count, max_members, is_private) VALUES 
        ('Physics PhDs', '⚛️', 'Physics', 'Advanced physics study group.', 0, 50, true),
        ('Calculus Crew', '📈', 'Math', 'Working through advanced calculus topics.', 0, 30, false)
      `);
    }

    // 7. Group Members (Joint Table)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS group_members (
        group_id INTEGER REFERENCES study_groups(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES user_profiles(id) ON DELETE CASCADE,
        PRIMARY KEY (group_id, user_id)
      )
    `);

    // 8. Friends
    await pool.query(`
      CREATE TABLE IF NOT EXISTS friends (
        user_id TEXT REFERENCES user_profiles(id) ON DELETE CASCADE,
        friend_id TEXT REFERENCES user_profiles(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'accepted',
        PRIMARY KEY (user_id, friend_id)
      )
    `);

    // 9. Referral Codes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS referral_codes (
        code TEXT PRIMARY KEY,
        used_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 10. Community Suggestions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS community_suggestions (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES user_profiles(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        upvotes INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 11. User Achievements
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        user_id TEXT REFERENCES user_profiles(id) ON DELETE CASCADE,
        achievement_id TEXT NOT NULL,
        unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, achievement_id)
      )
    `);

    // 12. Doubts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS doubts (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES user_profiles(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        text TEXT NOT NULL,
        topic TEXT NOT NULL,
        grade TEXT NOT NULL,
        image_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 13. Doubt Answers
    await pool.query(`
      CREATE TABLE IF NOT EXISTS doubt_answers (
        id SERIAL PRIMARY KEY,
        doubt_id INTEGER REFERENCES doubts(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES user_profiles(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 14. Book Folders
    await pool.query(`
      CREATE TABLE IF NOT EXISTS book_folders (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id INTEGER REFERENCES book_folders(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 15. Books
    await pool.query(`
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        folder_id INTEGER REFERENCES book_folders(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        pdf_url TEXT NOT NULL,
        pdf_url_alt TEXT,
        mirrors JSONB DEFAULT '[]',
        author TEXT,
        grade TEXT,
        exam TEXT,
        subject TEXT,
        primary_source TEXT DEFAULT 'catbox',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add columns that may be missing from older installs
    await pool.query(`
      ALTER TABLE books 
      ADD COLUMN IF NOT EXISTS primary_source TEXT DEFAULT 'catbox',
      ADD COLUMN IF NOT EXISTS pdf_url_alt TEXT,
      ADD COLUMN IF NOT EXISTS grade TEXT,
      ADD COLUMN IF NOT EXISTS exam TEXT,
      ADD COLUMN IF NOT EXISTS subject TEXT,
      ADD COLUMN IF NOT EXISTS mirrors JSONB DEFAULT '[]'
    `);

    // 16. Book Requests
    await pool.query(`
      CREATE TABLE IF NOT EXISTS book_requests (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        author TEXT,
        description TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 17. Book Notes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS book_notes (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, book_id)
      )
    `);

    // 18. Site Settings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default settings
    await pool.query(`
      INSERT INTO site_settings (key, value) VALUES 
      ('require_referral', 'true'),
      ('require_approval', 'true'),
      ('default_upload_provider', '"catbox"')
      ON CONFLICT (key) DO NOTHING
    `);

    // 19. Ban Appeals
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ban_appeals (
        id SERIAL PRIMARY KEY,
        user_id TEXT REFERENCES user_profiles(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        admin_note TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default referral code
    await pool.query(`
      INSERT INTO referral_codes (code) VALUES ('NEO-2026') ON CONFLICT DO NOTHING
    `);

    console.log('Database initialization complete!');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    await pool.end();
  }
}

init();
