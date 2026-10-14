// Gate helpers shared by the gate console, the Gates page and the pickers. No React here, so the
// choice logic is easy to test.

export const KINDS = [
  { flag: 'allowVisitors', label: 'Visitors', word: 'visitors' },
  { flag: 'allowVehicles', label: 'Vehicles', word: 'vehicles' },
  { flag: 'allowStaff', label: 'Staff', word: 'staff' },
  { flag: 'allowDeliveries', label: 'Deliveries', word: 'deliveries' },
];

const list = (words) => (words.length <= 1 ? words[0] || '' : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`);

// Plain-English summary, e.g. "Only staff and deliveries" or "Takes everyone: visitors, vehicles, staff and deliveries".
export function describeGate(gate) {
  if (!gate) return '';
  const allowed = KINDS.filter((k) => gate[k.flag] && !(k.flag === 'allowVehicles' && gate.isPedestrianOnly)).map((k) => k.word);
  const foot = gate.isPedestrianOnly ? ', on foot only' : '';
  if (!allowed.length) return `Takes nothing${foot}`;
  if (allowed.length === KINDS.length) return `Takes everyone: ${list(allowed)}${foot}`;
  return `Only ${list(allowed)}${foot}`;
}

// What the guard is about to log, and whether this gate takes it.
//   kind: 'visitors' | 'vehicles' | 'staff' | 'deliveries'
export function gateTakes(gate, kind) {
  if (!gate) return true;
  const k = KINDS.find((x) => x.word === kind);
  if (!k) return true;
  if (kind === 'vehicles' && gate.isPedestrianOnly) return false;
  return gate[k.flag] !== false;
}

// Which gate the console should use without asking:
//   one open gate → that one; the gate the guard is on duty at → that; the gate remembered on this
//   device → that; otherwise null (ask the guard).
export function pickGate({ gates = [], postGateId, rememberedId } = {}) {
  const open = gates.filter((g) => g.active !== false);
  if (!open.length) return { gate: null, reason: null };
  if (open.length === 1) return { gate: open[0], reason: 'single' };
  const find = (id) => (id ? open.find((g) => g._id === id) : null);
  if (find(postGateId)) return { gate: find(postGateId), reason: 'duty' };
  if (find(rememberedId)) return { gate: find(rememberedId), reason: 'remembered' };
  return { gate: null, reason: null };
}

// ---- per-device memory (localStorage can be unavailable: private windows, blocked storage) ----
const currentKey = (societyId) => `colonyhub.gate.current.${societyId}`;
const listKey = (societyId) => `colonyhub.gate.list.${societyId}`;

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key, value) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or blocked: the choice simply is not remembered
  }
}

export const rememberedGate = (societyId) => readJson(currentKey(societyId), null);
export const rememberGate = (societyId, gate) => writeJson(currentKey(societyId), gate ? { _id: gate._id, name: gate.name, code: gate.code } : null);
// The gate list is kept too, so the console still knows the gates when it opens offline.
export const cachedGates = (societyId) => readJson(listKey(societyId), []);
export const cacheGates = (societyId, gates) => writeJson(listKey(societyId), gates);
