import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import xss from 'xss';

const prisma = new PrismaClient();

// Zod schema fyrir spurningu
const QuestionSchema = z.object({
    id: z.number(),
    text: z.string(),
    categoryId: z.number(),
    options: z.array(
      z.object({
        id: z.number(),
        text: z.string(),
        isCorrect: z.boolean(),
        questionId: z.number(),
      }),
    ),
  });

  
// Zod schema fyrir spurningu sem á að búa til
const QuestionToCreateSchema = z.object({
  text: z.string().min(3, 'Spurning verður að innihalda að minnsta kosti 3 stafi'),
  categoryId: z.number(),
  options: z.array(
    z.object({
      text: z.string().min(1, 'Svarmöguleiki verður að innihalda að minnsta kosti 1 staf'),
      isCorrect: z.boolean(),
    }),
  ),
});


// Zod schema fyrir spurningu sem á að uppfæra
const QuestionToUpdateSchema = z.object({
    text: z.string().min(3, 'Spurning verður að innihalda að minnsta kosti 3 stafi').optional(),
    categoryId: z.number().optional(), 
    options: z
      .array(
        z.object({
          id: z.number().optional(), 
          text: z.string().min(1, 'Svarmöguleiki verður að innihalda að minnsta kosti 1 staf'),
          isCorrect: z.boolean(),
        }),
      )
      .optional(),
  });

// Type definitions
type Question = z.infer<typeof QuestionSchema>;
type QuestionToCreate = z.infer<typeof QuestionToCreateSchema>;
type QuestionToUpdate = z.infer<typeof QuestionToUpdateSchema>;
type Option = z.infer<typeof QuestionSchema>['options'][number];


/**
 * Fetches all questions with pagination.
 * @param {number} [limit=10] - The number of questions to return per page.
 * @param {number} [page=1] - The page number to fetch.
 * @returns {Promise<{ questions: Array<Question>, total: number, page: number, limit: number }>} - An object containing the questions, total count, current page, and limit.
 * @throws {Error} - Throws an error if there's a database issue.
 */
export async function getQuestions(limit: number = 10, page: number = 1) {
    try {
      const offset = (page - 1) * limit;
  
      const questions = await prisma.question.findMany({
        skip: offset,
        take: limit,
        include: {
          options: true, 
        },
      });
  
      const sanitizedQuestions = questions.map((question) => ({
        ...question,
        text: xss(question.text), 
        options: question.options.map((option) => ({
          ...option,
          text: xss(option.text),
        })),
      }));
  
      const total = await prisma.question.count();
  
      return {
        questions: sanitizedQuestions, 
        total,
        page,
        limit,
      };
    } catch (error) {
      console.error('Villa við að sækja spurningar:', error);
      throw new Error('Internal Server Error');
    }
  }


/**
 * Fetches a single question by its ID.
 * @param {number} id - The ID of the question to fetch.
 * @returns {Promise<Question | null>} - The question object or null if not found.
 * @throws {Error} - Throws an error if there's a database issue.
 */
export async function getQuestionById(id: number): Promise<Question | null> {
    try {
      const question = await prisma.question.findUnique({
        where: { id },
        include: {
          options: true, 
        },
      });
  
      if (!question) {
        return null;
      }
  
      const sanitizedQuestion = {
        ...question,
        text: xss(question.text), 
        options: question.options.map((option) => ({
          ...option,
          text: xss(option.text), 
        })),
      };
  
      return sanitizedQuestion;
    } catch (error) {
      console.error('Villa við að sækja spurningu:', error);
      throw new Error('Internal Server Error');
    }
  }


/**
 * Fetches all questions for a specific category with pagination.
 * @param {number} categoryId - The ID of the category to fetch questions for.
 * @param {number} [limit=10] - The number of questions to return per page.
 * @param {number} [page=1] - The page number to fetch.
 * @returns {Promise<{ questions: Array<Question>, total: number, page: number, limit: number }>} - An object containing the questions, total count, current page, and limit.
 * @throws {Error} - Throws an error if there's a database issue.
 */
export async function getQuestionsByCategory(categoryId: number, limit: number = 10, page: number = 1) {
    try {
      const offset = (page - 1) * limit;
  
      const questions = await prisma.question.findMany({
        where: { categoryId },
        skip: offset,
        take: limit,
        include: {
          options: true, 
        },
      });
  
      const sanitizedQuestions = questions.map((question) => ({
        ...question,
        text: xss(question.text), 
        options: question.options.map((option) => ({
          ...option,
          text: xss(option.text), 
        })),
      }));
  
      const total = await prisma.question.count({
        where: { categoryId },
      });
  
      return {
        questions: sanitizedQuestions, 
        total,
        page,
        limit,
      };
    } catch (error) {
      console.error('Villa við að sækja spurningar eftir flokk:', error);
      throw new Error('Internal Server Error');
    }
  }


/**
 * Validates data for creating a question.
 * @param {unknown} data - The data to validate.
 * @returns {import('zod').SafeParseReturnType<QuestionToCreate, QuestionToCreate>} - The validation result.
 */
export function validateQuestionToCreate(data: unknown) {
  return QuestionToCreateSchema.safeParse(data);
}

/**
 * Validates data for updating a question.
 * @param {unknown} data - The data to validate.
 * @returns {import('zod').SafeParseReturnType<QuestionToUpdate, QuestionToUpdate>} - The validation result.
 */
export function validateQuestionToUpdate(data: unknown) {
  return QuestionToUpdateSchema.safeParse(data);
}


/**
 * Creates a new question with options.
 * @param {Object} data - The question data to create.
 * @param {string} data.text - The text of the question.
 * @param {number} data.categoryId - The ID of the category the question belongs to.
 * @param {Array<{ text: string, isCorrect: boolean }>} data.options - The options for the question.
 * @returns {Promise<Question>} - The created question object.
 * @throws {Error} - Throws an error if there's a database issue or validation fails.
 */
export async function createQuestion(data: {
    text: string;
    categoryId: number;
    options: Array<{ text: string; isCorrect: boolean }>;
  }): Promise<Question> {
    try {
      const sanitizedData = {
        text: xss(data.text), 
        categoryId: data.categoryId,
        options: data.options.map((option) => ({
          text: xss(option.text), 
          isCorrect: option.isCorrect,
        })),
      };
  
      const createdQuestion = await prisma.question.create({
        data: {
          text: sanitizedData.text,
          categoryId: sanitizedData.categoryId,
          options: {
            create: sanitizedData.options, 
          },
        },
        include: {
          options: true, 
        },
      });
      return createdQuestion;
    } catch (error) {
      console.error('Error creating question:', error);
      throw new Error('Internal Server Error');
    }
  }


/**
 * Deletes a question by its ID.
 * @param {number} id - The ID of the question to delete.
 * @returns {Promise<void>} - Resolves if the question is deleted successfully.
 * @throws {Error} - Throws an error if there's a database issue.
 */
export async function deleteQuestion(id: number): Promise<void> {
    try {
      await prisma.option.deleteMany({
        where: { questionId: id },
      });
  
      await prisma.question.delete({
        where: { id },
      });
    } catch (error) {
      console.error('Error deleting question:', error);
      throw new Error('Internal Server Error');
    }
  }


  /**
 * Updates an existing question by its ID.
 * @param {number} id - The ID of the question to update.
 * @param {QuestionToUpdate} data - The data to update (e.g., { text: string, options: Array<{ text: string, isCorrect: boolean }> }).
 * @returns {Promise<Question | null>} - The updated question object or null if not found.
 * @throws {Error} - Throws an error if there's a database issue or validation fails.
 */
  export async function updateQuestion(id: number, data: QuestionToUpdate): Promise<Question | null> {
    try {
      const sanitizedData = {
        text: data.text ? xss(data.text) : undefined, 
        categoryId: data.categoryId,
        options: data.options?.map((option) => ({
          text: xss(option.text), 
          isCorrect: option.isCorrect,
        })),
      };
  
      const updatedQuestion = await prisma.question.update({
        where: { id },
        data: {
          text: sanitizedData.text, 
          options: {
            deleteMany: {}, 
            create: sanitizedData.options, 
          },
        },
        include: {
          options: true, 
        },
      });
  
      return updatedQuestion;
    } catch (error) {
      console.error('Error updating question:', error);
      throw new Error('Internal Server Error');
    }
  }


  /**
 * Shuffles an array using the Fisher-Yates algorithm.
 * @template T - The type of elements in the array.
 * @param {Array<T>} array - The array to shuffle.
 * @returns {Array<T>} - The shuffled array.
 */
  function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); 
      [array[i], array[j]] = [array[j], array[i]]; 
    }
    return array;
  }
