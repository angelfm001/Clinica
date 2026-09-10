import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/ui/icon/icon.component';

interface DemoUser { user: string; label: string; }

/** Pantalla pública de autenticación contra MedicalAppointments.Security. */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly errorMsg = signal<string | null>(null);

  protected readonly demoUsers: DemoUser[] = [
    { user: 'amartinez', label: 'Recepción' },
    { user: 'lmartinez', label: 'Médico' },
    { user: 'admin', label: 'Administrador' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    nombreUsuario: ['', [Validators.required]],
    contrasena: ['', [Validators.required]],
  });

  public togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  protected fillDemo(user: string): void {
    this.form.patchValue({ nombreUsuario: user, contrasena: 'demo1234' });
    this.errorMsg.set(null);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMsg.set(null);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.toast.success(`Bienvenido(a), ${res.usuario.nombreCompleto}.`);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(returnUrl && returnUrl !== '/login' ? returnUrl : '/inicio');
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err?.error?.detail ?? 'Usuario o contraseña incorrectos.');
      },
    });
  }
}
