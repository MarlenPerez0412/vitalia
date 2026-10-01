import { TestBed } from '@angular/core/testing';
import { PhoneService } from '../../../core/services/phone.service';
import { ContactsService } from './contacts.service';

describe('ContactsService and PhoneService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('exposes the primary emergency contact from the central mock', () => {
    expect(TestBed.inject(ContactsService).primaryEmergencyContact()).toMatchObject({ name: 'Ana Hernández', relationship: 'Hija', primaryEmergency: true });
  });

  it('finds contacts by spoken relationship', () => {
    const contacts = TestBed.inject(ContactsService);
    expect(contacts.findByRelationship('hija')?.name).toBe('Ana Hernández');
    expect(contacts.findByRelationship('mi hija')?.name).toBe('Ana Hernández');
    expect(contacts.findByRelationship('Hijo')?.name).toBe('Luis Hernández');
    expect(contacts.findByRelationship('esposo')).toBeNull();
  });

  it('builds tel: links without calling anyone', () => {
    const phone = TestBed.inject(PhoneService);
    expect(phone.telHref('+52 55 0000 0000')).toBe('tel:+525500000000');
    expect(phone.telHref('55 0000 0000')).toBe('tel:+525500000000');
  });

  it('copies the number with the clipboard API', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    expect(await TestBed.inject(PhoneService).copy('+52 55 0000 0000')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('+52 55 0000 0000');
  });
});
