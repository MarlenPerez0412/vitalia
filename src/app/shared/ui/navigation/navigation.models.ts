import { VitaliaIconName } from '../icon/vitalia-icon.component';

export interface NavigationItem {
  label: string;
  path: string;
  icon: VitaliaIconName;
  disabled?: boolean;
}
