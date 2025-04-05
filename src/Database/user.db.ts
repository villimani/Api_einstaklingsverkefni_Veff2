import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import xss from 'xss';
import bcrypt from 'bcryptjs';


const prisma = new PrismaClient();

// Password requirements
const passwordRequirements = {
  minLength: 8,
  maxLength: 256,
  needsNumber: true,
  needsUppercase: true,
  needsSpecialChar: true,
};

// Zod schema for a user
const UserSchema = z.object({
  id: z.number(),
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(passwordRequirements.minLength),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Zod schema for creating a user
const UserToCreateSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .refine(val => /^[a-zA-Z0-9_]+$/.test(val), 'Username can only contain letters, numbers and underscores'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(passwordRequirements.minLength, `Password must be at least ${passwordRequirements.minLength} characters`)
    .max(passwordRequirements.maxLength, `Password must be at most ${passwordRequirements.maxLength} characters`)
    .refine(val => passwordRequirements.needsNumber ? /\d/.test(val) : true, 'Password must contain at least one number')
    .refine(val => passwordRequirements.needsUppercase ? /[A-Z]/.test(val) : true, 'Password must contain at least one uppercase letter')
    .refine(val => passwordRequirements.needsSpecialChar ? /[^a-zA-Z0-9]/.test(val) : true, 'Password must contain at least one special character'),
});

// Zod schema for updating a user
const UserToUpdateSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .refine(val => /^[a-zA-Z0-9_]+$/.test(val), 'Username can only contain letters, numbers and underscores')
    .optional(),
  email: z.string().email('Invalid email address').optional(),
  password: z.string()
    .min(passwordRequirements.minLength, `Password must be at least ${passwordRequirements.minLength} characters`)
    .max(passwordRequirements.maxLength, `Password must be at most ${passwordRequirements.maxLength} characters`)
    .refine(val => passwordRequirements.needsNumber ? /\d/.test(val) : true, 'Password must contain at least one number')
    .refine(val => passwordRequirements.needsUppercase ? /[A-Z]/.test(val) : true, 'Password must contain at least one uppercase letter')
    .refine(val => passwordRequirements.needsSpecialChar ? /[^a-zA-Z0-9]/.test(val) : true, 'Password must contain at least one special character')
    .optional(),
});

// Type definitions
type User = z.infer<typeof UserSchema>;
type UserToCreate = z.infer<typeof UserToCreateSchema>;
type UserToUpdate = z.infer<typeof UserToUpdateSchema>;

// Password hashing salt rounds
const SALT_ROUNDS = 12;

/**
 * Hashes a password using bcrypt
 * @param {string} password - The password to hash
 * @returns {Promise<string>} - The hashed password
 */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compares a password with a hash
 * @param {string} password - The password to compare
 * @param {string} hash - The hash to compare against
 * @returns {Promise<boolean>} - True if the password matches the hash
 */
async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Fetches all users with pagination
 * @param {number} [limit=10] - Number of users per page
 * @param {number} [page=1] - Page number
 * @returns {Promise<{ users: Array<Omit<User, 'password'>>, total: number, page: number, limit: number }>}
 */
export async function getUsers(
  limit: number = 10,
  page: number = 1
): Promise<{ users: Array<Omit<User, 'password'>>; total: number; page: number; limit: number }> {
  try {
    const offset = (page - 1) * limit;

    const users = await prisma.user.findMany({
      skip: offset,
      take: limit,
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const sanitizedUsers = users.map((user) => ({
      ...user,
      username: xss(user.username),
      email: xss(user.email),
    }));

    const total = await prisma.user.count();

    return {
      users: sanitizedUsers,
      total,
      page,
      limit,
    };
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new Error('Internal Server Error');
  }
}

/**
 * Fetches a single user by ID (without password)
 * @param {number} id - The user ID
 * @returns {Promise<Omit<User, 'password'> | null>}
 */
export async function getUserById(id: number): Promise<Omit<User, 'password'> | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return null;
    }

    const sanitizedUser = {
      ...user,
      username: xss(user.username),
      email: xss(user.email),
    };

    return sanitizedUser;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw new Error('Internal Server Error');
  }
}

/**
 * Fetches a user by email (with password, for authentication)
 * @param {string} email - The user email
 * @returns {Promise<User | null>}
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    const sanitizedUser = {
      ...user,
      username: xss(user.username),
      email: xss(user.email),
    };

    return sanitizedUser;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    throw new Error('Internal Server Error');
  }
}

/**
 * Validates user creation data
 * @param {unknown} data - Data to validate
 * @returns {z.SafeParseReturnType<UserToCreate>}
 */
export function validateUserCreation(data: unknown) {
  return UserToCreateSchema.safeParse(data);
}

/**
 * Validates user update data
 * @param {unknown} data - Data to validate
 * @returns {z.SafeParseReturnType<UserToUpdate>}
 */
export function validateUserUpdate(data: unknown) {
  return UserToUpdateSchema.safeParse(data);
}

/**
 * Creates a new user
 * @param {UserToCreate} userData - User data to create
 * @returns {Promise<Omit<User, 'password'>>}
 */
export async function createUser(userData: UserToCreate): Promise<Omit<User, 'password'>> {
  try {
    const hashedPassword = await hashPassword(userData.password);
    
    const sanitizedData = {
      username: xss(userData.username),
      email: xss(userData.email),
      password: hashedPassword,
    };

    const createdUser = await prisma.user.create({
      data: sanitizedData,
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return createdUser;
  } catch (error) {
    console.error('Error creating user:', error);
    throw new Error('Internal Server Error');
  }
}

/**
 * Updates an existing user
 * @param {number} id - The user ID
 * @param {UserToUpdate} updateData - Data to update
 * @returns {Promise<Omit<User, 'password'> | null>}
 */
export async function updateUser(
  id: number,
  updateData: UserToUpdate
): Promise<Omit<User, 'password'> | null> {
  try {
    const updatePayload: {
      username?: string;
      email?: string;
      password?: string;
    } = {};

    if (updateData.username) updatePayload.username = xss(updateData.username);
    if (updateData.email) updatePayload.email = xss(updateData.email);
    if (updateData.password) {
      updatePayload.password = await hashPassword(updateData.password);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updatePayload,
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  } catch (error) {
    console.error('Error updating user:', error);
    throw new Error('Internal Server Error');
  }
}

/**
 * Deletes a user
 * @param {number} id - The user ID
 * @returns {Promise<Omit<User, 'password'> | null>}
 */
export async function deleteUser(id: number): Promise<Omit<User, 'password'> | null> {
  try {
    // First delete all user's notepads and notes
    await prisma.note.deleteMany({
      where: { notepad: { ownerId: id } },
    });

    await prisma.notepad.deleteMany({
      where: { ownerId: id },
    });

    const deletedUser = await prisma.user.delete({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return deletedUser;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new Error('Internal Server Error');
  }
}

/**
 * Verifies user credentials
 * @param {string} email - The user email
 * @param {string} password - The password to verify
 * @returns {Promise<Omit<User, 'password'> | null>} - User without password if valid, null otherwise
 */
export async function verifyCredentials(
  email: string,
  password: string
): Promise<Omit<User, 'password'> | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return null;
    }

    const sanitizedUser = {
      id: user.id,
      username: xss(user.username),
      email: xss(user.email),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return sanitizedUser;
  } catch (error) {
    console.error('Error verifying credentials:', error);
    throw new Error('Internal Server Error');
  }
}

/**
 * Checks if a username is available
 * @param {string} username - The username to check
 * @returns {Promise<boolean>} - True if available
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    return !user;
  } catch (error) {
    console.error('Error checking username availability:', error);
    throw new Error('Internal Server Error');
  }
}

/**
 * Checks if an email is available
 * @param {string} email - The email to check
 * @returns {Promise<boolean>} - True if available
 */
export async function isEmailAvailable(email: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return !user;
  } catch (error) {
    console.error('Error checking email availability:', error);
    throw new Error('Internal Server Error');
  }
}