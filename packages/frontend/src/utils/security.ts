// XSS Protection
export const sanitizeHtml = (input: string): string => {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
};

// Input validation
export const validateInput = {
  taskTitle: (title: string): boolean => {
    return title.length >= 1 && title.length <= 200 && !/[<>]/.test(title);
  },

  noteContent: (content: string): boolean => {
    return content.length >= 1 && content.length <= 5000;
  },

  searchQuery: (query: string): boolean => {
    return query.length <= 100 && !/[<>]/.test(query);
  },
};

// Token management
export const tokenManager = {
  getAccessToken: (): string | null => {
    return localStorage.getItem('accessToken');
  },

  setAccessToken: (token: string): void => {
    localStorage.setItem('accessToken', token);
  },

  removeTokens: (): void => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  isTokenExpired: (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true;
    }
  },
};

// Content Security Policy
export const setupCSP = (): void => {
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' " + (process.env.REACT_APP_API_URL || 'http://localhost:3001'),
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  document.head.appendChild(meta);
};
