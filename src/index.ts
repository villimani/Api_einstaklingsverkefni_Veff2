import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { createCategory, getCategories, getCategory, validateCategory, updateCategory, deleteCategory } from './categories.db.js';
import { createQuestion, getQuestions, getQuestionById, getQuestionsByCategory, validateQuestionToCreate, validateQuestionToUpdate, updateQuestion, deleteQuestion } from './questions.db.js';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('*', cors());

// ==================================================
// Category Endpoints
// ==================================================

/**
 * Homepage with navigation links.
 * Returns a JSON response with links to view categories and create a new category.
 */
app.get('/', (c) => {
  return c.json({
    message: 'Welcome to the Quiz App API',
    links: {
      viewCategories: '/categories',
      createCategory: '/categories',
    },
  });
});

/**
 * View all categories with pagination.
 * Returns a JSON response with categories and pagination details.
 */
app.get('/categories', async (c) => {
  try {

    const limit = parseInt(c.req.query('limit') || '10', 10);
    const page = parseInt(c.req.query('page') || '1', 10);

    const { categories, total, page: currentPage, limit: currentLimit } = await getCategories(limit, page);

    const totalPages = Math.ceil(total / limit);

    return c.json({
      data: categories,
      pagination: {
        page: currentPage,
        limit: currentLimit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

/**
 * View a single category by slug.
 * Returns a JSON response with the category details.
 */
app.get('/categories/:slug', async (c) => {
  const slug = c.req.param('slug');

  try {
    const category = await getCategory(slug);

    if (!category) {
      return c.json({ message: 'Category not found' }, 404);
    }

    return c.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

/**
 * Create a new category.
 * Accepts JSON data with a `title` field and creates a new category in the database.
 */
app.post('/categories', async (c) => {
  let categoryToCreate: unknown;

  try {
    categoryToCreate = await c.req.json();
  } catch (e) {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const validCategory = validateCategory(categoryToCreate);

  if (!validCategory.success) {
    return c.json({ error: 'Invalid data', errors: validCategory.error.flatten() }, 400);
  }

  try {
    const createdCategory = await createCategory(validCategory.data);
    return c.json(createdCategory, 201);
  } catch (error) {
    console.error('Error creating category:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

/**
 * Update a category by slug.
 * Accepts JSON data with a `title` field and updates the category with the specified slug.
 */
app.patch('/categories/:slug', async (c) => {
  const slug = c.req.param('slug');
  let updateData: unknown;

  try {
    updateData = await c.req.json();
  } catch (e) {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const validCategory = validateCategory(updateData);

  if (!validCategory.success) {
    return c.json({ error: 'Invalid data', errors: validCategory.error.flatten() }, 400);
  }

  try {
    const updatedCategory = await updateCategory(slug, validCategory.data);

    if (!updatedCategory) {
      return c.json({ message: 'Category not found' }, 404);
    }

    return c.json(updatedCategory);
  } catch (error) {
    console.error('Error updating category:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

/**
 * Delete a category by slug.
 * Deletes the category with the specified slug and all its associated questions.
 */
app.delete('/categories/:slug', async (c) => {
  const slug = c.req.param('slug');

  try {
    const deletedCategory = await deleteCategory(slug);

    if (!deletedCategory) {
      return c.json({ success: false, message: 'Category not found' }, 404);
    }

    return c.json({ success: true }, 200); // Return success: true on successful deletion
  } catch (error) {
    console.error('Error deleting category:', error);
    return c.json({ success: false, error: 'Internal Server Error' }, 500);
  }
});

// ==================================================
// Question Endpoints
// ==================================================

/**
 * View all questions in a category with pagination.
 * Returns a JSON response with questions and pagination details.
 */
app.get('/categories/:slug/questions', async (c) => {
  const slug = c.req.param('slug');
  const limit = parseInt(c.req.query('limit') || '10');
  const page = parseInt(c.req.query('page') || '1');

  try {
    const category = await getCategory(slug);

    if (!category) {
      return c.json({ message: 'Category not found' }, 404);
    }

    const { questions, total, page: currentPage, limit: currentLimit } = await getQuestionsByCategory(category.id, limit, page);

    return c.json({
      data: questions,
      pagination: {
        page: currentPage,
        limit: currentLimit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching questions by category:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

/**
 * Create a new question in a category.
 * Accepts JSON data with `text` and `options` fields and creates a new question in the database.
 */
app.post('/categories/:slug/questions', async (c) => {
  const slug = c.req.param('slug');
  let questionData: unknown;

  try {
    questionData = await c.req.json();
  } catch (e) {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const validQuestion = validateQuestionToCreate(questionData);

  if (!validQuestion.success) {
    return c.json({ error: 'Invalid data', errors: validQuestion.error.flatten() }, 400);
  }

  try {
    const category = await getCategory(slug);

    if (!category) {
      return c.json({ message: 'Category not found' }, 404);
    }

    const questionWithCategory = {
      ...validQuestion.data,
      categoryId: category.id,
    };

    const createdQuestion = await createQuestion(questionWithCategory);
    return c.json(createdQuestion, 201);
  } catch (error) {
    console.error('Error creating question:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

/**
 * Update a question by ID.
 * Accepts JSON data with `text` and `options` fields and updates the question with the specified ID.
 */
app.patch('/questions/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  let updateData: unknown;

  try {
    updateData = await c.req.json();
  } catch (e) {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const validQuestion = validateQuestionToUpdate(updateData);

  if (!validQuestion.success) {
    return c.json({ error: 'Invalid data', errors: validQuestion.error.flatten() }, 400);
  }

  try {
    const updatedQuestion = await updateQuestion(id, validQuestion.data);

    if (!updatedQuestion) {
      return c.json({ message: 'Question not found' }, 404);
    }

    return c.json(updatedQuestion);
  } catch (error) {
    console.error('Error updating question:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

/**
 * Delete a question by ID.
 * Deletes the question with the specified ID.
 */
app.delete('/questions/:id', async (c) => {
  const id = parseInt(c.req.param('id'));

  try {
    await deleteQuestion(id);
    return c.json(null, 204);
  } catch (error) {
    console.error('Error deleting question:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

// Start the server
serve({
  fetch: app.fetch,
  port: 10000,
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`);
});