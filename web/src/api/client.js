/* Thin fetch wrapper. Every call is same-origin and carries the session cookie,
 * so there is no token to juggle in the client. */

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message ?? code ?? `HTTP ${status}`);
    this.status = status;
    this.code = code;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (cause) {
    // Network-level failure: the API process isn't reachable at all.
    throw new ApiError(0, 'offline', 'Could not reach the Pulse API.');
  }

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ApiError(response.status, payload?.error, payload?.error);
  }
  return payload;
}

export const api = {
  demoAccounts: () => request('/demo-accounts'),
  me: () => request('/auth/me'),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),

  bootstrap: () => request('/bootstrap'),
  days: (days) => request(`/days?days=${days}`),
  overview: () => request('/overview'),
  insights: () => request('/insights'),

  addWater: (ml, date) => request('/water', { method: 'POST', body: { ml, date } }),
  addMeal: (meal) => request('/meals', { method: 'POST', body: meal }),
  deleteMeal: (id) => request(`/meals/${id}`, { method: 'DELETE' }),
  addWorkout: (workout) => request('/workouts', { method: 'POST', body: workout }),
  deleteWorkout: (id) => request(`/workouts/${id}`, { method: 'DELETE' }),

  resetDemo: () => request('/demo/reset', { method: 'POST' }),
  setGoals: (patch) => request('/goals', { method: 'PUT', body: patch }),
  setPreferences: (patch) => request('/preferences', { method: 'PUT', body: patch }),
};
