import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type StatusBadgeVariant = 'normal' | 'pending' | 'success' | 'attention' | 'urgent' | 'emergency';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-status-badge',
  template: `<span [class]="'badge badge--' + variant()"><span class="dot" aria-hidden="true"></span><ng-content /></span>`,
  styles: `
    :host { display: inline-flex; max-width: 100%; }
    .badge { align-items: center; background: var(--color-surface-muted); border: 1px solid transparent; border-radius: var(--radius-pill); color: var(--color-text-muted); display: inline-flex; font-size: var(--font-size-caption); font-weight: 800; gap: .4rem; line-height: 1.2; max-width: 100%; min-height: 1.75rem; padding: .25rem .65rem; }
    .dot { background: currentColor; border-radius: 50%; flex: 0 0 .45rem; height: .45rem; width: .45rem; }
    .badge--pending { background: var(--color-info-soft); color: var(--color-info); }
    .badge--success { background: var(--color-success-soft); color: var(--color-success); }
    .badge--attention { background: var(--color-warning-soft); color: var(--color-warning); }
    .badge--urgent { background: var(--color-alert-soft); color: var(--color-alert-hover); }
    .badge--emergency { background: var(--color-emergency); color: var(--color-on-primary); }
  `,
})
export class StatusBadgeComponent {
  readonly variant = input<StatusBadgeVariant>('normal');
}
