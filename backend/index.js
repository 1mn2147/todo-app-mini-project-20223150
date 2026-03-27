require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const { Todo } = require('./models/Todo');
const { User, normalizeEmail } = require('./models/User');
const { requireAuth } = require('./middleware/auth');
const { errorHandler } = require('./middleware/error-handler');
const { comparePassword, hashPassword } = require('./utils/passwords');
const { signAuthToken } = require('./utils/jwt');
const { badRequest, conflict, notFound, unauthorized } = require('./utils/errors');
const { validateEnv } = require('./utils/env');

const app = express();
app.use(cors());
app.use(express.json());

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function createAuthResponse(user) {
  return {
    token: signAuthToken({ sub: user.id }),
    user: sanitizeUser(user),
  };
}

async function getCurrentUserOrThrow(userId) {
  const user = await User.findById(userId);

  if (!user) {
    throw unauthorized('Authenticated user no longer exists');
  }

  return user;
}

function validateRequiredString(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw badRequest(`${fieldName} is required`);
  }

  return value.trim();
}

function validateOptionalDueAt(value) {
  if (typeof value === 'undefined') {
    return null;
  }

  if (typeof value !== 'string') {
    throw badRequest('Due date must be a valid ISO datetime');
  }

  const trimmedValue = value.trim();
  const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

  if (!isoDateTimePattern.test(trimmedValue)) {
    throw badRequest('Due date must be a valid ISO datetime');
  }

  const dueAt = new Date(trimmedValue);

  if (Number.isNaN(dueAt.getTime())) {
    throw badRequest('Due date must be a valid ISO datetime');
  }

  return dueAt;
}

function validateOptionalTodoView(value) {
  if (typeof value === 'undefined') {
    return null;
  }

  if (typeof value !== 'string') {
    throw badRequest('View must be one of all, today, or calendar');
  }

  const view = value.trim().toLowerCase();

  if (!['all', 'today', 'calendar'].includes(view)) {
    throw badRequest('View must be one of all, today, or calendar');
  }

  return view;
}

function validateOptionalDateQuery(value, fieldName) {
  if (typeof value === 'undefined') {
    return null;
  }

  if (typeof value !== 'string') {
    throw badRequest(`${fieldName} must be a valid ISO datetime`);
  }

  const trimmedValue = value.trim();
  const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

  if (!isoDateTimePattern.test(trimmedValue)) {
    throw badRequest(`${fieldName} must be a valid ISO datetime`);
  }

  const date = new Date(trimmedValue);

  if (Number.isNaN(date.getTime())) {
    throw badRequest(`${fieldName} must be a valid ISO datetime`);
  }

  return date;
}

function validateOptionalIncludeCompleted(value) {
  if (typeof value === 'undefined') {
    return null;
  }

  if (typeof value !== 'string') {
    throw badRequest('includeCompleted must be true or false');
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === 'true') {
    return true;
  }

  if (normalizedValue === 'false') {
    return false;
  }

  throw badRequest('includeCompleted must be true or false');
}

app.post('/api/auth/signup', async (req, res, next) => {
  try {
    const name = validateRequiredString(req.body.name, 'Name');
    const email = normalizeEmail(validateRequiredString(req.body.email, 'Email'));
    const password = validateRequiredString(req.body.password, 'Password');

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw conflict('Email already in use');
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      name,
      email,
      passwordHash,
    });

    res.status(201).json(createAuthResponse(user));
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = normalizeEmail(validateRequiredString(req.body.email, 'Email'));
    const password = validateRequiredString(req.body.password, 'Password');
    const user = await User.findOne({ email });

    if (!user) {
      throw unauthorized('Invalid email or password');
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      throw unauthorized('Invalid email or password');
    }

    res.json(createAuthResponse(user));
  } catch (error) {
    next(error);
  }
});

app.get('/api/auth/me', requireAuth, async (req, res, next) => {
  try {
    const user = await getCurrentUserOrThrow(req.auth.sub);
    res.json(sanitizeUser(user));
  } catch (error) {
    next(error);
  }
});

app.put('/api/auth/me', requireAuth, async (req, res, next) => {
  try {
    const allowedFields = ['name', 'email'];
    const updateKeys = Object.keys(req.body);
    const hasInvalidField = updateKeys.some((key) => !allowedFields.includes(key));

    if (hasInvalidField) {
      throw badRequest('Only name and email can be updated');
    }

    if (updateKeys.length === 0) {
      throw badRequest('At least one profile field is required');
    }

    const user = await getCurrentUserOrThrow(req.auth.sub);

    if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
      user.name = validateRequiredString(req.body.name, 'Name');
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'email')) {
      const email = normalizeEmail(validateRequiredString(req.body.email, 'Email'));
      const existingUser = await User.findOne({ email, _id: { $ne: user._id } });

      if (existingUser) {
        throw conflict('Email already in use');
      }

      user.email = email;
    }

    await user.save();

    res.json(sanitizeUser(user));
  } catch (error) {
    next(error);
  }
});

app.put('/api/auth/me/password', requireAuth, async (req, res, next) => {
  try {
    const currentPassword = validateRequiredString(req.body.currentPassword, 'Current password');
    const newPassword = validateRequiredString(req.body.newPassword, 'New password');
    const user = await getCurrentUserOrThrow(req.auth.sub);
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.passwordHash);

    if (!isCurrentPasswordValid) {
      throw unauthorized('Current password is incorrect');
    }

    user.passwordHash = await hashPassword(newPassword);
    await user.save();

    res.json(sanitizeUser(user));
  } catch (error) {
    next(error);
  }
});

app.get('/api/todos', requireAuth, async (req, res, next) => {
  try {
    const view = validateOptionalTodoView(req.query.view);
    const start = validateOptionalDateQuery(req.query.start, 'Start date');
    const end = validateOptionalDateQuery(req.query.end, 'End date');
    const includeCompleted = validateOptionalIncludeCompleted(req.query.includeCompleted);

    if (start && end && start > end) {
      throw badRequest('Start date must be before or equal to end date');
    }

    const filters = { owner: req.auth.sub };

    if (includeCompleted === false) {
      filters.completed = false;
    }

    const dueAtRange = {};

    if (start) {
      dueAtRange.$gte = start;
    }

    if (end) {
      dueAtRange.$lte = end;
    }

    const hasDueAtRange = Object.keys(dueAtRange).length > 0;

    if (view === 'all' && hasDueAtRange) {
      filters.$or = [{ dueAt: dueAtRange }, { dueAt: null }];
    } else if (view === 'today' || view === 'calendar') {
      filters.dueAt = hasDueAtRange ? dueAtRange : { $ne: null };
    } else if (hasDueAtRange) {
      filters.dueAt = dueAtRange;
    }

    const todos = await Todo.find(filters);
    res.json(todos);
  } catch (error) {
    next(error);
  }
});

app.post('/api/todos', requireAuth, async (req, res, next) => {
  try {
    const title = validateRequiredString(req.body.title, 'Title');
    const dueAt = validateOptionalDueAt(req.body.dueAt);
    const newTodo = new Todo({
      title,
      dueAt,
      owner: req.auth.sub,
    });

    await newTodo.save();
    res.status(201).json(newTodo);
  } catch (error) {
    next(error);
  }
});

app.put('/api/todos/:id', requireAuth, async (req, res, next) => {
  try {
    const allowedFields = ['title', 'completed', 'dueAt'];
    const updateKeys = Object.keys(req.body);
    const hasInvalidField = updateKeys.some((key) => !allowedFields.includes(key));

    if (hasInvalidField) {
      throw badRequest('Only title, completed, and due date can be updated');
    }

    if (updateKeys.length === 0) {
      throw badRequest('At least one todo field is required');
    }

    const updates = {};

    if (Object.prototype.hasOwnProperty.call(req.body, 'title')) {
      updates.title = validateRequiredString(req.body.title, 'Title');
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'completed')) {
      if (typeof req.body.completed !== 'boolean') {
        throw badRequest('Completed must be a boolean');
      }

      updates.completed = req.body.completed;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'dueAt')) {
      updates.dueAt = validateOptionalDueAt(req.body.dueAt);
    }

    const todo = await Todo.findOneAndUpdate(
      { _id: req.params.id, owner: req.auth.sub },
      updates,
      { new: true, runValidators: true }
    );

    if (!todo) {
      throw notFound('Todo not found');
    }

    res.json(todo);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/todos/:id', requireAuth, async (req, res, next) => {
  try {
    const deletedTodo = await Todo.findOneAndDelete({ _id: req.params.id, owner: req.auth.sub });

    if (!deletedTodo) {
      throw notFound('Todo not found');
    }

    res.json({ message: '삭제 완료' });
  } catch (error) {
    next(error);
  }
});

app.use(errorHandler);

// Minimal root handler to provide a friendly message at the API root.
// Keeps the server clearly an API server and points users to /api and the
// separate frontend dev server (usually running on :5173).
app.get('/', (req, res) => {
  res.json({
    message: 'This is the Todo API server. API routes are under /api (e.g. GET /api/todos).',
    note: 'The frontend dev server runs separately (commonly http://localhost:5173). Do not expect the SPA to be served from this server.'
  });
});
async function startServer() {
  const env = validateEnv(process.env);

  await mongoose.connect(env.mongodbUri);
  console.log('MongoDB 연결 성공');

  app.listen(env.port, () => console.log(`서버 실행 중: http://localhost:${env.port}`));
}

startServer().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

module.exports = {
  app,
  Todo,
  User,
};
