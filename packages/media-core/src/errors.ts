/**
 * Typed error hierarchy for the Pexels client.
 * Every network/API failure surfaces as a subclass of `PexelsError`.
 */

export interface PexelsErrorOptions {
  status?: number;
  code?: string;
  url?: string;
  cause?: unknown;
}

export class PexelsError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly url?: string;

  constructor(message: string, options: PexelsErrorOptions = {}) {
    super(message);
    this.name = 'PexelsError';
    this.status = options.status;
    this.code = options.code;
    this.url = options.url;
  }
}

export class PexelsAuthenticationError extends PexelsError {
  constructor(message = 'Invalid or missing Pexels API key.', options: PexelsErrorOptions = {}) {
    super(message, { ...options, status: options.status ?? 401, code: 'authentication_error' });
    this.name = 'PexelsAuthenticationError';
  }
}

export class PexelsRateLimitError extends PexelsError {
  constructor(
    message = 'Pexels rate limit exceeded. Retry later.',
    options: PexelsErrorOptions = {},
  ) {
    super(message, { ...options, status: options.status ?? 429, code: 'rate_limit_exceeded' });
    this.name = 'PexelsRateLimitError';
  }
}

export class PexelsNotFoundError extends PexelsError {
  constructor(message = 'Resource not found on Pexels.', options: PexelsErrorOptions = {}) {
    super(message, { ...options, status: options.status ?? 404, code: 'not_found' });
    this.name = 'PexelsNotFoundError';
  }
}

export class PexelsApiError extends PexelsError {
  constructor(message: string, options: PexelsErrorOptions = {}) {
    super(message, options);
    this.name = 'PexelsApiError';
  }
}

export class PexelsClientError extends PexelsError {
  constructor(message: string, options: PexelsErrorOptions = {}) {
    super(message, { ...options, code: options.code ?? 'client_error' });
    this.name = 'PexelsClientError';
  }
}

/** Maps an HTTP status to the most specific error type. */
export function errorFromStatus(status: number, url: string, message?: string): PexelsError {
  switch (status) {
    case 400:
      return new PexelsApiError(message ?? 'Bad request.', { status, url });
    case 401:
      return new PexelsAuthenticationError(message, { status, url });
    case 403:
      return new PexelsApiError(message ?? 'Forbidden.', { status, url });
    case 404:
      return new PexelsNotFoundError(message, { status, url });
    case 429:
      return new PexelsRateLimitError(message, { status, url });
    default:
      return new PexelsApiError(message ?? `Pexels API error (${status}).`, { status, url });
  }
}
