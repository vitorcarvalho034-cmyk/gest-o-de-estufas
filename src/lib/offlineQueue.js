// Offline queue — saves records to localStorage when offline, syncs when back online

const ENTITIES = ['Colheita', 'Descarte', 'PrevisaoColheita'];
const key = (entity) => `offline_queue_${entity}`;

export function enqueue(entityName, data) {
  const queue = getQueue(entityName);
  queue.push({ ...data, _offlineId: `${Date.now()}_${Math.random()}` });
  localStorage.setItem(key(entityName), JSON.stringify(queue));
}

export function getQueue(entityName) {
  try { return JSON.parse(localStorage.getItem(key(entityName)) || '[]'); } catch { return []; }
}

export function removeFromQueue(entityName, offlineId) {
  const queue = getQueue(entityName).filter(i => i._offlineId !== offlineId);
  localStorage.setItem(key(entityName), JSON.stringify(queue));
}

export function getTotalPending() {
  return ENTITIES.reduce((sum, e) => sum + getQueue(e).length, 0);
}

export { ENTITIES };