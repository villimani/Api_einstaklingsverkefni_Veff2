import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { signToken, verifyToken } from './auth/jwt.js';
import { getNotepads, getNotepad, getPublicNotepads } from './Database/notepad.db.js';
import { createNote, getNotesByNotepad, getNoteById, validateNoteCreation, validateNoteUpdate, updateNote, deleteNote } from './Database/notes.db.js';
import { createUser, validateUserCreation, verifyCredentials, isUsernameAvailable, isEmailAvailable } from './Database/user.db.js';
const app = new Hono();
const SECRET = 'my-secret-key';
app.use('*', cors());
const authMiddleware = async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    const token = authHeader.split(' ')[1];
    try {
        const payload = verifyToken(token, SECRET);
        c.set('userId', payload.userId); // Set the user ID for later use
        await next(); // Proceed to the next middleware or handler
    }
    catch (e) {
        return c.json({ error: 'Invalid or expired token' }, 401);
    }
};
// ==================================================
// Homepage
// ==================================================
app.get('/', (c) => {
    return c.json({
        message: 'Welcome to the Notepad API',
        endpoints: {
            notepads: '/notepads',
            users: '/users',
            auth: '/auth/login'
        },
    });
});
// ==================================================
// Notepad Endpoints (Updated)
// ==================================================
app.get('/user/notepads', authMiddleware, async (c) => {
    try {
        const userId = Number(c.get('userId'));
        const limit = parseInt(c.req.query('limit') || '10', 10);
        const page = parseInt(c.req.query('page') || '1', 10);
        const { notepads, total } = await getNotepads(limit, page, userId);
        const totalPages = Math.ceil(total / limit);
        return c.json({
            data: notepads,
            pagination: { page, limit, total, totalPages },
        });
    }
    catch (error) {
        console.error('Error fetching user notepads:', error);
        return c.json({ error: 'Internal Server Error' }, 500);
    }
});
app.get('/public/notepads', async (c) => {
    try {
        const limit = parseInt(c.req.query('limit') || '10', 10);
        const page = parseInt(c.req.query('page') || '1', 10);
        const { notepads, total } = await getPublicNotepads(limit, page);
        const totalPages = Math.ceil(total / limit);
        return c.json({
            data: notepads,
            pagination: { page, limit, total, totalPages },
        });
    }
    catch (error) {
        console.error('Error fetching public notepads:', error);
        return c.json({ error: 'Internal Server Error' }, 500);
    }
});
app.get('/notepads/:id', authMiddleware, async (c) => {
    const id = parseInt(c.req.param('id'));
    try {
        const userId = Number(c.get('userId'));
        const notepad = await getNotepad(id);
        if (!notepad)
            return c.json({ message: 'Notepad not found' }, 404);
        if (!notepad.isPublic && notepad.ownerId !== userId) {
            return c.json({ message: 'Unauthorized - Notepad is private' }, 403);
        }
        const { notes } = await getNotesByNotepad(notepad.id, 1000, 1);
        return c.json({ ...notepad, notes });
    }
    catch (error) {
        console.error('Error fetching notepad with notes:', error);
        return c.json({ error: 'Internal Server Error' }, 500);
    }
});
// ==================================================
// Note Endpoints
// ==================================================
app.get('/notepads/:notepadId/notes', authMiddleware, async (c) => {
    const notepadId = parseInt(c.req.param('notepadId'));
    const limit = parseInt(c.req.query('limit') || '10', 10);
    const page = parseInt(c.req.query('page') || '1', 10);
    try {
        const { notes, total } = await getNotesByNotepad(notepadId, limit, page);
        const totalPages = Math.ceil(total / limit);
        return c.json({ data: notes, pagination: { page, limit, total, totalPages } });
    }
    catch (error) {
        console.error('Error fetching notes:', error);
        return c.json({ error: 'Internal Server Error' }, 500);
    }
});
app.get('/notes/:id', authMiddleware, async (c) => {
    const id = parseInt(c.req.param('id'));
    try {
        const note = await getNoteById(id);
        if (!note)
            return c.json({ message: 'Note not found' }, 404);
        return c.json(note);
    }
    catch (error) {
        console.error('Error fetching note:', error);
        return c.json({ error: 'Internal Server Error' }, 500);
    }
});
app.post('/notepads/:notepadId/notes', authMiddleware, async (c) => {
    const notepadId = parseInt(c.req.param('notepadId'));
    let noteData;
    try {
        noteData = await c.req.json();
    }
    catch {
        return c.json({ error: 'Invalid JSON' }, 400);
    }
    const validNote = validateNoteCreation(noteData);
    if (!validNote.success) {
        return c.json({ error: 'Invalid data', errors: validNote.error.flatten() }, 400);
    }
    try {
        const createdNote = await createNote({ ...validNote.data, notepadId });
        return c.json(createdNote, 201);
    }
    catch (error) {
        console.error('Error creating note:', error);
        return c.json({ error: 'Internal Server Error' }, 500);
    }
});
app.patch('/notes/:id', authMiddleware, async (c) => {
    const id = parseInt(c.req.param('id'));
    let updateData;
    try {
        updateData = await c.req.json();
    }
    catch {
        return c.json({ error: 'Invalid JSON' }, 400);
    }
    const validNote = validateNoteUpdate(updateData);
    if (!validNote.success) {
        return c.json({ error: 'Invalid data', errors: validNote.error.flatten() }, 400);
    }
    try {
        const updatedNote = await updateNote(id, validNote.data);
        if (!updatedNote)
            return c.json({ message: 'Note not found' }, 404);
        return c.json(updatedNote);
    }
    catch (error) {
        console.error('Error updating note:', error);
        return c.json({ error: 'Internal Server Error' }, 500);
    }
});
app.delete('/notes/:id', authMiddleware, async (c) => {
    const id = parseInt(c.req.param('id'));
    try {
        const deletedNote = await deleteNote(id);
        if (!deletedNote)
            return c.json({ message: 'Note not found' }, 404);
        return c.json({ success: true }, 200);
    }
    catch (error) {
        console.error('Error deleting note:', error);
        return c.json({ success: false, error: 'Internal Server Error' }, 500);
    }
});
// ==================================================
// User Endpoints
// ==================================================
app.post('/users', async (c) => {
    let userData;
    try {
        userData = await c.req.json();
    }
    catch {
        return c.json({ error: 'Invalid JSON' }, 400);
    }
    const validUser = validateUserCreation(userData);
    if (!validUser.success) {
        return c.json({ error: 'Invalid data', errors: validUser.error.flatten() }, 400);
    }
    try {
        if (!(await isUsernameAvailable(validUser.data.username))) {
            return c.json({ error: 'Username already taken' }, 400);
        }
        if (!(await isEmailAvailable(validUser.data.email))) {
            return c.json({ error: 'Email already registered' }, 400);
        }
        const createdUser = await createUser(validUser.data);
        return c.json(createdUser, 201);
    }
    catch (error) {
        console.error('Error creating user:', error);
        return c.json({ error: 'Internal Server Error' }, 500);
    }
});
app.post('/auth/login', async (c) => {
    let credentials;
    try {
        credentials = await c.req.json();
    }
    catch {
        return c.json({ error: 'Invalid JSON' }, 400);
    }
    try {
        const user = await verifyCredentials(credentials.email, credentials.password);
        if (!user)
            return c.json({ error: 'Invalid email or password' }, 401);
        const token = signToken({ userId: user.id }, SECRET, 60 * 60); // 1 hour
        return c.json({
            user: { id: user.id, username: user.username, email: user.email },
            token
        });
    }
    catch (error) {
        console.error('Error during login:', error);
        return c.json({ error: 'Internal Server Error' }, 500);
    }
});
serve({ fetch: app.fetch, port: 10000 }, (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
});
