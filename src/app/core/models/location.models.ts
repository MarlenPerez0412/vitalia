export type LocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable' | 'error';

export interface VitaliaLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: string;
  source: 'REAL' | 'DEMO';
}
