import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AppButtonComponent } from '../button/app-button.component';
import { AlertCardComponent } from '../cards/alert-card.component';
import { CognitiveActivityCardComponent } from '../cards/cognitive-activity-card.component';
import { ContactCardComponent } from '../cards/contact-card.component';
import { InsightCardComponent } from '../cards/insight-card.component';
import { MedicationCardComponent } from '../cards/medication-card.component';
import { MetricCardComponent } from '../cards/metric-card.component';
import { ModuleCardComponent } from '../cards/module-card.component';
import { SeniorCardComponent } from '../cards/senior-card.component';
import { UserCardComponent } from '../cards/user-card.component';
import { EmergencyButtonComponent } from '../emergency-button/emergency-button.component';
import { NavigationItem } from '../navigation/navigation.models';
import { SeniorBottomNavigationComponent } from '../navigation/senior-bottom-navigation.component';
import { TopbarComponent } from '../navigation/topbar.component';
import { PageHeaderComponent } from '../page-header/page-header.component';
import { ResponsiveTableColumn, ResponsiveTableComponent, ResponsiveTableRow } from '../responsive-table/responsive-table.component';
import { EmptyStateComponent } from '../states/empty-state.component';
import { ErrorStateComponent } from '../states/error-state.component';
import { LoadingStateComponent } from '../states/loading-state.component';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AlertCardComponent, AppButtonComponent, CognitiveActivityCardComponent, ContactCardComponent,
    EmergencyButtonComponent, EmptyStateComponent, ErrorStateComponent, InsightCardComponent,
    LoadingStateComponent, MedicationCardComponent, MetricCardComponent, ModuleCardComponent,
    PageHeaderComponent, ResponsiveTableComponent, SeniorBottomNavigationComponent, SeniorCardComponent,
    StatusBadgeComponent, TopbarComponent, UserCardComponent,
  ],
  selector: 'app-design-showcase',
  templateUrl: './design-showcase.component.html',
  styleUrl: './design-showcase.component.scss',
})
export class DesignShowcaseComponent {
  protected readonly navItems: readonly NavigationItem[] = [
    { label: 'Inicio', path: '/senior', icon: 'home' },
    { label: 'Bienestar', path: '/senior', icon: 'heart' },
    { label: 'Medicinas', path: '/senior', icon: 'pill' },
    { label: 'Actividad', path: '/senior', icon: 'brain' },
  ];
  protected readonly columns: readonly ResponsiveTableColumn[] = [
    { key: 'name', label: 'Persona' }, { key: 'role', label: 'Rol' }, { key: 'status', label: 'Estado', align: 'end' },
  ];
  protected readonly rows: readonly ResponsiveTableRow[] = [
    { name: 'Elena García', role: 'Persona mayor', status: 'Activa' },
    { name: 'Mariana García', role: 'Cuidadora', status: 'Activa' },
  ];
}
