import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, TemplateRef } from '@angular/core';

export interface ResponsiveTableColumn {
  key: string;
  label: string;
  align?: 'start' | 'center' | 'end';
}

export type ResponsiveTableRow = Readonly<Record<string, string | number | boolean | null | undefined>>;

/** Contexto de `cellTemplate`: `let-row`, `let-column="column"`, `let-value="value"`. */
export interface ResponsiveTableCellContext {
  $implicit: ResponsiveTableRow;
  column: ResponsiveTableColumn;
  value: ResponsiveTableRow[string];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  selector: 'app-responsive-table',
  template: `
    <div class="table-shell">
      <table>
        <caption>{{ caption() }}</caption>
        <thead><tr>@for (column of columns(); track column.key) { <th scope="col" [class]="'align-' + (column.align ?? 'start')">{{ column.label }}</th> }</tr></thead>
        <tbody>
          @for (row of rows(); track $index) {
            <tr>@for (column of columns(); track column.key) { <td [attr.data-label]="column.label" [class]="'align-' + (column.align ?? 'start')">@if (cellTemplate(); as template) { <ng-container *ngTemplateOutlet="template; context: { $implicit: row, column: column, value: row[column.key] }" /> } @else { {{ row[column.key] ?? '—' }} }</td> }</tr>
          } @empty {
            <tr class="empty"><td [attr.colspan]="columns().length">{{ emptyMessage() }}</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styleUrl: './responsive-table.component.scss',
})
export class ResponsiveTableComponent {
  readonly caption = input.required<string>();
  readonly columns = input.required<readonly ResponsiveTableColumn[]>();
  readonly rows = input.required<readonly ResponsiveTableRow[]>();
  readonly emptyMessage = input('No hay información disponible.');
  /** Plantilla opcional por celda; si no existe se muestra el valor como texto. */
  readonly cellTemplate = input<TemplateRef<ResponsiveTableCellContext> | null>(null);
}
