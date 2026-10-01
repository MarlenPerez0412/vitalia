import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WorkspaceLayoutComponent, WorkspaceNavItem } from './workspace-layout/workspace-layout.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, WorkspaceLayoutComponent],
  selector: 'app-health-layout',
  template: `<app-workspace-layout sectionName="Salud" homePath="/health" [navItems]="navItems"><router-outlet /></app-workspace-layout>`,
})
export class HealthLayoutComponent {
  protected readonly navItems: readonly WorkspaceNavItem[] = [
    { label: 'Dashboard', path: '/health', icon: 'home' },
    { label: 'Pacientes', path: '/health/patients', icon: 'users' },
    { label: 'Seguimiento', path: '/health/follow-up', icon: 'clipboard' },
    { label: 'Medicamentos', path: '/health/medications', icon: 'pill' },
    { label: 'Bienestar', path: '/health/wellbeing', icon: 'heart' },
    { label: 'Cognición', path: '/health/cognition', icon: 'brain' },
    { label: 'Tendencias', path: '/health/trends', icon: 'chart' },
    { label: 'Alertas relevantes', path: '/health/alerts', icon: 'bell' },
    { label: 'Reportes', path: '/health/reports', icon: 'activity' },
    { label: 'Historial', path: '/health/history', icon: 'clipboard' },
    { label: 'Perfil', path: '/health/profile', icon: 'user' },
  ];
}
