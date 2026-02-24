import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function getTasks(userId) {
  const result = await pool.query(
    'SELECT id, text, completed, priority FROM tasks WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}

async function createTask({ text, priority, userId }) {
  const result = await pool.query(
    'INSERT INTO tasks (text, priority, user_id) VALUES ($1, $2, $3) RETURNING id, text, completed, priority',
    [text, priority, userId]
  );
  return result.rows[0];
}

async function toggleTask(id, userId) {
  const result = await pool.query(
    'UPDATE tasks SET completed = NOT completed WHERE id = $1 AND user_id = $2 RETURNING id, text, completed, priority',
    [id, userId]
  );
  return result.rows[0] || null;
}

async function logFocusSession({ type, durationSeconds, userId }) {
  await pool.query(
    'INSERT INTO focus_sessions (type, duration_seconds, user_id) VALUES ($1, $2, $3)',
    [type, durationSeconds, userId]
  );
}

// Chat
async function getChannels() {
  const result = await pool.query('SELECT id, name FROM chat_channels ORDER BY name ASC');
  return result.rows;
}

async function getMessages(channelId) {
  const result = await pool.query(`
        SELECT m.id, m.text, m.timestamp, u.id as author_id, u.name as author_name, u.avatar as author_avatar
        FROM chat_messages m
        JOIN user_profiles u ON m.user_id = u.id
        WHERE m.channel_id = $1
        ORDER BY m.timestamp ASC
        LIMIT 50
    `, [channelId]);
  return result.rows.map(row => ({
    id: row.id,
    text: row.text,
    timestamp: row.timestamp,
    author: {
      id: row.author_id,
      name: row.author_name,
      avatar: row.author_avatar
    }
  }));
}

async function createMessage({ channelId, userId, text }) {
  const result = await pool.query(
    'INSERT INTO chat_messages (channel_id, user_id, text) VALUES ($1, $2, $3) RETURNING id, text, timestamp',
    [channelId, userId, text]
  );
  // Fetch author info to return full message object
  const userResult = await pool.query('SELECT name, avatar FROM user_profiles WHERE id = $1', [userId]);
  const user = userResult.rows[0];
  return {
    ...result.rows[0],
    author: {
      id: userId,
      name: user.name,
      avatar: user.avatar
    }
  };
}

// Social / Groups
async function getGroups() {
  const result = await pool.query('SELECT id, name, icon, subject, description, member_count as "memberCount", max_members as "maxMembers", is_private as "isPrivate" FROM study_groups');
  return result.rows;
}

async function joinGroup(groupId, userId) {
  await pool.query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [groupId, userId]);
  const result = await pool.query('UPDATE study_groups SET member_count = member_count + 1 WHERE id = $1 RETURNING *', [groupId]);
  return result.rows[0];
}

async function leaveGroup(groupId, userId) {
  await pool.query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
  const result = await pool.query('UPDATE study_groups SET member_count = GREATEST(0, member_count - 1) WHERE id = $1 RETURNING *', [groupId]);
  return result.rows[0];
}

async function getFriends(userId) {
  const result = await pool.query(`
        SELECT u.id, u.name, u.avatar, u.online, u.studying
        FROM friends f
        JOIN user_profiles u ON f.friend_id = u.id
        WHERE f.user_id = $1
    `, [userId]);
  return result.rows;
}

async function syncUserProfile({ id, name, avatar }) {
  // Check if user already exists
  const existing = await pool.query('SELECT registration_status, dpdx_access_key, is_verified, is_admin FROM user_profiles WHERE id = $1', [id]);

  let initialStatus = 'active';
  if (existing.rows.length === 0) {
    // New user, check settings
    const settings = await getGlobalSettings();
    if (settings.require_approval === 'true') {
      initialStatus = 'pending';
    }
  }

  const result = await pool.query(`
        INSERT INTO user_profiles (id, name, avatar, registration_status) 
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, avatar = EXCLUDED.avatar
        RETURNING is_verified, is_admin, registration_status, dpdx_access_key
    `, [id, name, avatar, existing.rows[0]?.registration_status || initialStatus]);

  return {
    isVerified: result.rows[0].is_verified,
    isAdmin: result.rows[0].is_admin,
    registrationStatus: result.rows[0].registration_status,
    dpdxAccessKey: result.rows[0].dpdx_access_key
  };
}

async function updateMusicKey(userId, key) {
  await pool.query('UPDATE user_profiles SET dpdx_access_key = $1 WHERE id = $2', [key, userId]);
  return { success: true };
}

async function updateUserStatus(id, status) {
  const result = await pool.query(
    'UPDATE user_profiles SET registration_status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );
  return result.rows[0];
}

async function getDashboardStats(userId) {
  // 1. Study time today
  const todayResult = await pool.query(`
        SELECT COALESCE(SUM(duration_seconds), 0) as total
        FROM focus_sessions
        WHERE user_id = $1 AND created_at >= CURRENT_DATE
    `, [userId]);

  // 2. Weekly progress
  const weeklyResult = await pool.query(`
        SELECT 
            TO_CHAR(created_at, 'Dy') as name,
            SUM(duration_seconds) / 3600.0 as hours
        FROM focus_sessions
        WHERE user_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY TO_CHAR(created_at, 'Dy'), DATE_TRUNC('day', created_at)
        ORDER BY DATE_TRUNC('day', created_at) ASC
    `, [userId]);

  // 3. User streaks and points
  const profileResult = await pool.query('SELECT current_streak, max_streak, points, is_verified_solver FROM user_profiles WHERE id = $1', [userId]);

  return {
    todayHours: (todayResult.rows[0].total / 3600.0).toFixed(2),
    weeklyData: weeklyResult.rows,
    streak: profileResult.rows[0]?.current_streak || 0,
    points: profileResult.rows[0]?.points || 0,
    isVerifiedSolver: profileResult.rows[0]?.is_verified_solver || false
  };
}

async function getSuggestions() {
  const result = await pool.query(`
        SELECT s.id, s.text, s.upvotes, u.name as author
        FROM community_suggestions s
        JOIN user_profiles u ON s.user_id = u.id
        ORDER BY s.upvotes DESC, s.created_at DESC
    `);
  return result.rows;
}

async function createSuggestion(userId, text) {
  const result = await pool.query(
    'INSERT INTO community_suggestions (user_id, text) VALUES ($1, $2) RETURNING id, text, upvotes',
    [userId, text]
  );
  return result.rows[0];
}

async function upvoteSuggestion(suggestionId) {
  await pool.query('UPDATE community_suggestions SET upvotes = upvotes + 1 WHERE id = $1', [suggestionId]);
}

async function getAdminStats() {
  const users = await pool.query('SELECT COUNT(*) as total FROM user_profiles');
  const activeToday = await pool.query('SELECT COUNT(DISTINCT user_id) as total FROM focus_sessions WHERE created_at >= CURRENT_DATE');
  const groups = await pool.query('SELECT COUNT(*) as total FROM study_groups');

  // Weekly active users (last 7 days)
  const dailyUsers = await pool.query(`
        SELECT TO_CHAR(created_at, 'Dy') as name, COUNT(DISTINCT user_id) as users
        FROM focus_sessions
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY TO_CHAR(created_at, 'Dy'), DATE_TRUNC('day', created_at)
        ORDER BY DATE_TRUNC('day', created_at) ASC
    `);

  return {
    totalUsers: users.rows[0].total,
    activeToday: activeToday.rows[0].total,
    groups: groups.rows[0].total,
    dailyUsers: dailyUsers.rows
  };
}

async function getAdminUsers() {
  const result = await pool.query('SELECT id, name, avatar, is_verified, is_admin, registration_status FROM user_profiles ORDER BY created_at DESC');
  return result.rows;
}

async function deleteMessage(messageId) {
  await pool.query('DELETE FROM chat_messages WHERE id = $1', [messageId]);
}

async function disbandGroup(groupId) {
  await pool.query('DELETE FROM study_groups WHERE id = $1', [groupId]);
}

async function isAdminUser(userId) {
  const result = await pool.query('SELECT is_admin FROM user_profiles WHERE id = $1', [userId]);
  return result.rows[0]?.is_admin === true;
}
async function getProfileStats(userId) {
  // 1. Total study hours
  const hoursResult = await pool.query(`
        SELECT COALESCE(SUM(duration_seconds) / 3600.0, 0) as total
        FROM focus_sessions
        WHERE user_id = $1
    `, [userId]);

  // 2. Tasks completed
  const tasksResult = await pool.query(`
        SELECT COUNT(*) as total
        FROM tasks
        WHERE user_id = $1 AND completed = true
    `, [userId]);

  // 3. Subject distribution (mocking from studying info for now)
  const subjectData = [
    { name: 'Focus', value: parseFloat(hoursResult.rows[0].total) }
  ];

  // 4. Friends count
  const friendsResult = await pool.query(`
        SELECT COUNT(*) as total
        FROM friends
        WHERE (user_id = $1 OR friend_id = $1) AND status = 'accepted'
    `, [userId]);

  const userResult = await pool.query('SELECT current_streak, max_streak FROM user_profiles WHERE id = $1', [userId]);

  return {
    totalHours: parseFloat(hoursResult.rows[0].total).toFixed(1),
    tasksDone: tasksResult.rows[0].total,
    currentStreak: userResult.rows[0]?.current_streak || 0,
    maxStreak: userResult.rows[0]?.max_streak || 0,
    friendsCount: friendsResult.rows[0].total,
    subjectData
  };
}

async function verifyReferralCode(userId, code) {
  const codeResult = await pool.query('SELECT * FROM referral_codes WHERE code = $1', [code]);
  if (codeResult.rows.length === 0) {
    return { success: false, error: 'Invalid referral code' };
  }

  await pool.query('UPDATE user_profiles SET is_verified = true WHERE id = $1', [userId]);
  await pool.query('UPDATE referral_codes SET used_count = used_count + 1 WHERE code = $1', [code]);

  return { success: true };
}

// Doubts Section
async function getDoubts() {
  const result = await pool.query(`
    SELECT d.*, u.name as author_name, u.avatar as author_avatar,
    (SELECT COUNT(*) FROM doubt_answers WHERE doubt_id = d.id) as answer_count
    FROM doubts d
    JOIN user_profiles u ON d.user_id = u.id
    ORDER BY d.created_at DESC
  `);
  return result.rows.map(row => ({
    id: row.id,
    title: row.title,
    text: row.text,
    topic: row.topic,
    grade: row.grade,
    imageUrl: row.image_url,
    createdAt: row.created_at,
    answerCount: parseInt(row.answer_count),
    author: {
      id: row.user_id,
      name: row.author_name,
      avatar: row.author_avatar
    }
  }));
}

async function createDoubt({ userId, title, text, topic, grade, imageUrl }) {
  const result = await pool.query(
    'INSERT INTO doubts (user_id, title, text, topic, grade, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [userId, title, text, topic, grade, imageUrl]
  );
  return result.rows[0];
}

async function getDoubtAnswers(doubtId) {
  const result = await pool.query(`
    SELECT a.*, u.name as author_name, u.avatar as author_avatar, u.is_verified_solver
    FROM doubt_answers a
    JOIN user_profiles u ON a.user_id = u.id
    WHERE a.doubt_id = $1
    ORDER BY a.created_at ASC
  `, [doubtId]);
  return result.rows.map(row => ({
    id: row.id,
    text: row.text,
    createdAt: row.created_at,
    author: {
      id: row.user_id,
      name: row.author_name,
      avatar: row.author_avatar,
      isVerifiedSolver: row.is_verified_solver
    }
  }));
}

async function createDoubtAnswer({ doubtId, userId, text }) {
  const result = await pool.query(
    'INSERT INTO doubt_answers (doubt_id, user_id, text) VALUES ($1, $2, $3) RETURNING *',
    [doubtId, userId, text]
  );
  // Award points: 5 points per answer
  await pool.query('UPDATE user_profiles SET points = points + 5 WHERE id = $1', [userId]);
  return result.rows[0];
}

async function verifySolver(userId) {
  await pool.query('UPDATE user_profiles SET is_verified_solver = true WHERE id = $1', [userId]);
}

// Books Section
async function getBookFolders(parentId = null) {
  const result = await pool.query(
    'SELECT * FROM book_folders WHERE parent_id IS NOT DISTINCT FROM $1 ORDER BY name ASC',
    [parentId]
  );
  return result.rows;
}

async function createBookFolder(name, parentId = null) {
  const result = await pool.query(
    'INSERT INTO book_folders (name, parent_id) VALUES ($1, $2) RETURNING *',
    [name, parentId]
  );
  return result.rows[0];
}

async function deleteBookFolder(id) {
  await pool.query('DELETE FROM book_folders WHERE id = $1', [id]);
}

async function updateBookFolder(id, name) {
  const result = await pool.query(
    'UPDATE book_folders SET name = $1 WHERE id = $2 RETURNING *',
    [name, id]
  );
  return result.rows[0];
}

async function getBooks(folderId) {
  const result = await pool.query(
    'SELECT * FROM books WHERE folder_id = $1 ORDER BY title ASC',
    [folderId]
  );
  return result.rows;
}

async function createBook({ folderId, title, author, pdfUrl, pdfUrlAlt = null, grade = null, exam = null, subject = null, mirrors = [], primarySource = 'catbox' }) {
  const result = await pool.query(
    'INSERT INTO books (folder_id, title, author, pdf_url, pdf_url_alt, grade, exam, subject, mirrors, primary_source) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
    [folderId, title, author, pdfUrl, pdfUrlAlt, grade, exam, subject, JSON.stringify(mirrors), primarySource]
  );
  return result.rows[0];
}

async function updateBook(id, updates) {
  const fields = [];
  const values = [];
  let index = 1;

  for (const [key, value] of Object.entries(updates)) {
    // Map frontend camelCase to backend snake_case if necessary, or assume compatible keys
    // For books, most keys except pdf_url match. Let's be explicit for safety.
    const dbKey = key === 'pdfUrl' ? 'pdf_url' :
      key === 'pdfUrlAlt' ? 'pdf_url_alt' :
        key === 'primarySource' ? 'primary_source' : key;

    fields.push(`${dbKey} = $${index}`);
    values.push(key === 'mirrors' ? JSON.stringify(value || []) : value);
    index++;
  }

  if (fields.length === 0) return null;

  values.push(id);
  const query = `UPDATE books SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`;

  const result = await pool.query(query, values);
  return result.rows[0];
}

async function deleteBook(id) {
  await pool.query('DELETE FROM books WHERE id = $1', [id]);
}

// Book Requests
async function getBookRequests() {
  const result = await pool.query(`
    SELECT br.*, up.name as user_name 
    FROM book_requests br 
    JOIN user_profiles up ON br.user_id = up.id 
    ORDER BY br.created_at DESC
  `);
  return result.rows;
}

async function createBookRequest(userId, title, author, description) {
  const result = await pool.query(
    'INSERT INTO book_requests (user_id, title, author, description) VALUES ($1, $2, $3, $4) RETURNING *',
    [userId, title, author, description]
  );
  return result.rows[0];
}

async function updateBookRequestStatus(id, status) {
  const result = await pool.query(
    'UPDATE book_requests SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );
  return result.rows[0];
}

// Book Notes
async function getBookNote(userId, bookId) {
  const result = await pool.query(
    'SELECT * FROM book_notes WHERE user_id = $1 AND book_id = $2',
    [userId, bookId]
  );
  return result.rows[0];
}

async function upsertBookNote(userId, bookId, content) {
  const result = await pool.query(`
    INSERT INTO book_notes (user_id, book_id, content) 
    VALUES ($1, $2, $3) 
    ON CONFLICT (user_id, book_id) 
    DO UPDATE SET content = $3, updated_at = CURRENT_TIMESTAMP 
    RETURNING *
  `, [userId, bookId, content]);
  return result.rows[0];
}

// Site Settings
async function getGlobalSettings() {
  const result = await pool.query('SELECT key, value FROM site_settings');
  const settings = {};
  result.rows.forEach(row => {
    settings[row.key] = row.value;
  });
  return settings;
}

async function updateGlobalSetting(key, value) {
  const result = await pool.query(
    'INSERT INTO site_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP RETURNING *',
    [key, JSON.stringify(value)]
  );
  return result.rows[0];
}

// Ban Appeals
async function createBanAppeal(userId, reason) {
  const result = await pool.query(
    'INSERT INTO ban_appeals (user_id, reason) VALUES ($1, $2) RETURNING *',
    [userId, reason]
  );
  return result.rows[0];
}

async function getBanAppeals() {
  const result = await pool.query(`
    SELECT ba.*, up.name as user_name 
    FROM ban_appeals ba
    JOIN user_profiles up ON ba.user_id = up.id
    ORDER BY ba.created_at DESC
  `);
  return result.rows;
}

async function updateBanAppealStatus(id, status, adminNote = null) {
  const result = await pool.query(
    'UPDATE ban_appeals SET status = $1, admin_note = $2 WHERE id = $3 RETURNING *',
    [status, adminNote, id]
  );

  if (status === 'approved') {
    const userId = result.rows[0].user_id;
    await pool.query('UPDATE user_profiles SET registration_status = $1 WHERE id = $2', ['active', userId]);
  }

  return result.rows[0];
}

// AI Chat History
async function ensureAiChatTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_chat_history (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'ai')),
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ai_chat_history_user_id_idx ON ai_chat_history(user_id);
  `);
}

// Run migration once on startup
ensureAiChatTable().catch(err => console.error('[DB] ai_chat_history migration failed:', err));

async function getAiChatHistory(userId) {
  const result = await pool.query(
    'SELECT id, role, text, created_at FROM ai_chat_history WHERE user_id = $1 ORDER BY created_at ASC LIMIT 200',
    [userId]
  );
  return result.rows.map(r => ({ id: String(r.id), role: r.role, text: r.text }));
}

async function saveAiChatMessage(userId, role, text) {
  const result = await pool.query(
    'INSERT INTO ai_chat_history (user_id, role, text) VALUES ($1, $2, $3) RETURNING id, role, text',
    [userId, role, text]
  );
  return { id: String(result.rows[0].id), role: result.rows[0].role, text: result.rows[0].text };
}

async function clearAiChatHistory(userId) {
  await pool.query('DELETE FROM ai_chat_history WHERE user_id = $1', [userId]);
}

export {
  getTasks, createTask, toggleTask, logFocusSession,
  getChannels, getMessages, createMessage,
  getGroups, joinGroup, leaveGroup,
  getFriends, syncUserProfile, verifyReferralCode,
  getDashboardStats, getSuggestions, createSuggestion, upvoteSuggestion,
  getProfileStats,
  getAdminStats, getAdminUsers, deleteMessage, disbandGroup, isAdminUser, updateUserStatus,
  getDoubts, createDoubt, getDoubtAnswers, createDoubtAnswer, verifySolver,
  getBookFolders, createBookFolder, deleteBookFolder, updateBookFolder, getBooks, createBook, updateBook, deleteBook,
  getBookRequests, createBookRequest, updateBookRequestStatus,
  getBookNote, upsertBookNote,
  getGlobalSettings, updateGlobalSetting,
  createBanAppeal, getBanAppeals, updateBanAppealStatus,
  updateMusicKey,
  getAiChatHistory, saveAiChatMessage, clearAiChatHistory
};

