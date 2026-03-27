import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  authApi,
  clearPersistedToken,
  getErrorMessage,
  isUnauthorizedError,
  persistToken,
  restoreStoredToken,
  todoApi,
} from './api'
import './App.css'

const emptyAuthForm = {
  name: '',
  email: '',
  password: '',
}

const emptyPasswordForm = {
  currentPassword: '',
  newPassword: '',
}

function normalizeTodo(todo) {
  return {
    ...todo,
    dueAt: todo?.dueAt ?? null,
  }
}

function normalizeTodos(todoItems) {
  return todoItems.map(normalizeTodo)
}

function getDueAtPayload(dueAtInput) {
  if (!dueAtInput) {
    return null
  }

  return new Date(dueAtInput).toISOString()
}

function formatDueAtLabel(dueAt) {
  if (!dueAt) {
    return ''
  }

  const parsedDueAt = new Date(dueAt)

  if (Number.isNaN(parsedDueAt.getTime())) {
    return ''
  }

  return parsedDueAt.toLocaleString()
}

function getStartOfLocalDay(date = new Date()) {
  const localDay = new Date(date)
  localDay.setHours(0, 0, 0, 0)
  return localDay
}

function getEndOfLocalDay(date = new Date()) {
  const localDay = new Date(date)
  localDay.setHours(23, 59, 59, 999)
  return localDay
}

function parseDueAtDate(dueAt) {
  if (!dueAt) {
    return null
  }

  const parsedDueAt = new Date(dueAt)

  if (Number.isNaN(parsedDueAt.getTime())) {
    return null
  }

  return parsedDueAt
}

function isDueAtWithinRange(dueAt, start, end) {
  const parsedDueAt = parseDueAtDate(dueAt)

  if (!parsedDueAt) {
    return false
  }

  return parsedDueAt >= start && parsedDueAt <= end
}

function getTodoListParams(view, settings, referenceDate = new Date()) {
  const todayStart = getStartOfLocalDay(referenceDate)
  const todayEnd = getEndOfLocalDay(referenceDate)

  if (view === 'today') {
    return {
      view: 'today',
      start: todayStart,
      end: todayEnd,
      includeCompleted: settings.showCompleted,
    }
  }

  if (view === 'calendar') {
    const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
    const monthEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0, 23, 59, 59, 999)

    return {
      view: 'calendar',
      start: monthStart,
      end: monthEnd,
      includeCompleted: settings.showCompleted,
    }
  }

  const allTasksEnd = getEndOfLocalDay(
    new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate() + settings.horizonDays - 1)
  )

  return {
    view: 'all',
    start: todayStart,
    end: allTasksEnd,
    includeCompleted: settings.showCompleted,
  }
}

const commandStripItems = ['All Tasks', 'Today', 'Calendar', 'Settings']
const appSettingsStorageKey = 'todo-app-settings'
const defaultAppSettings = {
  horizonDays: 30,
  showCompleted: true,
  defaultView: 'all',
}

function isValidHorizonDays(value) {
  return Number.isInteger(value) && value >= 1 && value <= 365
}

function isValidDefaultView(value) {
  return ['all', 'today', 'calendar'].includes(value)
}

function sanitizeAppSettings(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return null
  }

  const { horizonDays, showCompleted, defaultView } = candidate

  if (!isValidHorizonDays(horizonDays) || typeof showCompleted !== 'boolean' || !isValidDefaultView(defaultView)) {
    return null
  }

  return {
    horizonDays,
    showCompleted,
    defaultView,
  }
}

function persistAppSettings(settings) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(appSettingsStorageKey, JSON.stringify(settings))
}

function restoreAppSettings() {
  if (typeof window === 'undefined') {
    return defaultAppSettings
  }

  const storedSettings = window.localStorage.getItem(appSettingsStorageKey)

  if (!storedSettings) {
    return defaultAppSettings
  }

  try {
    const parsedSettings = JSON.parse(storedSettings)
    const sanitizedSettings = sanitizeAppSettings(parsedSettings)

    if (!sanitizedSettings) {
      persistAppSettings(defaultAppSettings)
      return defaultAppSettings
    }

    return sanitizedSettings
  } catch {
    persistAppSettings(defaultAppSettings)
    return defaultAppSettings
  }
}

const missionMeta = [
  {
    label: 'Deep Space',
    detail: 'Arrival: 4.2 Light Years',
  },
  {
    label: 'Maintenance',
    detail: 'Status: 82% Precision',
  },
  {
    label: 'Logistics',
    detail: 'Inventory complete at Terminal B',
  },
]

function App() {
  const [bootStatus, setBootStatus] = useState('booting')
  const [sessionStatus, setSessionStatus] = useState('unauthenticated')
  const [authMode, setAuthMode] = useState('login')
  const [pendingRequest, setPendingRequest] = useState('')
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [currentUser, setCurrentUser] = useState(null)
  const [todos, setTodos] = useState([])
  const [authForm, setAuthForm] = useState(emptyAuthForm)
  const [profileForm, setProfileForm] = useState({ name: '', email: '' })
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm)
  const [todoTitle, setTodoTitle] = useState('')
  const [todoDueAt, setTodoDueAt] = useState('')
  const [settings, setSettings] = useState(() => restoreAppSettings())
  const [activeCommandView, setActiveCommandView] = useState(() => restoreAppSettings().defaultView)
  // Reference date for the calendar view. Normalized to the first day of the month to avoid drift.
  const [calendarReferenceDate, setCalendarReferenceDate] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const isBusy = Boolean(pendingRequest)
  const isAuthenticated = sessionStatus === 'authenticated'
  const todayStart = getStartOfLocalDay()
  const todayEnd = getEndOfLocalDay()
  const visibleTodoPool = settings.showCompleted ? todos : todos.filter((todo) => !todo.completed)
  const allTasksEnd = getEndOfLocalDay(
    new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate() + settings.horizonDays - 1)
  )

  const todayTodos = visibleTodoPool.filter((todo) => isDueAtWithinRange(todo.dueAt, todayStart, todayEnd))
  const scheduledAllTaskTodos = visibleTodoPool.filter((todo) => isDueAtWithinRange(todo.dueAt, todayStart, allTasksEnd))
  const unscheduledTodos = visibleTodoPool.filter((todo) => todo.dueAt === null)
  const visibleTodos = activeCommandView === 'today' ? todayTodos : activeCommandView === 'all' ? scheduledAllTaskTodos : []

  const calendarMonthDays = useMemo(() => {
    if (activeCommandView !== 'calendar') return []

    const year = calendarReferenceDate.getFullYear()
    const month = calendarReferenceDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const days = []
    const startDayOfWeek = firstDay.getDay()
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null)
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d))
    }
    return days
  }, [activeCommandView, calendarReferenceDate])

  const todoStats = useMemo(() => {
    const completedCount = todos.filter((todo) => todo.completed).length

    return {
      total: scheduledAllTaskTodos.length + unscheduledTodos.length,
      completed: completedCount,
      today: todayTodos.length,
    }
  }, [scheduledAllTaskTodos.length, todayTodos.length, todos, unscheduledTodos.length])

  const resetAuthState = useCallback((message = '') => {
    clearPersistedToken()
    setSessionStatus('unauthenticated')
    setCurrentUser(null)
    setTodos([])
    setAuthForm(emptyAuthForm)
    setProfileForm({ name: '', email: '' })
    setPasswordForm(emptyPasswordForm)
    setTodoTitle('')
    setTodoDueAt('')
    setActiveCommandView(settings.defaultView)
    setFeedback(message ? { type: 'error', message } : { type: '', message: '' })
  }, [settings.defaultView])

  const loadTodosForView = useCallback(async (view = activeCommandView) => {
    const params = view === 'calendar' ? getTodoListParams('calendar', settings, calendarReferenceDate) : getTodoListParams(view, settings)
    const response = await todoApi.list(params)
    setTodos(normalizeTodos(response.data))
    return response
  }, [activeCommandView, settings, calendarReferenceDate])

  function renderTodoItem(todo, index) {
    const requestKeyPrefix = `${todo._id}`
    const isComplete = todo.completed
    const meta = missionMeta[index % missionMeta.length]
    const dueAtLabel = formatDueAtLabel(todo.dueAt)

    return (
      <li key={todo._id} className="todo-item">
        <label className="todo-toggle">
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={(event) => handleToggleTodo(todo._id, event.target.checked, todo.dueAt)}
            disabled={isBusy}
          />
          <div>
            <span className={isComplete ? 'todo-title is-complete' : 'todo-title'} style={{ display: 'block' }}>{todo.title}</span>
            <span className="todo-meta-label">{meta.label}</span>
            <span className="mono todo-meta-detail">
              {dueAtLabel || (isComplete ? 'Mission secured in orbital archive' : meta.detail)}
            </span>
          </div>
        </label>
        <button
          type="button"
          className="danger-button"
          onClick={() => handleDeleteTodo(todo._id)}
          disabled={isBusy || pendingRequest === `toggle-${requestKeyPrefix}`}
        >
          {pendingRequest === `delete-${requestKeyPrefix}` ? 'Aborting...' : 'Abort'}
        </button>
      </li>
    )
  }

  useEffect(() => {
    let isActive = true

    async function bootApp() {
      const token = restoreStoredToken()

      if (!token) {
        if (!isActive) {
          return
        }

        setBootStatus('ready')
        return
      }

      try {
        const bootCalendarReferenceDate = new Date()
        bootCalendarReferenceDate.setDate(1)
        const defaultViewParams =
          settings.defaultView === 'calendar'
            ? getTodoListParams('calendar', settings, bootCalendarReferenceDate)
            : getTodoListParams(settings.defaultView, settings)

        const [userResponse, todosResponse] = await Promise.all([
          authApi.fetchMe(),
          todoApi.list(defaultViewParams),
        ])

        if (!isActive) {
          return
        }

        setCurrentUser(userResponse.data)
        setProfileForm({
          name: userResponse.data.name,
          email: userResponse.data.email,
        })
        setTodos(normalizeTodos(todosResponse.data))
        setSessionStatus('authenticated')
      } catch (error) {
        if (!isActive) {
          return
        }

        resetAuthState(
          isUnauthorizedError(error)
            ? 'Your saved session is no longer valid. Please sign in again.'
            : getErrorMessage(error, 'We could not restore your session. Please sign in again.')
        )
      } finally {
        if (isActive) {
          setBootStatus('ready')
        }
      }
    }

    bootApp()

    return () => {
      isActive = false
    }
  }, [resetAuthState, settings])

  useEffect(() => {
    persistAppSettings(settings)
  }, [settings])

  function updateAuthField(event) {
    const { name, value } = event.target
    setAuthForm((current) => ({ ...current, [name]: value }))
  }

  function updateProfileField(event) {
    const { name, value } = event.target
    setProfileForm((current) => ({ ...current, [name]: value }))
  }

  function updatePasswordField(event) {
    const { name, value } = event.target
    setPasswordForm((current) => ({ ...current, [name]: value }))
  }

  function updateSettingsField(event) {
    const { name, value, type, checked } = event.target

    setSettings((current) => {
      if (type === 'checkbox') {
        return {
          ...current,
          [name]: checked,
        }
      }

      if (name === 'horizonDays') {
        const nextValue = Number(value)

        if (!isValidHorizonDays(nextValue)) {
          return current
        }

        return {
          ...current,
          horizonDays: nextValue,
        }
      }

      return {
        ...current,
        [name]: value,
      }
    })
  }

  function applyAuthenticatedSession(token, user, todoItems, successMessage = '') {
    persistToken(token)
    setCurrentUser(user)
    setProfileForm({ name: user.name, email: user.email })
    setTodos(normalizeTodos(todoItems))
    setPasswordForm(emptyPasswordForm)
    setTodoTitle('')
    setTodoDueAt('')
    setActiveCommandView(settings.defaultView)
    setSessionStatus('authenticated')
    setFeedback(successMessage ? { type: 'success', message: successMessage } : { type: '', message: '' })
  }

  useEffect(() => {
    let isActive = true

    async function syncTodosForView() {
      if (!isAuthenticated || activeCommandView === 'settings') {
        return
      }

      try {
        const params =
          activeCommandView === 'calendar'
            ? getTodoListParams('calendar', settings, calendarReferenceDate)
            : getTodoListParams(activeCommandView, settings)

        const response = await todoApi.list(params)

        if (!isActive) {
          return
        }

        setTodos(normalizeTodos(response.data))
      } catch (error) {
        if (!isActive) {
          return
        }

        if (isUnauthorizedError(error)) {
          resetAuthState('Your session expired. Please sign in again.')
          return
        }

        setFeedback({
          type: 'error',
          message: getErrorMessage(error, 'We could not sync mission view.'),
        })
      }
    }

    syncTodosForView()

    return () => {
      isActive = false
    }
  }, [activeCommandView, isAuthenticated, resetAuthState, settings, calendarReferenceDate])

  async function runAuthenticatedRequest(requestName, request, fallbackMessage, shouldResetOnUnauthorized = () => true) {
    setPendingRequest(requestName)

    try {
      const result = await request()
      setFeedback({ type: '', message: '' })
      return result
    } catch (error) {
      if (isUnauthorizedError(error)) {
        if (shouldResetOnUnauthorized(error)) {
          resetAuthState('Your session expired. Please sign in again.')
          return null
        }

        setFeedback({
          type: 'error',
          message: getErrorMessage(error, fallbackMessage),
        })
        return null
      }

      setFeedback({
        type: 'error',
        message: getErrorMessage(error, fallbackMessage),
      })
      return null
    } finally {
      setPendingRequest('')
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault()

    const requestName = authMode === 'login' ? 'login' : 'signup'
    const authRequest =
      authMode === 'login'
        ? authApi.login({ email: authForm.email, password: authForm.password })
        : authApi.signup(authForm)

    setPendingRequest(requestName)

    try {
      const authResponse = await authRequest
      persistToken(authResponse.data.token)
      const loginViewParams =
        settings.defaultView === 'calendar'
          ? getTodoListParams('calendar', settings, calendarReferenceDate)
          : getTodoListParams(settings.defaultView, settings)

      const todosResponse = await todoApi.list(loginViewParams)

      applyAuthenticatedSession(
        authResponse.data.token,
        authResponse.data.user,
        todosResponse.data,
        authMode === 'login' ? 'Docking sequence complete.' : 'Fleet registration successful.'
      )
    } catch (error) {
      clearPersistedToken()
      setFeedback({
        type: 'error',
        message: getErrorMessage(error, `We could not ${authMode === 'login' ? 'launch portal' : 'register to fleet'}.`),
      })
    } finally {
      setPendingRequest('')
    }
  }

  async function handleProfileSubmit(event) {
    event.preventDefault()

    const response = await runAuthenticatedRequest(
      'profile',
      () => authApi.updateMe(profileForm),
      'We could not update your coordinates.'
    )

    if (!response) {
      return
    }

    setCurrentUser(response.data)
    setProfileForm({ name: response.data.name, email: response.data.email })
    setFeedback({ type: 'success', message: 'Identity parameters updated.' })
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault()

    const response = await runAuthenticatedRequest(
      'password',
      () => authApi.updatePassword(passwordForm),
      'We could not calibrate your new keycode.',
      (error) => getErrorMessage(error) !== 'Current password is incorrect'
    )

    if (!response) {
      return
    }

    setCurrentUser(response.data)
    setPasswordForm(emptyPasswordForm)
    setFeedback({ type: 'success', message: 'Security keycode recalibrated.' })
  }

  async function handleCreateTodo(event) {
    event.preventDefault()

    if (!todoDueAt) {
      setFeedback({ type: 'error', message: 'A due date and time is required.' })
      return
    }

    const response = await runAuthenticatedRequest(
      'create-todo',
      () => todoApi.create({ title: todoTitle, dueAt: getDueAtPayload(todoDueAt) }),
      'Mission insertion failed.'
    )

    if (!response) {
      return
    }

    await loadTodosForView()
    setTodoTitle('')
    setTodoDueAt('')
    setFeedback({ type: 'success', message: 'Mission objective added.' })
  }

  async function handleToggleTodo(todoId, completed, dueAt) {
    const payload = { completed }

    if (dueAt) {
      payload.dueAt = dueAt
    }

    const response = await runAuthenticatedRequest(
      `toggle-${todoId}`,
      () => todoApi.update(todoId, payload),
      'Status sync failed.'
    )

    if (!response) {
      return
    }

    await loadTodosForView()
    setFeedback({ type: 'success', message: 'Mission status updated.' })
  }

  async function handleDeleteTodo(todoId) {
    const response = await runAuthenticatedRequest(
      `delete-${todoId}`,
      () => todoApi.remove(todoId),
      'We could not abort that mission.'
    )

    if (!response) {
      return
    }

    await loadTodosForView()
    setFeedback({ type: 'success', message: 'Mission objective aborted.' })
  }

  function handleSignOut() {
    clearPersistedToken()
    setSessionStatus('unauthenticated')
    setCurrentUser(null)
    setTodos([])
    setProfileForm({ name: '', email: '' })
    setPasswordForm(emptyPasswordForm)
    setAuthForm(emptyAuthForm)
    setAuthMode('login')
    setTodoTitle('')
    setTodoDueAt('')
    setActiveCommandView(settings.defaultView)
    setFeedback({ type: 'success', message: 'Disconnected from fleet.' })
  }

  return (
    <main className="app-shell">
      <section className="panel hero-panel">
        <p className="eyebrow">Todo list</p>
        <h1>Todo list</h1>
        <dl className="status-grid" aria-label="Application state overview">
          <div>
            <dt>서버</dt>
            <dd>{bootStatus}</dd>
          </div>
          <div>
            <dt>세션 상태</dt>
            <dd>{sessionStatus}</dd>
          </div>
          <div>
            <dt>Subspace</dt>
            <dd>{pendingRequest || 'clear'}</dd>
          </div>
        </dl>
        {feedback.message ? (
          <p className={`feedback feedback-${feedback.type || 'neutral'}`} role="status">
            {feedback.message}
          </p>
        ) : null}
      </section>

      {bootStatus === 'booting' ? (
        <section className="panel boot-panel">
          <h2>Initializing warp core...</h2>
          <p>Verifying clearance and securing orbital connection.</p>
        </section>
      ) : null}

      {bootStatus === 'ready' && !isAuthenticated ? (
        <section className="panel auth-panel">
          <div className="panel-header">
            <div>
              <p className="section-label">리스트 진입</p>
              <h2>{authMode === 'login' ? '로그인' : '계정 생성'}</h2>
            </div>
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                setAuthMode((current) => (current === 'login' ? 'signup' : 'login'))
                setAuthForm(emptyAuthForm)
                setFeedback({ type: '', message: '' })
              }}
              disabled={isBusy}
            >
              {authMode === 'login' ? 'Initialize New Account' : 'Log In'}
            </button>
          </div>

          <form className="stack" onSubmit={handleAuthSubmit}>
            {authMode === 'signup' ? (
              <label>
                <span>Name</span>
                <input
                  name="name"
                  value={authForm.name}
                  onChange={updateAuthField}
                  autoComplete="name"
                  disabled={isBusy}
                  required
                />
              </label>
            ) : null}

            <label>
              <span>{authMode === 'signup' ? 'Email' : 'Email'}</span>
              <input
                type="email"
                name="email"
                value={authForm.email}
                onChange={updateAuthField}
                autoComplete="email"
                disabled={isBusy}
                required
              />
            </label>

            <label>
              <span>{authMode === 'signup' ? 'Password' : 'Password'}</span>
              <input
                type="password"
                name="password"
                value={authForm.password}
                onChange={updateAuthField}
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                disabled={isBusy}
                required
              />
            </label>

            <button type="submit" className="primary-button" disabled={isBusy}>
              {pendingRequest === 'login' && authMode === 'login'
                ? 'Launching...'
                : pendingRequest === 'signup' && authMode === 'signup'
                  ? 'Registering...'
                  : authMode === 'login'
                    ? 'Launch'
                    : 'Join the Fleet'}
            </button>
          </form>
          {authMode === 'login' && (
            <p className="mono" style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text)', opacity: 0.5, fontSize: '0.75rem' }}>
              Systems Operational • Build v0.0.1-Alpha
            </p>
          )}
        </section>
      ) : null}

      {bootStatus === 'ready' && isAuthenticated ? (
        <section className="workspace">
          <section className="panel account-panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Identity</p>
                <h2>{currentUser?.name}</h2>
                <p className="mono" style={{color: 'var(--primary)'}}>★ {currentUser?.email}</p>
              </div>
              <button type="button" className="ghost-button" onClick={handleSignOut} disabled={isBusy}>
                Disengage
              </button>
            </div>

            <form className="stack" onSubmit={handleProfileSubmit}>
              <label>
                <span>User name</span>
                <input
                  name="name"
                  value={profileForm.name}
                  onChange={updateProfileField}
                  disabled={isBusy}
                  required
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  value={profileForm.email}
                  onChange={updateProfileField}
                  disabled={isBusy}
                  required
                />
              </label>
              <button type="submit" className="primary-button" disabled={isBusy}>
                {pendingRequest === 'profile' ? 'Syncing...' : 'Update Details'}
              </button>
            </form>

            <form className="stack" onSubmit={handlePasswordSubmit}>
              <label>
                <span>Current Password</span>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={updatePasswordField}
                  autoComplete="current-password"
                  disabled={isBusy}
                  required
                />
              </label>
              <label>
                <span>New Password</span>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={updatePasswordField}
                  autoComplete="new-password"
                  disabled={isBusy}
                  required
                />
              </label>
              <button type="submit" className="secondary-button" disabled={isBusy}>
                {pendingRequest === 'password' ? 'Encrypting...' : 'Change Keycode'}
              </button>
            </form>
          </section>

          <section className="panel todos-panel">
            <div className="command-strip" aria-label="Mission command strip">
              {commandStripItems.map((item) => {
                const viewKey = item === 'All Tasks'
                  ? 'all'
                  : item === 'Today'
                    ? 'today'
                    : item === 'Calendar'
                      ? 'calendar'
                      : 'settings'

                return (
                  <button
                    key={item}
                    type="button"
                    className={activeCommandView === viewKey ? 'command-pill is-active' : 'command-pill'}
                    onClick={() => setActiveCommandView(viewKey)}
                    aria-pressed={activeCommandView === viewKey}
                  >
                    {item}
                  </button>
                )
              })}
            </div>

            <div className="panel-header">
              <div>
                <p className="section-label">Main Mission Control</p>
                <h2>{activeCommandView === 'settings' ? 'Settings' : 'Command Center'}</h2>
                <p style={{fontSize: '0.9rem', color: 'var(--text)', marginTop: '0.25rem'}}>
                  {activeCommandView === 'settings'
                    ? 'Tune how task views load, filter, and persist in this browser.'
                    : activeCommandView === 'all'
                      ? 'Upcoming and unscheduled directives from today through your configured horizon.'
                      : activeCommandView === 'today'
                        ? 'Tasks due on the current local day.'
                        : 'Your current month mission calendar.'}
                </p>
              </div>
              <div className="todo-stats" aria-label="Todo statistics">
                <span>{todoStats.total} All Tasks</span>
                <span>{todoStats.today} Today</span>
                <span>{todoStats.completed} Cleared</span>
              </div>
            </div>

            {activeCommandView !== 'settings' ? (
              <form className="todo-entry" onSubmit={handleCreateTodo}>
                <input
                  type="text"
                  value={todoTitle}
                  onChange={(event) => setTodoTitle(event.target.value)}
                  placeholder="Task Directive..."
                  disabled={isBusy}
                  required
                />
                <input
                  type="datetime-local"
                  value={todoDueAt}
                  onChange={(event) => setTodoDueAt(event.target.value)}
                  disabled={isBusy}
                  aria-label="Due date and time"
                  required
                />
                <button type="submit" className="primary-button" disabled={isBusy}>
                  {pendingRequest === 'create-todo' ? 'Initializing...' : 'Deploy'}
                </button>
              </form>
            ) : null}

            {activeCommandView === 'settings' ? (
              <section className="settings-panel" aria-label="Task view settings">
                <div className="settings-grid">
                  <label>
                    <span>Horizon Days</span>
                    <input
                      type="number"
                      name="horizonDays"
                      min="1"
                      max="365"
                      value={settings.horizonDays}
                      onChange={updateSettingsField}
                      disabled={isBusy}
                    />
                  </label>

                  <label>
                    <span>Default View</span>
                    <select
                      name="defaultView"
                      value={settings.defaultView}
                      onChange={updateSettingsField}
                      disabled={isBusy}
                    >
                      <option value="all">All Tasks</option>
                      <option value="today">Today</option>
                      <option value="calendar">Calendar</option>
                    </select>
                  </label>
                </div>

                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    name="showCompleted"
                    checked={settings.showCompleted}
                    onChange={updateSettingsField}
                    disabled={isBusy}
                  />
                  <div>
                    <span>Show Completed Tasks</span>
                    <p>Hide cleared items from task views and calendar badges when disabled.</p>
                  </div>
                </label>

                <p className="settings-note mono">
                  Settings stay in this browser only and invalid stored values reset to safe defaults.
                </p>
              </section>
            ) : null}

            {activeCommandView !== 'calendar' && visibleTodos.length > 0 ? (
              <ul className="todo-list">
                {visibleTodos.map((todo, index) => renderTodoItem(todo, index))}
              </ul>
            ) : null}

            {activeCommandView === 'calendar' ? (
              <div className="calendar-container">
                <div className="calendar-toolbar">
                  <button 
                    type="button" 
                    className="ghost-button" 
                    onClick={() => setCalendarReferenceDate(new Date(calendarReferenceDate.getFullYear(), calendarReferenceDate.getMonth() - 1, 1))}
                    disabled={isBusy}
                  >
                    &larr; Prev
                  </button>
                  <h3 className="calendar-current-month">
                    {calendarReferenceDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h3>
                  <button 
                    type="button" 
                    className="ghost-button" 
                    onClick={() => setCalendarReferenceDate(new Date(calendarReferenceDate.getFullYear(), calendarReferenceDate.getMonth() + 1, 1))}
                    disabled={isBusy}
                  >
                    Next &rarr;
                  </button>
                </div>
                <div className="calendar-view">
                  <div className="calendar-header-row">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="calendar-header-cell">{day}</div>
                    ))}
                  </div>
                  <div className="calendar-grid">
                    {calendarMonthDays.map((day, index) => {
                      if (!day) return <div key={`empty-${index}`} className="calendar-cell empty" />
                      
                      const dayStart = getStartOfLocalDay(day)
                      const dayEnd = getEndOfLocalDay(day)
                      const dayTodos = visibleTodoPool.filter((todo) => todo.dueAt && isDueAtWithinRange(todo.dueAt, dayStart, dayEnd))
                      const isToday = dayStart.getTime() === todayStart.getTime()

                      return (
                        <div key={day.toISOString()} className={`calendar-cell ${isToday ? 'is-today' : ''}`}>
                          <div className="calendar-date">{day.getDate()}</div>
                          <div className="calendar-badges">
                            {dayTodos.map((todo) => (
                              <div key={todo._id} className={`calendar-badge ${todo.completed ? 'is-complete' : ''}`} title={todo.title}>
                                {todo.title}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            {activeCommandView === 'all' && unscheduledTodos.length > 0 ? (
              <section className="todo-subsection" aria-label="Unscheduled missions">
                <div className="todo-subsection-header">
                  <p className="section-label">Unscheduled</p>
                  <p className="todo-subsection-copy">Objectives without a due date remain docked here.</p>
                </div>
                <ul className="todo-list">
                  {unscheduledTodos.map((todo, index) => renderTodoItem(todo, visibleTodos.length + index))}
                </ul>
              </section>
            ) : null}

            {activeCommandView !== 'calendar' && activeCommandView !== 'settings' && visibleTodos.length === 0 && (activeCommandView === 'today' || unscheduledTodos.length === 0) ? (
              <p className="empty-state">
                {activeCommandView === 'today'
                  ? 'No missions scheduled for the current local day.'
                  : 'No active directives. Awaiting command input.'}
              </p>
            ) : null}
          </section>
        </section>
      ) : null}
    </main>
  )
}

export default App
