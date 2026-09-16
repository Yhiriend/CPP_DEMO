import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideArrowRight, LucideEye, LucideEyeOff, LucideLock, LucideShieldCheck } from '@lucide/angular';

import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, LucideArrowRight, LucideEye, LucideEyeOff, LucideLock, LucideShieldCheck],
  templateUrl: './login.html',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  protected username = '';
  protected password = '';
  protected showPassword = false;
  protected errorMessage = '';

  protected submit(): void {
    const success = this.authService.login(this.username.trim(), this.password);

    if (!success) {
      this.errorMessage = 'Usuario o contraseña incorrectos.';
      return;
    }

    this.errorMessage = '';
    this.router.navigateByUrl('/dashboard');
  }

  protected togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  protected forgotPassword(): void {
    this.toastService.show('La recuperación de contraseña estará disponible próximamente.');
  }
}
