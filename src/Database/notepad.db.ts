import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import xss from 'xss';

// Zod schema for a notepad
const NotepadSchema = z.object({
  id: z.number(),
  title: z
    .string()
    .min(3, 'title must be at least three letters')
    .max(1024, 'title must be at most 1024 letters'),
  description: z.string().nullable(),
  isPublic: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  ownerId: z.number(),
});

// Zod schema for creating a notepad
const NotepadToCreateSchema = z.object({
  title: z
    .string()
    .min(3, 'title must be at least three letters')
    .max(1024, 'title must be at most 1024 letters'),
  description: z.string().optional(),
  isPublic: z.boolean().optional().default(false),
  ownerId: z.number(),
});

// Zod schema for updating a notepad
const NotepadToUpdateSchema = z.object({
  title: z
    .string()
    .min(3, 'title must be at least three letters')
    .max(1024, 'title must be at most 1024 letters')
    .optional(),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
});

// Type definitions
type Notepad = z.infer<typeof NotepadSchema>;
type NotepadToCreate = z.infer<typeof NotepadToCreateSchema>;
type NotepadToUpdate = z.infer<typeof NotepadToUpdateSchema>;

const prisma = new PrismaClient();

/**
 * Fetches all notepads with pagination.
 * @param {number} [limit=12] - The number of notepads to return per page.
 * @param {number} [page=1] - The page number to fetch.
 * @param {number} [ownerId] - Optional owner ID to filter by
 * @returns {Promise<{ notepads: Array<Notepad>, total: number, page: number, limit: number }>}
 */
export async function getNotepads(
  limit: number = 12,
  page: number = 1,
  ownerId?: number
): Promise<{ notepads: Array<Notepad>; total: number; page: number; limit: number }> {
  try {
    const offset = (page - 1) * limit;
    const whereClause = ownerId ? { ownerId } : {};

    const notepads = await prisma.notepad.findMany({
      where: whereClause,
      skip: offset,
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });

    const sanitizedNotepads = notepads.map((notepad) => ({
      ...notepad,
      title: xss(notepad.title),
      description: notepad.description ? xss(notepad.description) : null,
    }));

    const total = await prisma.notepad.count({ where: whereClause });

    return {
      notepads: sanitizedNotepads,
      total,
      page,
      limit,
    };
  } catch (error) {
    console.error('Error fetching notepads:', error);
    throw new Error('Internal Server Error');
  }
}

/**
 * Fetches public notepads with pagination.
 * @param {number} [limit=12] - The number of notepads to return per page.
 * @param {number} [page=1] - The page number to fetch.
 * @returns {Promise<{ notepads: Array<Notepad>, total: number, page: number, limit: number }>}
 */
export async function getPublicNotepads(
  limit: number = 12,
  page: number = 1
): Promise<{ notepads: Array<Notepad>; total: number; page: number; limit: number }> {
  try {
    const offset = (page - 1) * limit;

    const notepads = await prisma.notepad.findMany({
      where: { isPublic: true },
      skip: offset,
      take: limit,
      orderBy: { updatedAt: 'desc' },
    });

    const sanitizedNotepads = notepads.map((notepad) => ({
      ...notepad,
      title: xss(notepad.title),
      description: notepad.description ? xss(notepad.description) : null,
    }));

    const total = await prisma.notepad.count({ where: { isPublic: true } });

    return {
      notepads: sanitizedNotepads,
      total,
      page,
      limit,
    };
  } catch (error) {
    console.error('Error fetching public notepads:', error);
    throw new Error('Internal Server Error');
  }
}

/**
 * Fetches a single notepad by its ID.
 * @param {number} id - The ID of the notepad to fetch.
 * @returns {Promise<Notepad | null>} - The notepad object or null if not found.
 */
export async function getNotepad(id: number): Promise<Notepad | null> {
  try {
    const notepad = await prisma.notepad.findUnique({
      where: { id },
    });

    if (!notepad) {
      return null;
    }

    const sanitizedNotepad = {
      ...notepad,
      title: xss(notepad.title),
      description: notepad.description ? xss(notepad.description) : null,
    };

    return sanitizedNotepad;
  } catch (error) {
    console.error('Error fetching notepad:', error);
    throw new Error('Internal Server Error');
  }
}

/**
 * Validates notepad creation data.
 * @param {unknown} data - The data to validate.
 * @returns {z.SafeParseReturnType<NotepadToCreate>} - The validation result.
 */
export function validateNotepadCreation(data: unknown) {
  return NotepadToCreateSchema.safeParse(data);
}

/**
 * Validates notepad update data.
 * @param {unknown} data - The data to validate.
 * @returns {z.SafeParseReturnType<NotepadToUpdate>} - The validation result.
 */
export function validateNotepadUpdate(data: unknown) {
  return NotepadToUpdateSchema.safeParse(data);
}

/**
 * Creates a new notepad.
 * @param {NotepadToCreate} notepadData - The notepad data to create.
 * @returns {Promise<Notepad>} - The created notepad object.
 */
export async function createNotepad(notepadData: NotepadToCreate): Promise<Notepad> {
  try {
    const sanitizedData = {
      title: xss(notepadData.title),
      description: notepadData.description ? xss(notepadData.description) : null,
      isPublic: notepadData.isPublic,
      ownerId: notepadData.ownerId,
    };

    const createdNotepad = await prisma.notepad.create({
      data: sanitizedData,
    });

    return createdNotepad;
  } catch (error) {
    console.error('Error creating notepad:', error);
    throw new Error('Internal Server Error');
  }
}

/**
 * Updates an existing notepad by its ID.
 * @param {number} id - The ID of the notepad to update.
 * @param {NotepadToUpdate} updateData - The data to update.
 * @returns {Promise<Notepad | null>} - The updated notepad object or null if not found.
 */
export async function updateNotepad(id: number, updateData: NotepadToUpdate): Promise<Notepad | null> {
  try {
    const sanitizedData: Partial<{
      title: string;
      description: string | null;
      isPublic: boolean;
    }> = {};

    if (updateData.title) sanitizedData.title = xss(updateData.title);
    if (updateData.description !== undefined) {
      sanitizedData.description = updateData.description ? xss(updateData.description) : null;
    }
    if (updateData.isPublic !== undefined) {
      sanitizedData.isPublic = updateData.isPublic;
    }

    const updatedNotepad = await prisma.notepad.update({
      where: { id },
      data: sanitizedData,
    });

    return updatedNotepad;
  } catch (error) {
    console.error('Error updating notepad:', error);
    throw new Error('Internal Server Error');
  }
}

/**
 * Deletes a notepad by its ID.
 * @param {number} id - The ID of the notepad to delete.
 * @returns {Promise<Notepad | null>} - The deleted notepad object or null if not found.
 */
export async function deleteNotepad(id: number): Promise<Notepad | null> {
  try {
    const notepad = await prisma.notepad.findUnique({
      where: { id },
    });

    if (!notepad) {
      return null;
    }

    // First delete all notes in the notepad
    await prisma.note.deleteMany({
      where: { notepadId: id },
    });

    // Then delete the notepad itself
    const deletedNotepad = await prisma.notepad.delete({
      where: { id },
    });

    return deletedNotepad;
  } catch (error) {
    console.error('Error deleting notepad:', error);
    throw new Error('Internal Server Error');
  }
}

/**
 * Checks if a user owns a notepad.
 * @param {number} notepadId - The ID of the notepad to check.
 * @param {number} userId - The ID of the user to check ownership against.
 * @returns {Promise<boolean>} - True if the user owns the notepad, false otherwise.
 */
export async function userOwnsNotepad(notepadId: number, userId: number): Promise<boolean> {
  try {
    const notepad = await prisma.notepad.findUnique({
      where: { id: notepadId },
      select: { ownerId: true },
    });

    return notepad?.ownerId === userId;
  } catch (error) {
    console.error('Error checking notepad ownership:', error);
    throw new Error('Internal Server Error');
  }
}