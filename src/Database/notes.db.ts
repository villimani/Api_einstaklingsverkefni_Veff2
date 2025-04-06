import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import xss from 'xss';

const prisma = new PrismaClient();

// Zod schema for a note
const NoteSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  notepadId: z.number(),
});

// Zod schema for creating a note
const NoteToCreateSchema = z.object({
  title: z.string().min(1, 'Title must be at least 1 character'),
  content: z.string().min(1, 'Content must be at least 1 character'),
  notepadId: z.number(),
});

// Zod schema for updating a note
const NoteToUpdateSchema = z.object({
  title: z.string().min(1, 'Title must be at least 1 character').optional(),
  content: z.string().min(1, 'Content must be at least 1 character').optional(),
});

// Type definitions
type Note = z.infer<typeof NoteSchema>;
type NoteToCreate = z.infer<typeof NoteToCreateSchema>;
type NoteToUpdate = z.infer<typeof NoteToUpdateSchema>;

/**
 * Fetches all notes for a specific notepad with pagination
 * @param {number} notepadId - The ID of the notepad
 * @param {number} [limit=10] - Number of notes per page
 * @param {number} [page=1] - Page number
 * @returns {Promise<{ notes: Array<Note>, total: number, page: number, limit: number }>}
 */
export async function getNotesByNotepad(
  notepadId: number,
  limit: number = 12,
  page: number = 1
): Promise<{ notes: Array<Note>; total: number; page: number; limit: number }> {
  try {
    const offset = (page - 1) * limit;

    const notes = await prisma.note.findMany({
      where: { notepadId },
      skip: offset,
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });

    const sanitizedNotes = notes.map((note) => ({
      ...note,
      title: xss(note.title),
      content: xss(note.content),
    }));

    const total = await prisma.note.count({ where: { notepadId } });

    return {
      notes: sanitizedNotes,
      total,
      page,
      limit,
    };
  } catch (error) {
    console.error('Error fetching notes:', error);
    throw new Error('Internal Server Error');
  }
}

/**
 * Fetches a single note by its ID
 * @param {number} id - The ID of the note
 * @returns {Promise<Note | null>}
 */
export async function getNoteById(id: number): Promise<Note | null> {
  try {
    const note = await prisma.note.findUnique({
      where: { id },
    });

    if (!note) {
      return null;
    }

    const sanitizedNote = {
      ...note,
      title: xss(note.title),
      content: xss(note.content),
    };

    return sanitizedNote;
  } catch (error) {
    console.error('Error fetching note:', error);
    throw new Error('Internal Server Error');
  }
}

/**
 * Validates note creation data
 * @param {unknown} data - Data to validate
 * @returns {z.SafeParseReturnType<NoteToCreate>}
 */
export function validateNoteCreation(data: unknown) {
  return NoteToCreateSchema.safeParse(data);
}

/**
 * Validates note update data
 * @param {unknown} data - Data to validate
 * @returns {z.SafeParseReturnType<NoteToUpdate>}
 */
export function validateNoteUpdate(data: unknown) {
  return NoteToUpdateSchema.safeParse(data);
}

/**
 * Creates a new note
 * @param {NoteToCreate} noteData - Note data to create
 * @returns {Promise<Note>}
 */
export async function createNote(noteData: NoteToCreate): Promise<Note> {
  try {
    const sanitizedData = {
      title: xss(noteData.title),
      content: xss(noteData.content),
      notepadId: noteData.notepadId,
    };

    const createdNote = await prisma.note.create({
      data: sanitizedData,
    });

    return createdNote;
  } catch (error) {
    console.error('Error creating note:', error);
    throw new Error('Internal Server Error');
  }
}

/**
 * Updates an existing note
 * @param {number} id - ID of note to update
 * @param {NoteToUpdate} updateData - Data to update
 * @returns {Promise<Note | null>}
 */
export async function updateNote(
  id: number,
  updateData: NoteToUpdate
): Promise<Note | null> {
  try {
    const sanitizedData: Partial<{
      title: string;
      content: string;
    }> = {};

    if (updateData.title) sanitizedData.title = xss(updateData.title);
    if (updateData.content) sanitizedData.content = xss(updateData.content);

    const updatedNote = await prisma.note.update({
      where: { id },
      data: sanitizedData,
    });

    return updatedNote;
  } catch (error) {
    console.error('Error updating note:', error);
    throw new Error('Internal Server Error');
  }
}

/**
 * Deletes a note
 * @param {number} id - ID of note to delete
 * @returns {Promise<Note | null>}
 */
export async function deleteNote(id: number): Promise<Note | null> {
  try {
    const note = await prisma.note.findUnique({
      where: { id },
    });

    if (!note) {
      return null;
    }

    const deletedNote = await prisma.note.delete({
      where: { id },
    });

    return deletedNote;
  } catch (error) {
    console.error('Error deleting note:', error);
    throw new Error('Internal Server Error');
  }
}

/**
 * Checks if a note belongs to a specific notepad
 * @param {number} noteId - ID of the note
 * @param {number} notepadId - ID of the notepad
 * @returns {Promise<boolean>}
 */
export async function noteBelongsToNotepad(
  noteId: number,
  notepadId: number
): Promise<boolean> {
  try {
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      select: { notepadId: true },
    });

    return note?.notepadId === notepadId;
  } catch (error) {
    console.error('Error checking note ownership:', error);
    throw new Error('Internal Server Error');
  }
}