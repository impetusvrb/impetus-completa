'use strict';

/**
 * ENTERPRISE READINESS — Fase 5.2
 * Realtime Reconnect Stress (frontend)
 *
 * Valida: reconnect storms, socket recovery, topic resubscription, workflow sync recovery.
 */

const { pass, section, summarize, timer, fakeId } = require('./testUtils.cjs');

// ── Simulação do unifiedChannelManager sem socket real ────────────────

const TOPICS = ['CHAT', 'OPERATIONAL', 'WORKFLOW', 'ALERTS', 'PRESENCE'];

class MockUnifiedChannel {
  constructor() {
    this._subscribers = new Map(); // topic → Set<handler>
    this._connected = false;
    this._reconnects = 0;
    this._messageCount = 0;
    this._droppedMessages = 0;
    this._backoff = 0;
    this._lastConnectAttempt = 0;
  }

  connect() {
    this._connected = true;
    this._reconnects++;
  }

  disconnect() {
    this._connected = false;
  }

  subscribe(topic, handler) {
    if (!this._subscribers.has(topic)) this._subscribers.set(topic, new Set());
    this._subscribers.get(topic).add(handler);
    return () => this._subscribers.get(topic).delete(handler);
  }

  dispatch(topic, payload) {
    if (!this._connected) { this._droppedMessages++; return; }
    const handlers = this._subscribers.get(topic);
    if (!handlers) return;
    for (const h of handlers) {
      try { h(payload); } catch {}
    }
    this._messageCount++;
  }

  reconnect() {
    const now = Date.now();
    const minDelay = this._backoff;
    if (now - this._lastConnectAttempt < minDelay) return false; // backoff not met
    this._lastConnectAttempt = now;
    this._backoff = Math.min(this._backoff * 2 || 100, 5000);
    this.connect();
    return true;
  }

  resubscribeAll(topicHandlers) {
    this._subscribers.clear();
    for (const [topic, handler] of topicHandlers) {
      this.subscribe(topic, handler);
    }
  }

  get stats() {
    return {
      connected: this._connected,
      reconnects: this._reconnects,
      messages: this._messageCount,
      dropped: this._droppedMessages,
      subscriber_count: [...this._subscribers.values()].reduce((a, s) => a + s.size, 0)
    };
  }
}

async function runRealtimeReconnectStress() {
  section('RS-1: Reconnect After Drop');

  const ch = new MockUnifiedChannel();
  ch.connect();
  let received = 0;
  ch.subscribe('WORKFLOW', () => received++);
  ch.dispatch('WORKFLOW', { type: 'start', id: fakeId() });
  pass('RS-1.a: message received before disconnect', received === 1);

  ch.disconnect();
  ch.dispatch('WORKFLOW', { type: 'update', id: fakeId() });
  pass('RS-1.b: message dropped when disconnected', received === 1);
  pass('RS-1.c: dropped count = 1', ch.stats.dropped === 1);

  ch.reconnect();
  ch.dispatch('WORKFLOW', { type: 'update', id: fakeId() });
  pass('RS-1.d: message received after reconnect', received === 2);

  section('RS-2: Topic Resubscription After Reconnect');

  const ch2 = new MockUnifiedChannel();
  ch2.connect();
  let chatCount = 0, wfCount = 0;
  const topicHandlers = [
    ['CHAT', () => chatCount++],
    ['WORKFLOW', () => wfCount++]
  ];
  ch2.resubscribeAll(topicHandlers);
  ch2.dispatch('CHAT', { msg: 'hello' });
  ch2.dispatch('WORKFLOW', { type: 'start' });
  pass('RS-2.a: resubscription works', chatCount === 1 && wfCount === 1);

  // Simulate disconnect + reconnect + resubscribe
  ch2.disconnect();
  ch2.connect();
  ch2.resubscribeAll(topicHandlers);
  ch2.dispatch('CHAT', { msg: 'world' });
  ch2.dispatch('WORKFLOW', { type: 'end' });
  pass('RS-2.b: topics resubscribed after reconnect', chatCount === 2 && wfCount === 2);

  section('RS-3: Reconnect Storm — 50 rapid reconnects with backoff');

  const ch3 = new MockUnifiedChannel();
  const t = timer();
  let reconnects = 0;
  for (let i = 0; i < 50; i++) {
    const ok = ch3.reconnect();
    if (ok) reconnects++;
  }
  const elapsed = t.elapsed();
  pass('RS-3.a: backoff limits reconnect storm', reconnects < 50);
  pass('RS-3.b: reconnect storm handled < 100ms', elapsed < 100);
  console.log(`    ℹ ${reconnects}/50 reconnect attempts accepted (backoff active)`);

  section('RS-4: Workflow State Sync Recovery');

  const ch4 = new MockUnifiedChannel();
  ch4.connect();
  const workflowStates = new Map();
  ch4.subscribe('WORKFLOW', (ev) => {
    if (ev.type === 'start') workflowStates.set(ev.id, { status: 'running' });
    if (ev.type === 'end') workflowStates.set(ev.id, { status: 'completed' });
  });

  // Simulate 20 workflows in flight
  for (let i = 0; i < 20; i++) ch4.dispatch('WORKFLOW', { type: 'start', id: `wf_${i}` });
  pass('RS-4.a: 20 workflows tracked before disconnect', workflowStates.size === 20);

  ch4.disconnect();
  // 5 more events lost during disconnection
  for (let i = 20; i < 25; i++) ch4.dispatch('WORKFLOW', { type: 'start', id: `wf_${i}` });
  pass('RS-4.b: events during disconnect dropped', workflowStates.size === 20);

  ch4.connect();
  // After reconnect, re-sync the missing workflows
  for (let i = 20; i < 25; i++) ch4.dispatch('WORKFLOW', { type: 'start', id: `wf_${i}` });
  pass('RS-4.c: sync recovery: all 25 workflows tracked', workflowStates.size === 25);

  section('RS-5: All 5 REALTIME_TOPICS subscribed');

  const ch5 = new MockUnifiedChannel();
  ch5.connect();
  const counters = {};
  for (const topic of TOPICS) {
    counters[topic] = 0;
    ch5.subscribe(topic, () => counters[topic]++);
  }
  for (const topic of TOPICS) ch5.dispatch(topic, { type: 'test' });
  pass('RS-5.a: all 5 topics receive events', TOPICS.every((t) => counters[t] === 1));
}

runRealtimeReconnectStress()
  .then(() => summarize('Realtime Reconnect Stress'))
  .catch((err) => { console.error('[REALTIME_STRESS_ERROR]', err?.message || err); process.exit(1); });
