export class WingbitsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WingbitsError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class WingbitsApiError extends WingbitsError {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'WingbitsApiError';
  }
}

export class WingbitsNetworkError extends WingbitsError {
  constructor(
    message: string,
    public readonly cause: unknown,
  ) {
    super(message);
    this.name = 'WingbitsNetworkError';
  }
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export class WingbitsValidationError extends WingbitsError {
  constructor(
    message: string,
    public readonly issues: ValidationIssue[],
  ) {
    super(message);
    this.name = 'WingbitsValidationError';
  }
}
