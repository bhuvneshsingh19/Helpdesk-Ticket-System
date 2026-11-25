import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

let app;
let eventBus;
let EVENTS;

beforeAll(async () => {
  ({ createApp: globalThis.__createApp } = await import('../src/app.js'));
  app = globalThis.__createApp();
  ({ eventBus } = await import('../src/events/eventBus.js'));
  ({ EVENTS } = await import('../src/config/constants.js'));
});

// These tests need no database: they cover wiring, validation, authN/authZ guards and the event bus.
describe('app wiring (no database)', () => {
  it('serves the health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('requires a token on protected routes', async () => {
    expect((await request(app).get('/api/tickets')).status).toBe(401);
    expect((await request(app).get('/api/stats')).status).toBe(401);
    expect((await request(app).get('/api/tickets').set('Authorization', 'Bearer garbage')).status).toBe(401);
  });

  it('rejects tokens signed with the wrong secret', async () => {
    const forged = jwt.sign({ sub: '507f1f77bcf86cd799439011', role: 'admin' }, 'wrong-secret');
    const res = await request(app).get('/api/admin/activity').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it('validates registration input before touching the DB', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(422);
    expect(res.body.errors.map((e) => e.field)).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });

  it('validates login input', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'x' });
    expect(res.status).toBe(422);
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
  });
});

describe('event bus', () => {
  it('delivers events to every handler and isolates failures', async () => {
    const seen = [];
    const ok = (e) => seen.push(e.ticket.id);
    const boom = () => {
      throw new Error('handler exploded');
    };
    eventBus.on('test.event', boom);
    eventBus.on('test.event', ok);
    const event = await eventBus.publish('test.event', { ticket: { id: 't1' } });
    expect(seen).toEqual(['t1']);
    expect(event.type).toBe('test.event');
    expect(event.at).toBeInstanceOf(Date);
    eventBus.removeAllListeners('test.event');
  });

  it('registers log + notify handlers for every domain event', () => {
    Object.values(EVENTS).forEach((type) => {
      expect(eventBus.listenerCount(type)).toBe(2);
    });
  });
});
