import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type VitaliaIconName =
  | 'activity' | 'alert' | 'bell' | 'brain' | 'check' | 'chevron-left' | 'chevron-right'
  | 'close' | 'emergency' | 'heart' | 'home' | 'logout' | 'menu' | 'microphone'
  | 'hand' | 'pill' | 'phone' | 'shield' | 'sparkles' | 'user' | 'users'
  | 'wallet' | 'play' | 'settings' | 'map-pin' | 'chart' | 'message' | 'clipboard' | 'lock' | 'send';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-vitalia-icon',
  host: { '[style.--icon-size.px]': 'size()' },
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      [attr.aria-hidden]="label() ? null : true" [attr.aria-label]="label() || null" [attr.role]="label() ? 'img' : null">
      @switch (name()) {
        @case ('activity') { <path d="M3 12h4l2-6 4 12 2-6h6" /> }
        @case ('alert') { <path d="M12 3 2.7 20h18.6L12 3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /> }
        @case ('bell') { <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /> }
        @case ('brain') { <path d="M9.5 4.5A3 3 0 0 0 4 6v1.2A3.5 3.5 0 0 0 5 14v1a3 3 0 0 0 4.5 2.6" /><path d="M14.5 4.5A3 3 0 0 1 20 6v1.2a3.5 3.5 0 0 1-1 6.8v1a3 3 0 0 1-4.5 2.6" /><path d="M12 3v18M8 9h4M12 14h4" /> }
        @case ('check') { <path d="m5 12 4 4L19 6" /> }
        @case ('chevron-left') { <path d="m15 18-6-6 6-6" /> }
        @case ('chevron-right') { <path d="m9 18 6-6-6-6" /> }
        @case ('close') { <path d="m6 6 12 12M18 6 6 18" /> }
        @case ('emergency') { <path d="M12 3v18M3 12h18" /> }
        @case ('heart') { <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.7-7.5 1.1-1.1a5.5 5.5 0 0 0 0-7.8Z" /> }
        @case ('hand') { <path d="M7 11V5a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-6a1.5 1.5 0 0 1 3 0v7-4a1.5 1.5 0 0 1 3 0v6c0 5-3 8-7 8h-1c-3.5 0-6-2.2-7.2-5.4L3.5 13A1.8 1.8 0 0 1 7 11Z" /> }
        @case ('home') { <path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /> }
        @case ('logout') { <path d="M10 17l5-5-5-5M15 12H3M21 19V5a2 2 0 0 0-2-2h-6" /> }
        @case ('menu') { <path d="M4 7h16M4 12h16M4 17h16" /> }
        @case ('microphone') { <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" /> }
        @case ('pill') { <path d="M10.5 4.5a4.2 4.2 0 0 1 6 6l-6 6a4.2 4.2 0 0 1-6-6l6-6Z" /><path d="m8 7 6 6" /> }
        @case ('phone') { <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z" /> }
        @case ('shield') { <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /> }
        @case ('sparkles') { <path d="m12 3-1 3-3 1 3 1 1 3 1-3 3-1-3-1-1-3ZM5 14l-1 2-2 1 2 1 1 2 1-2 2-1-2-1-1-2ZM18 13l-1.5 3.5L13 18l3.5 1.5L18 23l1.5-3.5L23 18l-3.5-1.5L18 13Z" /> }
        @case ('user') { <circle cx="12" cy="8" r="4" /><path d="M4 22a8 8 0 0 1 16 0" /> }
        @case ('wallet') { <path d="M3 7h15a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7Z" /><path d="M3 7V6a2 2 0 0 1 2-2h11" /><path d="M16 14h2" /> }
        @case ('play') { <circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4V8Z" /> }
        @case ('settings') { <path d="M4 6h10M4 12h4M12 12h8M4 18h12" /><circle cx="17" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="19" cy="18" r="2" /> }
        @case ('map-pin') { <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /> }
        @case ('chart') { <path d="M4 20V11M10 20V4M16 20v-7M21 20H3" /> }
        @case ('message') { <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /> }
        @case ('send') { <path d="m22 2-7 20-4-9-9-4 20-7Z" /><path d="M22 2 11 13" /> }
        @case ('clipboard') { <rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9 4h6v3H9zM9 12h6M9 16h4" /> }
        @case ('lock') { <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /> }
        @case ('users') { <circle cx="9" cy="8" r="3" /><path d="M3 21a6 6 0 0 1 12 0M16 4a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5" /> }
      }
    </svg>
  `,
  styles: `
    :host { display: inline-flex; flex: 0 0 auto; height: var(--icon-size); width: var(--icon-size); }
    svg { height: 100%; width: 100%; }
  `,
})
export class VitaliaIconComponent {
  readonly name = input.required<VitaliaIconName>();
  readonly size = input(24);
  readonly label = input('');
}
