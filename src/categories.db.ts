import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import xss from 'xss';

// Zod schema for a category
const CategorySchema = z.object({
  id: z.number(),
  title: z
    .string()
    .min(3, 'title must be at least three letters')
    .max(1024, 'title must be at most 1024 letters'),
  slug: z.string(),
});

// Zod schema for creating a category
const CategoryToCreateSchema = z.object({
  title: z
    .string()
    .min(3, 'title must be at least three letters')
    .max(1024, 'title must be at most 1024 letters'),
});

// Type definitions
type Category = z.infer<typeof CategorySchema>;
type CategoryToCreate = z.infer<typeof CategoryToCreateSchema>;


const prisma = new PrismaClient();


/**
 * Fetches all categories with pagination.
 * @param {number} [limit=10] - The number of categories to return per page.
 * @param {number} [page=1] - The page number to fetch.
 * @returns {Promise<{ categories: Array<Category>, total: number, page: number, limit: number }>} - An object containing the categories, total count, current page, and limit.
 * @throws {Error} - Throws an error if there's a database issue.
 */
export async function getCategories(
  limit: number = 10,
  page: number = 1
): Promise<{ categories: Array<Category>; total: number; page: number; limit: number }> {
  try {
    const offset = (page - 1) * limit;

    const categories = await prisma.categories.findMany({
      skip: offset,
      take: limit,
    });

    const sanitizedCategories = categories.map((category) => ({
      ...category,
      title: xss(category.title),
      slug: xss(category.slug),
    }));

    const total = await prisma.categories.count();

    return {
      categories: sanitizedCategories,
      total,
      page,
      limit,
    };
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw new Error('Internal Server Error');
  }
}

/**
 * Fetches a single category by its slug.
 * @param {string} slug - The slug of the category to fetch.
 * @returns {Promise<Category | null>} - The category object or null if not found.
 * @throws {Error} - Throws an error if there's a database issue.
 */
export async function getCategory(slug: string): Promise<Category | null> {
  try {
    const category = await prisma.categories.findUnique({
      where: { slug },
    });

    if (!category) {
      return null;
    }

    const sanitizedCategory = {
      ...category,
      title: xss(category.title),
      slug: xss(category.slug),
    };

    return sanitizedCategory;
  } catch (error) {
    console.error('Error fetching category:', error);
    throw new Error('Internal Server Error');
  }
}

// Validate category data
export function validateCategory(categoryToValidate: unknown) {
  const result = CategoryToCreateSchema.safeParse(categoryToValidate);
  return result;
}

/**
 * Creates a new category.
 * @param {CategoryToCreate} categoryToCreate - The category data to create.
 * @returns {Promise<Category>} - The created category object.
 * @throws {Error} - Throws an error if there's a database issue or validation fails.
 */
export async function createCategory(categoryToCreate: CategoryToCreate): Promise<Category> {
  try {
    const sanitizedTitle = xss(categoryToCreate.title);

    const createdCategory = await prisma.categories.create({
      data: {
        title: sanitizedTitle,
        slug: sanitizedTitle.toLowerCase().replace(' ', '-'),
      },
    });
    return createdCategory;
  } catch (error) {
    console.error('Error creating category:', error);
    throw new Error('Internal Server Error');
  }
}

/**
 * Updates an existing category by its slug.
 * @param {string} slug - The slug of the category to update.
 * @param {Object} data - The data to update (e.g., { title: string }).
 * @returns {Promise<Category | null>} - The updated category object or null if not found.
 * @throws {Error} - Throws an error if there's a database issue or validation fails.
 */
export async function updateCategory(slug: string, data: { title: string }): Promise<Category | null> {
  try {
    const sanitizedTitle = xss(data.title);

    const updatedCategory = await prisma.categories.update({
      where: { slug },
      data: {
        title: sanitizedTitle,
        slug: sanitizedTitle.toLowerCase().replace(' ', '-'),
      },
    });
    return updatedCategory;
  } catch (error) {
    console.error('Error updating category:', error);
    throw new Error('Internal Server Error');
  }
}

/**
 * Deletes a category by its slug.
 * @param {string} slug - The slug of the category to delete.
 * @returns {Promise<Category | null>} - The deleted category object or null if not found.
 * @throws {Error} - Throws an error if there's a database issue.
 */
export async function deleteCategory(slug: string): Promise<Category | null> {
  try {
    const category = await prisma.categories.findUnique({
      where: { slug },
    });

    if (!category) {
      return null;
    }

    await prisma.question.deleteMany({
      where: { categoryId: category.id },
    });

    const deletedCategory = await prisma.categories.delete({
      where: { slug },
    });

    return deletedCategory;
  } catch (error) {
    console.error('Error deleting category:', error);
    throw new Error('Internal Server Error');
  }
}