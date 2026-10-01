import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WorkspaceLayoutComponent, WorkspaceNavItem } from './workspace-layout/workspace-layout.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, WorkspaceLayoutComponent],
  selector: 'app-care-layout',
  template: `<app-workspace-layout sectionName="Cuidado" homePath="/care" [navItems]="navItems"><router-outlet /></app-workspace-layout>`,
})
export class CareLayoutComponent {
  protected readonly navItems: readonly WorkspaceNavItem[] = [
    { label: 'Dashboard', path: '/care', icon: 'home' },
    { label: 'Personas a mi cuidado', path: '/care/people', icon: 'users' },
    { label: 'Medicamentos', path: '/care/medications', icon: 'pill' },
    { label: 'Bienestar', path: '/care/wellbeing', icon: 'heart' },
    { label: 'Actividad', path: '/care/activity', icon: 'activity' },
    { label: 'Alertas', path: '/care/alerts', icon: 'bell' },
    { label: 'Emergencias', path: '/care/emergencies', icon: 'emergency' },
    { label: 'Ubicación autorizada', path: '/care/location', icon: 'map-pin' },
    { label: 'Reportes', path: '/care/reports', icon: 'chart' },
    { label: 'Mensajes', path: '/care/messages', icon: 'message' },
    { label: 'Perfil', path: '/care/profile', icon: 'user' },
  ];
}
