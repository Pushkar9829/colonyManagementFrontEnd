import { beforeEach, describe, expect, it } from 'vitest';
import { cacheGates, cachedGates, describeGate, gateTakes, pickGate, rememberGate, rememberedGate } from './gateRules';
import { toSyncOp } from '../gate/offlineQueue';

const main = { _id: 'g1', name: 'Main gate', code: 'MAIN', allowVisitors: true, allowVehicles: true, allowStaff: true, allowDeliveries: true, isPedestrianOnly: false, active: true };
const service = { _id: 'g2', name: 'Service gate', code: 'SVC', allowVisitors: false, allowVehicles: false, allowStaff: true, allowDeliveries: true, isPedestrianOnly: false, active: true };
const foot = { _id: 'g3', name: 'Pedestrian gate', code: 'PED', allowVisitors: true, allowVehicles: true, allowStaff: false, allowDeliveries: false, isPedestrianOnly: true, active: true };
const closed = { ...service, _id: 'g4', name: 'Old gate', active: false };

describe('pickGate', () => {
  it('selects the only open gate silently', () => {
    expect(pickGate({ gates: [main] })).toEqual({ gate: main, reason: 'single' });
    // closed gates do not count
    expect(pickGate({ gates: [main, closed], rememberedId: 'g4' })).toEqual({ gate: main, reason: 'single' });
  });

  it('uses the gate the guard is on duty at, then the gate remembered on this device', () => {
    expect(pickGate({ gates: [main, service], postGateId: 'g2', rememberedId: 'g1' })).toEqual({ gate: service, reason: 'duty' });
    expect(pickGate({ gates: [main, service], rememberedId: 'g2' })).toEqual({ gate: service, reason: 'remembered' });
  });

  it('asks when nothing decides it, or the remembered gate is gone', () => {
    expect(pickGate({ gates: [main, service] }).gate).toBeNull();
    expect(pickGate({ gates: [main, service], rememberedId: 'g4', postGateId: 'gone' }).gate).toBeNull();
    expect(pickGate({ gates: [] }).gate).toBeNull();
  });
});

describe('remembered gate (per device)', () => {
  beforeEach(() => localStorage.clear());

  it('is stored per society', () => {
    expect(rememberedGate('s1')).toBeNull();
    rememberGate('s1', service);
    expect(rememberedGate('s1')).toEqual({ _id: 'g2', name: 'Service gate', code: 'SVC' });
    expect(rememberedGate('s2')).toBeNull();
    rememberGate('s1', null);
    expect(rememberedGate('s1')).toBeNull();
  });

  it('keeps the gate list for offline use and survives broken storage', () => {
    cacheGates('s1', [main, service]);
    expect(cachedGates('s1').map((g) => g.name)).toEqual(['Main gate', 'Service gate']);
    localStorage.setItem('colonyhub.gate.current.s1', '{not json');
    expect(rememberedGate('s1')).toBeNull();
  });
});

describe('gate rules in plain English', () => {
  it('describes what a gate takes', () => {
    expect(describeGate(service)).toBe('Only staff and deliveries');
    expect(describeGate(main)).toBe('Takes everyone: visitors, vehicles, staff and deliveries');
    expect(describeGate(foot)).toBe('Only visitors, on foot only');
  });

  it('knows what can be logged at a gate', () => {
    expect(gateTakes(service, 'visitors')).toBe(false);
    expect(gateTakes(service, 'deliveries')).toBe(true);
    expect(gateTakes(foot, 'vehicles')).toBe(false);
    expect(gateTakes(null, 'visitors')).toBe(true);
  });
});

describe('offline queue payload', () => {
  it('carries the gate of each op but not the device-only label', () => {
    const op = { key: 'k1', kind: 'entry', occurredAt: '2026-10-14T10:00:00.000Z', data: { name: 'A' }, label: 'A → A-101', status: 'queued', gateId: 'g2', gateName: 'Service gate' };
    expect(toSyncOp(op)).toEqual({ key: 'k1', kind: 'entry', occurredAt: '2026-10-14T10:00:00.000Z', data: { name: 'A' }, gateId: 'g2' });
    expect(toSyncOp({ ...op, gateId: undefined })).not.toHaveProperty('gateId');
  });
});
