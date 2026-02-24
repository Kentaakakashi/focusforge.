import '../boot/verify.js';
import { execSync } from 'child_process';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
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
} from './db.js';
import { authenticate, verifyAuthToken } from './firebaseAdmin.js';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { Server } from 'socket.io';
import { createServer } from 'http';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

if (!fs.existsSync(distPath)) {
  console.log("\x1b[33m%s\x1b[0m", "[!] Production build not found. Generating now...");
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log("\x1b[32m%s\x1b[0m", "[√] Build complete.");
  } catch (e) {
    console.error("\x1b[31m%s\x1b[0m", "[X] Build failed. Check your frontend code.");
    process.exit(1);
  }
} else {
  console.log("\x1b[36m%s\x1b[0m", "[i] Existing build found in /dist");
}

app.use(cors());
app.use(express.json());

// Admin Middleware
const isAdmin = async (req, res, next) => {
  try {
    const userId = await verifyAuthToken(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Check if user is admin in DB
    const admin = await isAdminUser(userId);
    if (!admin) return res.status(403).json({ error: 'Forbidden' });

    req.userId = userId;
    next();
  } catch (err) {
    console.error('[Admin Auth Error]:', err);
    res.status(500).json({ error: 'Admin check failed' });
  }
};

app.get('/api/tasks', async (req, res) => {
  try {
    const userId = await verifyAuthToken(req.headers.authorization);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const tasks = await getTasks(userId);
    res.json(tasks);
  } catch {
    res.status(500).json({ error: 'Failed to load tasks' });
  }
});

app.post('/api/tasks', async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ error: 'Text is required' });
    return;
  }
  try {
    const userId = await verifyAuthToken(req.headers.authorization);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const task = await createTask({ text: text.trim(), priority: 'medium', userId });
    res.status(201).json(task);
  } catch {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.patch('/api/tasks/:id/toggle', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  try {
    const userId = await verifyAuthToken(req.headers.authorization);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const task = await toggleTask(id, userId);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(task);
  } catch {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

app.post('/api/focus-sessions', async (req, res) => {
  const { type, durationSeconds } = req.body;
  if (
    (type !== 'focus' && type !== 'break') ||
    !Number.isInteger(durationSeconds) ||
    durationSeconds <= 0
  ) {
    res.status(400).json({ error: 'Invalid session' });
    return;
  }
  try {
    const userId = await verifyAuthToken(req.headers.authorization);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    await logFocusSession({ type, durationSeconds, userId });
    res.status(201).json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to log session' });
  }
});

// User Profile Sync
app.post('/api/user/sync', async (req, res) => {
  const { name, avatar } = req.body;
  try {
    const userId = await verifyAuthToken(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const profile = await syncUserProfile({ id: userId, name, avatar });
    res.json({
      ok: true,
      isVerified: profile.isVerified,
      isAdmin: profile.isAdmin,
      registrationStatus: profile.registrationStatus,
      dpdxAccessKey: profile.dpdxAccessKey
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to sync profile' });
  }
});

app.post('/api/user/music-key', async (req, res) => {
  try {
    const userId = await verifyAuthToken(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { key } = req.body;
    await updateMusicKey(userId, key);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update music key' });
  }
});


app.get('/api/stats/dashboard', async (req, res) => {
  try {
    const userId = await verifyAuthToken(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const stats = await getDashboardStats(userId);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load dashboard stats' });
  }
});

app.get('/api/stats/profile', async (req, res) => {
  try {
    const userId = await verifyAuthToken(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const stats = await getProfileStats(userId);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load profile stats' });
  }
});

app.post('/api/user/verify-referral', async (req, res) => {
  const { code } = req.body;
  try {
    const userId = await verifyAuthToken(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await verifyReferralCode(userId, code);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify referral code' });
  }
});

// Chat Endpoints
app.get('/api/chat/channels', async (req, res) => {
  try {
    const userId = await verifyAuthToken(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const channels = await getChannels();
    res.json(channels);
  } catch {
    res.status(500).json({ error: 'Failed to load channels' });
  }
});

app.get('/api/chat/channels/:id/messages', async (req, res) => {
  try {
    const userId = await verifyAuthToken(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const messages = await getMessages(req.params.id);
    res.json(messages);
  } catch {
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

app.post('/api/chat/channels/:id/messages', async (req, res) => {
  const { text } = req.body;
  try {
    const userId = await verifyAuthToken(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const message = await createMessage({ channelId: req.params.id, userId, text });
    res.status(201).json(message);
  } catch {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Doubts Endpoints
app.get('/api/doubts', async (req, res) => {
  try {
    const userId = await verifyAuthToken(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const doubts = await getDoubts();
    res.json(doubts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load doubts' });
  }
});

app.post('/api/doubts', async (req, res) => {
  const { title, text, topic, grade, imageUrl } = req.body;
  try {
    const userId = await verifyAuthToken(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const doubt = await createDoubt({ userId, title, text, topic, grade, imageUrl });
    res.status(201).json(doubt);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create doubt' });
  }
});

app.get('/api/doubts/:id/answers', async (req, res) => {
  try {
    const userId = await verifyAuthToken(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const answers = await getDoubtAnswers(req.params.id);
    res.json(answers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load answers' });
  }
});

app.post('/api/doubts/:id/answers', async (req, res) => {
  const { text } = req.body;
  try {
    const userId = await verifyAuthToken(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const answer = await createDoubtAnswer({ doubtId: req.params.id, userId, text });
    res.status(201).json(answer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to post answer' });
  }
});

// Community Suggestions
app.get('/api/community/suggestions', async (req, res) => {
  try {
    const userId = await verifyAuthToken(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const suggestions = await getSuggestions();
    res.json(suggestions);
  } catch {
    res.status(500).json({ error: 'Failed to load suggestions' });
  }
});

app.post('/api/community/suggestions', async (req, res) => {
  const { text } = req.body;
  try {
    const userId = await verifyAuthToken(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const suggestion = await createSuggestion(userId, text);
    res.status(201).json(suggestion);
  } catch {
    res.status(500).json({ error: 'Failed to create suggestion' });
  }
});

app.post('/api/community/suggestions/:id/upvote', async (req, res) => {
  try {
    const userId = await verifyAuthToken(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    await upvoteSuggestion(req.params.id);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to upvote' });
  }
});

// Social Endpoints
app.get('/api/social/groups', async (req, res) => {
  try {
    const userId = await verifyAuthToken(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const groups = await getGroups();
    res.json(groups);
  } catch {
    res.status(500).json({ error: 'Failed to load groups' });
  }
});

app.post('/api/social/groups/:id/join', async (req, res) => {
  try {
    const userId = await verifyAuthToken(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const group = await joinGroup(req.params.id, userId);
    res.json(group);
  } catch {
    res.status(500).json({ error: 'Failed to join group' });
  }
});

app.post('/api/social/groups/:id/leave', async (req, res) => {
  try {
    const userId = await verifyAuthToken(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const group = await leaveGroup(req.params.id, userId);
    res.json(group);
  } catch {
    res.status(500).json({ error: 'Failed to leave group' });
  }
});

// Admin Endpoints
app.get('/api/admin/stats', isAdmin, async (req, res) => {
  try {
    const stats = await getAdminStats();
    res.json(stats);
  } catch {
    res.status(500).json({ error: 'Failed to load admin stats' });
  }
});

app.get('/api/admin/users', isAdmin, async (req, res) => {
  try {
    const users = await getAdminUsers();
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Failed to load admin users' });
  }
});

app.delete('/api/admin/chat/:id', isAdmin, async (req, res) => {
  try {
    await deleteMessage(req.params.id);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

app.delete('/api/admin/group/:id', isAdmin, async (req, res) => {
  try {
    await disbandGroup(req.params.id);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to disband group' });
  }
});

app.post('/api/admin/verify-solver/:userId', isAdmin, async (req, res) => {
  try {
    await verifySolver(req.params.userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify solver' });
  }
});

app.post('/api/admin/users/:id/status', isAdmin, async (req, res) => {
  const { status } = req.body;
  try {
    const user = await updateUserStatus(req.params.id, status);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Books APIs
app.get('/api/books/folders', async (req, res) => {
  const parentId = req.query.parentId === 'null' ? null : (req.query.parentId ? Number(req.query.parentId) : null);
  try {
    const folders = await getBookFolders(parentId);
    res.json(folders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load folders' });
  }
});

app.post('/api/admin/books/folders', isAdmin, async (req, res) => {
  const { name, parentId } = req.body;
  try {
    const folder = await createBookFolder(name, parentId);
    res.status(201).json(folder);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

app.delete('/api/admin/books/folders/:id', isAdmin, async (req, res) => {
  try {
    await deleteBookFolder(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});

app.put('/api/admin/books/folders/:id', isAdmin, async (req, res) => {
  const { name } = req.body;
  try {
    const folder = await updateBookFolder(req.params.id, name);
    res.json(folder);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update folder' });
  }
});

app.get('/api/books', async (req, res) => {
  const folderId = Number(req.query.folderId);
  if (isNaN(folderId)) return res.status(400).json({ error: 'Folder ID required' });
  try {
    const books = await getBooks(folderId);
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load books' });
  }
});

app.post('/api/admin/books', isAdmin, async (req, res) => {
  const { folderId, title, author, pdfUrl, pdfUrlAlt, grade, exam, subject, mirrors, primarySource } = req.body;
  try {
    const book = await createBook({ folderId, title, author, pdfUrl, pdfUrlAlt, grade, exam, subject, mirrors, primarySource });
    res.status(201).json(book);
  } catch (err) {
    console.error('[ADMIN] Failed to add book:', err.message || err);
    res.status(500).json({ error: 'Failed to add book' });
  }
});

app.put('/api/admin/books/:id', isAdmin, async (req, res) => {
  try {
    const book = await updateBook(req.params.id, req.body);
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update book' });
  }
});

app.delete('/api/admin/books/:id', isAdmin, async (req, res) => {
  try {
    await deleteBook(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

// Book Requests
app.get('/api/admin/books/requests', isAdmin, async (req, res) => {
  try {
    const requests = await getBookRequests();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load requests' });
  }
});

app.post('/api/admin/books/requests/:id/status', isAdmin, async (req, res) => {
  const { status } = req.body;
  try {
    const request = await updateBookRequestStatus(req.params.id, status);
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update request' });
  }
});

app.post('/api/books/requests', authenticate, async (req, res) => {
  const { title, author, description } = req.body;
  try {
    const request = await createBookRequest(req.user.uid, title, author, description);
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit request' });
  }
});

// Book Notes
app.get('/api/books/:id/note', authenticate, async (req, res) => {
  try {
    const note = await getBookNote(req.user.uid, req.params.id);
    res.json(note || { content: '' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load note' });
  }
});

app.post('/api/books/:id/note', authenticate, async (req, res) => {
  const { content } = req.body;
  try {
    const note = await upsertBookNote(req.user.uid, req.params.id, content);
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save note' });
  }
});

// Admin Reupload
app.post('/api/admin/books/:id/reupload', isAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
  const filePath = req.file.path;
  const cleanup = () => { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); };

  const uploadToCatbox = async () => {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', fs.createReadStream(filePath), { filename: req.file.originalname });
    const resp = await axios.post('https://catbox.moe/user/api.php', form, { headers: { ...form.getHeaders() }, timeout: 60000 });
    const link = typeof resp.data === 'string' ? resp.data.trim() : null;
    if (!link || link.includes('Error') || link.length < 10) throw new Error('Catbox failed');
    return link;
  };

  try {
    const link = await uploadToCatbox();
    const book = await updateBook(req.params.id, { pdf_url: link });
    cleanup();
    res.json(book);
  } catch (err) {
    console.error('[ADMIN REUPLOAD] Failed:', err.message, err.response?.data || '');
    cleanup();
    res.status(500).json({ error: 'Reupload failed' });
  }
});

// Settings & Appeals
app.get('/api/settings', async (req, res) => {
  try { res.json(await getGlobalSettings()); }
  catch (err) { res.status(500).json({ error: 'Failed to load settings' }); }
});

app.post('/api/admin/settings', isAdmin, async (req, res) => {
  const { key, value } = req.body;
  try { res.json(await updateGlobalSetting(key, value)); }
  catch (err) { res.status(500).json({ error: 'Failed to update setting' }); }
});

app.get('/api/admin/appeals', isAdmin, async (req, res) => {
  try { res.json(await getBanAppeals()); }
  catch (err) { res.status(500).json({ error: 'Failed to load appeals' }); }
});

app.post('/api/admin/appeals/:id/status', isAdmin, async (req, res) => {
  const { status, adminNote } = req.body;
  try { res.json(await updateBanAppealStatus(req.params.id, status, adminNote)); }
  catch (err) { res.status(500).json({ error: 'Failed to update appeal' }); }
});

app.post('/api/appeals', authenticate, async (req, res) => {
  const { reason } = req.body;
  try { res.status(201).json(await createBanAppeal(req.user.uid, reason)); }
  catch (err) { res.status(500).json({ error: 'Failed to submit appeal' }); }
});

// AI Chat History Endpoints
app.get('/api/ai/history', authenticate, async (req, res) => {
  try {
    const history = await getAiChatHistory(req.user.uid);
    res.json(history);
  } catch (err) {
    console.error('[AI History Error]:', err);
    res.status(500).json({ error: 'Failed to load chat history' });
  }
});

app.delete('/api/ai/history', authenticate, async (req, res) => {
  try {
    await clearAiChatHistory(req.user.uid);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

// AI Chat Endpoint
app.post('/api/ai/chat', authenticate, async (req, res) => {
  const { message, contextHistory } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required." });

  // Make sure the API key is provided
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "AI Tutor API key is missing or not configured." });
  }

  try {
    const fetchFunc = global.fetch || (await import('node-fetch')).default;

    const systemInstruction = {
      role: "user",
      parts: [{ text: "You are an AI Tutor meant only to help with studies. Keep responses brief, constructive, and do not answer non-study questions." }]
    };

    const formattedHistory = (contextHistory || []).map(msg => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    const payload = {
      contents: [
        systemInstruction,
        ...formattedHistory,
        { role: 'user', parts: [{ text: message }] }
      ]
    };

    const response = await fetchFunc(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[AI Chat Error] Gemini API returned:", response.status, errorText);
      return res.status(response.status).json({ error: "AI Tutor failed to respond." });
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!replyText) {
      return res.status(500).json({ error: "AI Tutor returned an empty response." });
    }

    // Persist both messages to the database (fire and forget, don't block response)
    const userId = req.user.uid;
    saveAiChatMessage(userId, 'user', message).catch(err => console.error('[AI Chat Save Error]:', err));
    saveAiChatMessage(userId, 'ai', replyText).catch(err => console.error('[AI Chat Save Error]:', err));

    res.json({ reply: replyText });
  } catch (err) {
    console.error("[AI Chat Exception]:", err);
    res.status(500).json({ error: "Internal server error connecting to AI Tutor." });
  }
});



// Upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const filePath = req.file.path;
  const cleanup = () => {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  };

  const uploadToKappa = async () => {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), { filename: req.file.originalname });
    const resp = await axios.post('https://kappa.lol/api/upload', form, {
      headers: { ...form.getHeaders() },
      timeout: 60000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    if (resp.status === 200 && resp.data?.link) {
      return resp.data.link;
    }
    throw new Error('Kappa.lol failed');
  };

  const uploadToFileditch = async () => {
    const form = new FormData();
    form.append('files[]', fs.createReadStream(filePath), { filename: req.file.originalname });
    const resp = await axios.post('https://cors.ayushr.co.in/?url=https://up1.fileditch.com/upload.php', form, {
      headers: { ...form.getHeaders() },
      timeout: 60000
    });
    if (resp.data?.success && resp.data?.files?.[0]?.url) {
      return resp.data.files[0].url;
    }
    throw new Error('Fileditch failed');
  };

  const uploadToCatbox = async () => {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', fs.createReadStream(filePath), { filename: req.file.originalname });
    const resp = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: { ...form.getHeaders() },
      timeout: 60000
    });
    const link = typeof resp.data === 'string' ? resp.data.trim() : null;
    if (!link || link.includes('Error') || link.length < 10) {
      throw new Error('Catbox failed');
    }
    return link;
  };

  try {
    console.log(`[UPLOAD] Initiating priority upload for: ${req.file.originalname}`);
    let link;
    try {
      link = await uploadToCatbox();
      console.log(`[UPLOAD] Catbox primary success: ${link}`);
    } catch (e) {
      console.warn(`[UPLOAD] Catbox failed:`, e.message, e.response?.status, e.response?.data || '');
      try {
        link = await uploadToKappa();
        console.log(`[UPLOAD] Kappa fallback success: ${link}`);
      } catch (e2) {
        console.warn(`[UPLOAD] Kappa failed, trying Fileditch...`);
        link = await uploadToFileditch();
        console.log(`[UPLOAD] Fileditch final fallback success: ${link}`);
      }
    }
    cleanup();
    res.json({ link });
  } catch (error) {
    console.error('[UPLOAD] All upload methods failed:', error);
    cleanup();
    res.status(500).send('Upload failed');
  }
});

app.use(express.static(distPath, { index: false }));

app.get('*', (req, res) => {
  const htmlPath = path.join(distPath, 'index.html');
  fs.readFile(htmlPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading index.html', err);
      return res.status(500).send('Error loading application.');
    }
    const firebaseConfig = {
      apiKey: process.env.VITE_FIREBASE_API_KEY,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID
    };
    const injectedHtml = data.replace(
      '<head>',
      `<head><script>window.FIREBASE_CONFIG = ${JSON.stringify(firebaseConfig)};</script>`
    );
    res.send(injectedHtml);
  });
});

// Socket.io Presence & Chat
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('[SOCKET] User connected:', socket.id);

  socket.on('join', (user) => {
    if (user && user.uid) {
      onlineUsers.set(socket.id, user);
      io.emit('presence_update', Array.from(onlineUsers.values()));
      console.log(`[SOCKET] ${user.name} joined`);
    }
  });

  socket.on('send_message', (msg) => {
    // msg should have channelId, text, author
    io.to(msg.channelId).emit('new_message', msg);
  });

  socket.on('disconnect', () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      console.log(`[SOCKET] ${user.name} left`);
      onlineUsers.delete(socket.id);
      io.emit('presence_update', Array.from(onlineUsers.values()));
    }
  });
});

const port = process.env.PORT || 3000;
httpServer.listen(port, () => {
  console.log(`FocusForge app + API running on port ${port} `);
});
