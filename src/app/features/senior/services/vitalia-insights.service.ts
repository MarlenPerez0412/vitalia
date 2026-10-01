import { computed, inject, Injectable } from '@angular/core';
import { DEMO_SENIOR_ID, MockDatabaseService } from '../../../core/services/mock-database.service';
import { PreventFactor, SignatureMetric } from '../models/senior.models';

@Injectable({ providedIn: 'root' })
export class VitaliaInsightsService {
  private readonly database = inject(MockDatabaseService);
  readonly medicationAdherence = computed(() => {
    const logs = this.database.snapshot().medicationIntakes.filter((item) => item.seniorId === DEMO_SENIOR_ID && item.status !== 'PENDING');
    return logs.length ? Math.round(logs.filter((item) => item.status === 'TAKEN').length / logs.length * 100) : 100;
  });
  readonly metrics = computed<readonly SignatureMetric[]>(() => {
    const db = this.database.snapshot();
    const habitLogs = db.habitCompletions.filter((item) => item.seniorId === DEMO_SENIOR_ID);
    const habitRate = habitLogs.length ? Math.round(habitLogs.filter((item) => item.status === 'COMPLETED').length / habitLogs.length * 100) : 75;
    const checkins = db.wellbeingCheckins.filter((item) => item.seniorId === DEMO_SENIOR_ID);
    const wellbeing = checkins.length ? Math.round(checkins.reduce((sum, item) => sum + item.mood, 0) / checkins.length * 20) : 78;
    const cognition = Math.min(100, 70 + db.cognitiveSessions.filter((item) => item.seniorId === DEMO_SENIOR_ID).length * 5);
    return [
      { label: 'Actividad', value: habitRate, detail: 'Hábitos completados', tone: habitRate >= 70 ? 'success' : 'attention' },
      { label: 'Medicamentos', value: this.medicationAdherence(), detail: 'Tomas registradas', tone: this.medicationAdherence() >= 80 ? 'success' : 'attention' },
      { label: 'Bienestar', value: wellbeing, detail: 'Según tus check-ins', tone: wellbeing >= 65 ? 'normal' : 'attention' },
      { label: 'Cognición', value: cognition, detail: 'Actividades recientes', tone: 'success' },
      { label: 'Interacción', value: 80, detail: 'Red de apoyo activa', tone: 'normal' },
    ];
  });
  readonly index = computed(() => Math.round(this.metrics().reduce((sum, item) => sum + item.value, 0) / this.metrics().length));
  readonly preventFactors = computed<readonly PreventFactor[]>(() => {
    const skipped = this.database.snapshot().medicationIntakes.filter((item) => item.seniorId === DEMO_SENIOR_ID && item.status === 'SKIPPED').length;
    const low = this.database.snapshot().wellbeingCheckins.filter((item) => item.seniorId === DEMO_SENIOR_ID && item.mood <= 2).length;
    const activity = this.metrics().find((item) => item.label === 'Actividad')?.value ?? 100;
    return [
      { label: 'Actividad', value: activity < 72 ? '↓ 28%' : 'Estable', detail: activity < 72 ? 'Menor que tu rutina habitual' : 'Dentro de tu rutina habitual', severity: 'attention' },
      { label: 'Bienestar', value: `${low} días`, detail: low ? 'Registro por debajo de lo habitual' : 'Sin cambios relevantes', severity: 'attention' },
      { label: 'Medicamentos', value: `${skipped} omitido${skipped === 1 ? '' : 's'}`, detail: 'Durante el historial disponible', severity: skipped ? 'urgent' : 'attention' },
    ];
  });
}
