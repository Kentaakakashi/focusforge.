import '../boot/verify.js';
import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function seed() {
    console.log('Seeding moderation test message...');

    try {
        // 1. Ensure TrollMaster exists or create a placeholder profile
        // Note: We use a dummy ID here for the placeholder
        const trollId = 'troll_dummy_id';
        await pool.query(`
      INSERT INTO user_profiles (id, name, avatar, is_verified)
      VALUES ($1, $2, $3, true)
      ON CONFLICT (id) DO NOTHING
    `, [trollId, 'TrollMaster', 'https://api.dicebear.com/7.x/bottts/svg?seed=TrollMaster']);

        // 2. Insert the controversial message into #global
        await pool.query(`
      INSERT INTO chat_messages (channel_id, user_id, text)
      VALUES ('global', $1, $2)
    `, [trollId, "This logic is flawed! Mock data is for losers!"]);

        console.log('Successfully seeded TrollMaster message in #global!');
    } catch (err) {
        console.error('Error seeding moderation message:', err);
    } finally {
        await pool.end();
    }
}

seed();
