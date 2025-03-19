import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { createCategory, getCategories, getCategory, validateCategory, updateCategory, deleteCategory } from './categories.db.js';
import { createQuestion, getQuestions, getQuestionById, getQuestionsByCategory, validateQuestionToCreate, validateQuestionToUpdate, updateQuestion, deleteQuestion } from './questions.db.js';
import xss from 'xss';

const app = new Hono();

/**
 * Homepage with navigation links.
 * Returns a simple HTML page with links to view categories and create a new category.
 * @param {Object} c - The Hono context object.
 * @returns {Response} - The HTML response.
 */
app.get('/', (c) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Quiz App</title>
    </head>
    <body>
      <h1>Quiz App</h1>
      <p><a href="/categories">View Categories</a></p>
      <p><a href="/create-category">Create New Category</a></p>
    </body>
    </html>
  `;
  return c.html(html);
});



// ==================================================
// Category Endpoints
// ==================================================



/**
 * View all categories with pagination.
 * Returns an HTML page displaying all categories with options to update or delete them.
 * Pagination is supported via `limit` and `page` query parameters.
 * @param {Object} c - The Hono context object.
 * @returns {Promise<Response>} - The HTML response or an error message.
 */
app.get('/categories', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10'); 
    const page = parseInt(c.req.query('page') || '1');

    const { categories, total, page: currentPage, limit: currentLimit } = await getCategories(limit, page);

    const totalPages = Math.ceil(total / limit);

    const paginationHTML = `
      <div class="pagination">
        ${currentPage > 1 ? `<a href="/categories?page=${currentPage - 1}&limit=${currentLimit}">Previous</a>` : ''}
        <span>Page ${currentPage} of ${totalPages}</span>
        ${currentPage < totalPages ? `<a href="/categories?page=${currentPage + 1}&limit=${currentLimit}">Next</a>` : ''}
      </div>
    `;

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Categories</title>
      </head>
      <body>
        <h1>Categories</h1>
        <ul>
          ${categories.map((category) => `
            <li>
              <a href="/categories/${category.slug}/questions">${category.title}</a>
              <button class="update-button" onclick="openUpdateForm('${category.slug}')">Update</button>
              <button class="delete-button" onclick="deleteCategory('${category.slug}')">Delete</button>
            </li>
          `).join('')}
        </ul>
        ${paginationHTML}
        <p><a href="/">Back to Home</a></p>

        <!-- Update Form (hidden by default) -->
        <div id="updateFormContainer" style="display: none;">
          <h2>Update Category</h2>
          <form id="updateCategoryForm">
            <input type="text" id="updateTitle" name="title" placeholder="New Category Title" required>
            <button type="submit">Update</button>
            <button type="button" onclick="closeUpdateForm()">Cancel</button>
          </form>
        </div>

        <script>
          let currentSlug = '';

          function openUpdateForm(slug) {
            currentSlug = slug;
            document.getElementById('updateFormContainer').style.display = 'block';
          }

          function closeUpdateForm() {
            document.getElementById('updateFormContainer').style.display = 'none';
          }

          document.getElementById('updateCategoryForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('updateTitle').value;

            const response = await fetch(\`/categories/\${currentSlug}\`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ title }),
            });

            if (response.ok) {
              alert('Category updated successfully!');
              window.location.reload(); // Refresh the page
            } else {
              const error = await response.json();
              alert('Error: ' + error.error);
            }
          });

          async function deleteCategory(slug) {
            if (confirm('Are you sure you want to delete this category and all its questions?')) {
              const response = await fetch(\`/categories/\${slug}\`, {
                method: 'DELETE',
              });

              if (response.ok) {
                alert('Category deleted successfully!');
                window.location.reload(); // Refresh the page
              } else {
                alert('Error deleting category');
              }
            }
          }
        </script>
      </body>
      </html>
    `;
    return c.html(html);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});


/**
 * Form to create a new category.
 * Returns an HTML form for creating a new category.
 * Uses JavaScript to submit the form via a POST request to `/categories`.
 * @param {Object} c - The Hono context object.
 * @returns {Response} - The HTML response.
 */
app.get('/create-category', (c) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Create Category</title>
    </head>
    <body>
      <h1>Create New Category</h1>
      <form id="createCategoryForm">
        <input type="text" id="title" name="title" placeholder="Category Title" required>
        <button type="submit">Create</button>
      </form>
      <p><a href="/">Back to Home</a></p>
      <script>
        document.getElementById('createCategoryForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const title = document.getElementById('title').value;

          const response = await fetch('/categories', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title }),
          });

          if (response.ok) {
            alert('Category created successfully!');
            window.location.href = '/categories';
          } else {
            const error = await response.json();
            alert('Error: ' + error.error);
          }
        });
      </script>
    </body>
    </html>
  `;
  return c.html(html);
});


/**
 * View a single category by slug.
 * Returns JSON data for the category with the specified slug.
 * @param {Object} c - The Hono context object.
 * @returns {Promise<Response>} - The JSON response or an error message.
 */
app.get('/categories/:slug', async (c) => {
  const slug = c.req.param('slug');

  try {
    const category = await getCategory(slug);

    if (!category) {
      return c.json({ message: 'Category not found' }, 404);
    }

    return c.json(category, 200);
  } catch (error) {
    console.error('Error fetching category:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});


/**
 * Create a new category.
 * Accepts JSON data with a `title` field and creates a new category in the database.
 * Validates the input using Zod.
 * @param {Object} c - The Hono context object.
 * @returns {Promise<Response>} - The JSON response or an error message.
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
 * Validates the input using Zod.
 * @param {Object} c - The Hono context object.
 * @returns {Promise<Response>} - The JSON response or an error message.
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

    return c.json(updatedCategory, 200);
  } catch (error) {
    console.error('Error updating category:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});


/**
 * Delete a category by slug.
 * Deletes the category with the specified slug and all its associated questions.
 * @param {Object} c - The Hono context object.
 * @returns {Promise<Response>} - The JSON response or an error message.
 */
app.delete('/categories/:slug', async (c) => {
  const slug = c.req.param('slug');

  try {
    const deletedCategory = await deleteCategory(slug);

    if (!deletedCategory) {
      return c.json({ message: 'Category not found' }, 404);
    }

    return c.json(null, 204);
  } catch (error) {
    console.error('Error deleting category:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});


// ==================================================
// Question Endpoints
// ==================================================



/**
 * View all questions in a category with pagination.
 * Returns an HTML page displaying all questions in the specified category.
 * Pagination is supported via `limit` and `page` query parameters.
 * @param {Object} c - The Hono context object.
 * @returns {Promise<Response>} - The HTML response or an error message.
 */
app.get('/categories/:slug/questions', async (c) => {
  const slug = c.req.param('slug');
  const limit = parseInt(c.req.query('limit') || '10');
  const page = parseInt(c.req.query('page') || '1');

  try {
    const category = await getCategory(slug);

    if (!category) {
      return c.html('<h1>Category not found</h1>', 404);
    }

    const { questions, total, page: currentPage, limit: currentLimit } = await getQuestionsByCategory(category.id, limit, page);

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Questions in ${xss(category.title)}</title>
      </head>
      <body>
        <h1>Questions in ${xss(category.title)}</h1>
        <ul>
          ${questions.map((question) => `
            <li class="question">
              <strong>${xss(question.text)}</strong>
              <ul class="options">
                ${question.options.map((option, index) => `
                  <li class="option">
                    <input type="radio" name="question-${question.id}" value="${index}" id="option-${question.id}-${index}">
                    <label for="option-${question.id}-${index}">${xss(option.text)}</label>
                  </li>
                `).join('')}
              </ul>
              <button onclick="verifyAnswer(${question.id}, ${question.options.findIndex((opt) => opt.isCorrect)})">Verify Answer</button>
              <a href="/categories/${xss(slug)}/questions/${question.id}/edit"><button class="edit-button">Edit</button></a>
              <button class="delete-button" onclick="deleteQuestion(${question.id})">Delete Question</button>
              <p id="result-${question.id}"></p>
            </li>
          `).join('')}
        </ul>

        <div class="pagination">
          ${currentPage > 1 ? `<a href="/categories/${xss(slug)}/questions?limit=${currentLimit}&page=${currentPage - 1}">Previous</a>` : ''}
          ${currentPage * currentLimit < total ? `<a href="/categories/${xss(slug)}/questions?limit=${currentLimit}&page=${currentPage + 1}">Next Page</a>` : ''}
        </div>

        <p><a href="/categories/${xss(slug)}/create-question">Create New Question</a></p>
        <p><a href="/categories">Back to Categories</a></p>

        <script>
          function verifyAnswer(questionId, correctIndex) {
            const selectedOption = document.querySelector(\`input[name="question-\${questionId}"]:checked\`);
            const resultElement = document.getElementById(\`result-\${questionId}\`);

            if (!selectedOption) {
              resultElement.textContent = "Please select an option!";
              resultElement.className = "incorrect";
              return;
            }

            const selectedIndex = parseInt(selectedOption.value);

            if (selectedIndex === correctIndex) {
              resultElement.textContent = "Correct! 🎉";
              resultElement.className = "correct";
            } else {
              resultElement.textContent = "Incorrect! ❌";
              resultElement.className = "incorrect";
            }
          }

          async function deleteQuestion(questionId) {
            if (confirm('Are you sure you want to delete this question?')) {
              const response = await fetch(\`/questions/\${questionId}\`, {
                method: 'DELETE',
              });

              if (response.ok) {
                alert('Question deleted successfully!');
                window.location.reload(); // Refresh the page
              } else {
                alert('Error deleting question');
              }
            }
          }
        </script>
      </body>
      </html>
    `;
    return c.html(html);
  } catch (error) {
    console.error('Error fetching questions by category:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});



/**
 * View all questions in a category with pagination.
 * Returns an HTML page displaying all questions in the specified category.
 * Pagination is supported via `limit` and `page` query parameters.
 * @param {Object} c - The Hono context object.
 * @returns {Promise<Response>} - The HTML response or an error message.
 */
app.get('/categories/:slug/questions/:id/edit', async (c) => {
  const slug = c.req.param('slug');
  const id = parseInt(c.req.param('id'));

  try {
    const question = await getQuestionById(id);

    if (!question) {
      return c.html('<h1>Question not found</h1>', 404);
    }

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Edit Question</title>
      </head>
      <body>
        <h1>Edit Question</h1>
        <form id="editQuestionForm">
          <input type="text" id="questionText" name="text" value="${xss(question.text)}" placeholder="Question Text" required>
          <div id="options">
            <div class="option">
              <input type="text" name="option0" value="${xss(question.options[0]?.text || '')}" placeholder="Option 1" required>
              <label>
                <input type="radio" name="correctOption" value="0" ${question.options[0]?.isCorrect ? 'checked' : ''}> Correct
              </label>
            </div>
            <div class="option">
              <input type="text" name="option1" value="${xss(question.options[1]?.text || '')}" placeholder="Option 2" required>
              <label>
                <input type="radio" name="correctOption" value="1" ${question.options[1]?.isCorrect ? 'checked' : ''}> Correct
              </label>
            </div>
            <div class="option">
              <input type="text" name="option2" value="${xss(question.options[2]?.text || '')}" placeholder="Option 3" required>
              <label>
                <input type="radio" name="correctOption" value="2" ${question.options[2]?.isCorrect ? 'checked' : ''}> Correct
              </label>
            </div>
            <div class="option">
              <input type="text" name="option3" value="${xss(question.options[3]?.text || '')}" placeholder="Option 4" required>
              <label>
                <input type="radio" name="correctOption" value="3" ${question.options[3]?.isCorrect ? 'checked' : ''}> Correct
              </label>
            </div>
          </div>
          <button type="submit">Update</button>
          <a href="/categories/${xss(slug)}/questions"><button type="button">Cancel</button></a>
        </form>

        <script>
          document.getElementById('editQuestionForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = document.getElementById('questionText').value;
            const options = Array.from(document.querySelectorAll('#options input[type="text"]')).map((input, index) => ({
              text: input.value,
              isCorrect: document.querySelectorAll('#options input[type="radio"]')[index].checked,
            }));

            const response = await fetch(\`/questions/${id}\`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ text, options }),
            });

            if (response.ok) {
              alert('Question updated successfully!');
              window.location.href = \`/categories/${xss(slug)}/questions\`;
            } else {
              const error = await response.json();
              alert('Error: ' + error.error);
            }
          });
        </script>
      </body>
      </html>
    `;
    return c.html(html);
  } catch (error) {
    console.error('Error fetching question:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});




/**
 * GET /categories/:slug/create-question - Renders a form to create a new question in a specific category.
 * @param {Object} c - The context object containing request and response details.
 * @param {string} c.req.param.slug - The slug of the category where the question will be created.
 * @returns {Promise<Response>} - Returns an HTML form for creating a question or an error message.
 * @throws {Error} - Throws an error if there is an issue fetching the category or rendering the form.
 */
app.get('/categories/:slug/create-question', async (c) => {
  const slug = c.req.param('slug');

  try {
    const category = await getCategory(slug);

    if (!category) {
      return c.html('<h1>Category not found</h1>', 404);
    }

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Create Question in ${xss(category.title)}</title>
      </head>
      <body>
        <h1>Create New Question in ${xss(category.title)}</h1>
        <form id="createQuestionForm">
          <input type="text" id="questionText" name="text" placeholder="Question Text" required>
          <div id="options">
            <div class="option">
              <input type="text" name="option1" placeholder="Option 1" required>
              <label>
                <input type="radio" name="correctOption" value="0" required> Correct
              </label>
            </div>
            <div class="option">
              <input type="text" name="option2" placeholder="Option 2" required>
              <label>
                <input type="radio" name="correctOption" value="1" required> Correct
              </label>
            </div>
            <div class="option">
              <input type="text" name="option3" placeholder="Option 3" required>
              <label>
                <input type="radio" name="correctOption" value="2" required> Correct
              </label>
            </div>
            <div class="option">
              <input type="text" name="option4" placeholder="Option 4" required>
              <label>
                <input type="radio" name="correctOption" value="3" required> Correct
              </label>
            </div>
          </div>
          <button type="submit">Create</button>
        </form>
        <p><a href="/categories/${xss(slug)}/questions">Back to Questions</a></p>
        <script>
          const categoryId = ${category.id}; // Pass categoryId to the frontend

          document.getElementById('createQuestionForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = document.getElementById('questionText').value;
            const options = Array.from(document.querySelectorAll('#options input[type="text"]')).map((input, index) => ({
              text: input.value,
              isCorrect: document.querySelectorAll('input[type="radio"]')[index].checked,
            }));

            const response = await fetch('/categories/${xss(slug)}/questions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ text, options, categoryId }), // Include categoryId
            });

            if (response.ok) {
              alert('Question created successfully!');
              window.location.href = '/categories/${xss(slug)}/questions';
            } else {
              const error = await response.json();
              alert('Error: ' + error.error);
            }
          });
        </script>
      </body>
      </html>
    `;
    return c.html(html);
  } catch (error) {
    console.error('Error fetching category:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});



/**
 * GET /categories/:slug/create-question - Renders a form to create a new question in a specific category.
 * @param {Object} c - The context object containing request and response details.
 * @param {string} c.req.param.slug - The slug of the category where the question will be created.
 * @returns {Promise<Response>} - Returns an HTML form for creating a question or an error message.
 * @throws {Error} - Throws an error if there is an issue fetching the category or rendering the form.
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
    console.error('Validation errors:', validQuestion.error.flatten());
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
 * GET /categories/:slug/create-question - Renders a form to create a new question in a specific category.
 * @param {Object} c - The context object containing request and response details.
 * @param {string} c.req.param.slug - The slug of the category where the question will be created.
 * @returns {Promise<Response>} - Returns an HTML form for creating a question or an error message.
 * @throws {Error} - Throws an error if there is an issue fetching the category or rendering the form.
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


    return c.json(updatedQuestion, 200);
  } catch (error) {
    console.error('Error updating question:', error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});



/**
 * DELETE /questions/:id - Deletes an existing question.
 * @param {Object} c - The context object containing request and response details.
 * @param {number} c.req.param.id - The ID of the question to be deleted.
 * @returns {Promise<Response>} - Returns a success response or an error message.
 * @throws {Error} - Throws an error if there is an issue deleting the question.
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