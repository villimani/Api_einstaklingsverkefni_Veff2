import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Context, Next } from 'hono';
import { signToken, verifyToken } from './auth/jwt.js';

import {
  createNotepad,
  getNotepads,
  getNotepad,
  validateNotepadCreation,
  validateNotepadUpdate,
  updateNotepad,
  deleteNotepad,
  getPublicNotepads,
  userOwnsNotepad
} from './Database/notepad.db.js';

import {
  createNote,
  getNotesByNotepad,
  getNoteById,
  validateNoteCreation,
  validateNoteUpdate,
  updateNote,
  deleteNote,
  noteBelongsToNotepad
} from './Database/notes.db.js';

import {
  createUser,
  getUserById,
  validateUserCreation,
  validateUserUpdate,
  updateUser,
  deleteUser,
  verifyCredentials,
  isUsernameAvailable,
  isEmailAvailable
} from './Database/user.db.js';

type Bindings = {
  userId: string;
};

const app = new Hono<{ Variables: Bindings }>();
const SECRET = 'my-secret-key';


app.use('*', cors());

const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyToken(token, SECRET);
    c.set('userId', payload.userId); // Set the user ID for later use
    await next(); // Proceed to the next middleware or handler
  } catch (e) {
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


// POST route for creating a new notepad
app.post('/notepads', authMiddleware, async (c) => {
  let notepadData;
  
  try {
    notepadData = await c.req.json(); // Parse the incoming JSON body
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400); // Handle invalid JSON
  }

  // Validate the incoming data using Zod
  const validationResult = validateNotepadCreation(notepadData);
  if (!validationResult.success) {
    return c.json({ error: validationResult.error.errors }, 400); // Return validation errors if any
  }

  // Extract valid data
  const { title, description, isPublic, ownerId } = validationResult.data;

  try {
    // Create the notepad and return the result
    const newNotepad = await createNotepad({
      title,
      description,
      isPublic: isPublic || false, // Default to false if not provided
      ownerId,
    });

    return c.json(newNotepad, 201); // Return the created notepad with status code 201
  } catch (error) {
    console.error('Error creating notepad:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// DELETE route for deleting a notepad by ID
app.delete('/notepads/:id', authMiddleware, async (c) => {
  const notepadId = Number(c.req.param('id')); // Get the notepad ID from the URL parameters

  if (isNaN(notepadId)) {
    return c.json({ error: 'Invalid notepad ID' }, 400); // If the ID is invalid, return an error
  }

  const userId = Number(c.get('userId'));// Assuming user ID is attached to the request via authMiddleware

  // Check if the user owns the notepad
  const ownsNotepad = await userOwnsNotepad(notepadId, userId);
  if (!ownsNotepad) {
    return c.json({ error: 'You do not have permission to delete this notepad' }, 403); // Return an error if the user does not own the notepad
  }

  try {
    // Delete the notepad and return the result
    const deletedNotepad = await deleteNotepad(notepadId);

    if (!deletedNotepad) {
      return c.json({ error: 'Notepad not found' }, 404); // If the notepad doesn't exist, return a 404 error
    }

    return c.json({ message: 'Notepad deleted successfully' }, 200); // Return success message
  } catch (error) {
    console.error('Error deleting notepad:', error);
    return c.json({ error: 'Internal Server Error' }, 500); // Handle server errors
  }
});

app.get('/user/notepads', authMiddleware, async (c) => {
  try {
    const userId = Number(c.get('userId'));
    const limit = parseInt(c.req.query('limit') || '12', 10);
    const page = parseInt(c.req.query('page') || '1', 10);

    const { notepads, total } = await getNotepads(limit, page, userId);
    const totalPages = Math.ceil(total / limit);

    return c.json({
      data: notepads,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    console.error('Error fetching user notepads:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.get('/public/notepads', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '12', 10);
    const page = parseInt(c.req.query('page') || '1', 10);

    const { notepads, total } = await getPublicNotepads(limit, page);
    const totalPages = Math.ceil(total / limit);

    return c.json({
      data: notepads,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    console.error('Error fetching public notepads:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.get('/notepads/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  try {
    const notepad = await getNotepad(id);
    if (!notepad) return c.json({ message: 'Notepad not found' }, 404);

    // Skip ownership check for private notepads

    const { notes } = await getNotesByNotepad(notepad.id, 1000, 1);
    return c.json({ ...notepad, notes });
  } catch (error) {
    console.error('Error fetching notepad with notes:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});


// PUT route for updating a notepad by ID
app.put('/notepads/:id', authMiddleware, async (c) => {
  const notepadId = Number(c.req.param('id')); // Get the notepad ID from the URL parameters
  const updateData = await c.req.json(); // Get the updated notepad data from the request body

  if (isNaN(notepadId)) {
    return c.json({ error: 'Invalid notepad ID' }, 400); // If the ID is invalid, return an error
  }

  const userId = Number(c.get('userId')); // Assuming user ID is attached to the request via authMiddleware

  // Check if the user owns the notepad
  const ownsNotepad = await userOwnsNotepad(notepadId, userId);
  if (!ownsNotepad) {
    return c.json({ error: 'You do not have permission to update this notepad' }, 403); // Return an error if the user does not own the notepad
  }

  // Validate the update data using the Zod schema
  const validationResult = validateNotepadUpdate(updateData);
  if (!validationResult.success) {
    return c.json({ error: validationResult.error.errors }, 400); // Return validation errors
  }

  try {
    // Update the notepad and return the result
    const updatedNotepad = await updateNotepad(notepadId, updateData);

    if (!updatedNotepad) {
      return c.json({ error: 'Notepad not found' }, 404); // If the notepad doesn't exist, return a 404 error
    }

    return c.json(updatedNotepad, 200); // Return the updated notepad
  } catch (error) {
    console.error('Error updating notepad:', error);
    return c.json({ error: 'Internal Server Error' }, 500); // Handle server errors
  }
});

// ==================================================
// Note Endpoints
// ==================================================

app.get('/notepads/:notepadId/notes', async (c) => {
  const notepadId = parseInt(c.req.param('notepadId'));
  const limit = parseInt(c.req.query('limit') || '10', 10);
  const page = parseInt(c.req.query('page') || '1', 10);

  try {
    const notepad = await getNotepad(notepadId);
    if (!notepad) return c.json({ message: 'Notepad not found' }, 404);


    const { notes, total } = await getNotesByNotepad(notepadId, limit, page);
    const totalPages = Math.ceil(total / limit);
    return c.json({
      data: notes,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});


app.get('/notes/:id', authMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'));
  try {
    const note = await getNoteById(id);
    if (!note) return c.json({ message: 'Note not found' }, 404);
    return c.json(note);
  } catch (error) {
    console.error('Error fetching note:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.post('/notepads/:notepadId/notes', authMiddleware, async (c) => {
  const notepadId = Number(c.req.param('notepadId')); // Get notepadId from the URL
  let noteData;

  try {
    noteData = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  // Add the notepadId to the data
  const validNote = validateNoteCreation({ ...noteData, notepadId });
  if (!validNote.success) {
    return c.json({ error: 'Invalid data', errors: validNote.error.flatten() }, 400);
  }

  try {
    // Create the note with the validated data
    const createdNote = await createNote(validNote.data);
    return c.json(createdNote, 201);
  } catch (error) {
    console.error('Error creating note:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.get('/notepads/:notepadId/notes', authMiddleware, async (c) => {
  const notepadId = Number(c.req.param('notepadId')); // Extract notepadId from URL params

  // Validate notepadId
  if (isNaN(notepadId)) {
    return c.json({ error: 'Invalid notepad ID' }, 400);
  }

  try {
    // Set default pagination values
    const limit = 12; // Default limit per page
    const page = 1; // Default page number

    // Get notes for the specific notepad with pagination
    const { notes, total, page: pageNumber, limit: pageLimit } = await getNotesByNotepad(notepadId, limit, page);

    // Calculate total pages based on total notes and limit
    const totalPages = Math.ceil(total / pageLimit);

    return c.json({
      data: notes,
      pagination: { page: pageNumber, limit: pageLimit, total, totalPages },
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});



app.patch('/notes/:id', authMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'));
  let updateData;

  try {
    updateData = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const validNote = validateNoteUpdate(updateData);
  if (!validNote.success) {
    return c.json({ error: 'Invalid data', errors: validNote.error.flatten() }, 400);
  }

  try {
    const updatedNote = await updateNote(id, validNote.data);
    if (!updatedNote) return c.json({ message: 'Note not found' }, 404);
    return c.json(updatedNote);
  } catch (error) {
    console.error('Error updating note:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.delete('/notes/:id', authMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'));
  try {
    const deletedNote = await deleteNote(id);
    if (!deletedNote) return c.json({ message: 'Note not found' }, 404);
    return c.json({ success: true }, 200);
  } catch (error) {
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
  } catch {
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
  } catch (error) {
    console.error('Error creating user:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

app.post('/auth/login', async (c) => {
  let credentials;
  try {
    credentials = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  try {
    const user = await verifyCredentials(credentials.email, credentials.password);
    if (!user) return c.json({ error: 'Invalid email or password' }, 401);
    const token = signToken({ userId: user.id }, SECRET, 60 * 60); // 1 hour
    return c.json({
      user: { id: user.id, username: user.username, email: user.email },
      token
    });
  } catch (error) {
    console.error('Error during login:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

serve({ fetch: app.fetch, port: 10000 }, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`);
});
