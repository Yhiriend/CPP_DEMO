import { Injectable, signal } from '@angular/core';

const AUTH_STORAGE_KEY = 'cpp.auth.isAuthenticated';

// Hardcoded until the real identity provider is wired up.
const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'admin';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _isAuthenticated = signal(sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true');
  readonly isAuthenticated = this._isAuthenticated.asReadonly();

  login(username: string, password: string): boolean {
    const success = username === VALID_USERNAME && password === VALID_PASSWORD;
    if (success) {
      this._isAuthenticated.set(true);
      sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
    }
    return success;
  }

  logout(): void {
    this._isAuthenticated.set(false);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  }
}
