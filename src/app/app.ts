import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ToastsComponent } from './shared/ui/toasts/toasts.component';
import { ConfirmHostComponent } from './shared/ui/confirm-host/confirm-host.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastsComponent, ConfirmHostComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
