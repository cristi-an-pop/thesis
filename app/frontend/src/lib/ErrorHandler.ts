export class AppError extends Error {
    constructor(message: string, public code: string = 'unknown') {
        super(message);
        this.name = 'AppError';
    }
}

let errorCallback: ((error: AppError) => void) | null = null;

export const setErrorCallback = (callback: (error: AppError) => void) => {
    errorCallback = callback;
};

export const handleError = (error: unknown, customMessage?: string): AppError => {
    let message = customMessage;
    let code = 'unknown';

    if (!customMessage) {
        if (error instanceof Error && 'code' in error && typeof error.code === 'string') {
            const errorCode = error.code;
            
            // Auth errors
            if (errorCode.startsWith('auth/')) {
                message = getAuthMessage(errorCode);
                code = errorCode;
            }
            // Other Firebase errors
            else if (errorCode === 'permission-denied') {
                message = 'Access denied';
                code = errorCode;
            }
            else if (errorCode === 'not-found') {
                message = 'Data not found';
                code = errorCode;
            }
        } else if (error instanceof Error) {
            message = error.message || 'Something went wrong';
            code = 'app/error';
        }
    }

    if (!message) {
        message = 'An unexpected error occurred';
    }

    const appError = new AppError(message, code);
    
    if (errorCallback) {
        errorCallback(appError);
    }
    
    return appError;
};

export const throwError = (error: unknown, customMessage?: string): never => {
    throw handleError(error, customMessage);
};

const getAuthMessage = (code: string): string => {
    const messages: Record<string, string> = {
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/email-already-in-use': 'Email already registered',
        'auth/weak-password': 'Password must be at least 6 characters',
        'auth/invalid-email': 'Invalid email address',
        'auth/too-many-requests': 'Too many attempts. Try again later',
    };
    return messages[code] || 'Authentication failed';
};
