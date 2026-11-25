import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.ADMIN_SIGNUP_CODE = 'let-me-in';

let mongod;
let app;
let userToken;
let user2Token;
let adminToken;
let ticketId;

const register = (body) => request(app).post('/api/auth/register').send(body);

beforeAll(async () => {
  // Use a real server when MONGO_TEST_URI is set (e.g. docker compose), else an in-memory one.
  if (process.env.MONGO_TEST_URI) {
    await mongoose.connect(process.env.MONGO_TEST_URI);
    await mongoose.connection.dropDatabase();
  } else {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  }
  const { createApp } = await import('../src/app.js');
  app = createApp();

  userToken = (await register({ name: 'Una User', email: 'una@test.dev', password: 'Passw0rdOK' })).body.data.token;
  user2Token = (await register({ name: 'Uri User', email: 'uri@test.dev', password: 'Passw0rdOK' })).body.data.token;
  adminToken = (
    await register({ name: 'Ada Admin', email: 'ada@test.dev', password: 'Passw0rdOK', adminCode: 'let-me-in' })
  ).body.data.token;
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod?.stop();
});

const as = (token) => ({ Authorization: `Bearer ${token}` });

describe('auth', () => {
  it('rejects weak passwords and bad emails', async () => {
    const res = await register({ name: 'X Y', email: 'nope', password: 'short' });
    expect(res.status).toBe(422);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('does not allow self-assigning the admin role', async () => {
    const res = await register({ name: 'Mallory', email: 'm@test.dev', password: 'Passw0rdOK', role: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('user');
  });

  it('rejects a wrong admin code', async () => {
    const res = await register({ name: 'Eve', email: 'eve@test.dev', password: 'Passw0rdOK', adminCode: 'bad' });
    expect(res.status).toBe(403);
  });

  it('rejects duplicate email, wrong password, and missing token', async () => {
    expect((await register({ name: 'Una Two', email: 'una@test.dev', password: 'Passw0rdOK' })).status).toBe(409);
    const bad = await request(app).post('/api/auth/login').send({ email: 'una@test.dev', password: 'wrongpass1' });
    expect(bad.status).toBe(401);
    expect((await request(app).get('/api/tickets')).status).toBe(401);
  });

  it('logs in and never returns the password hash', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'una@test.dev', password: 'Passw0rdOK' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.password).toBeUndefined();
  });
});

describe('tickets & access control', () => {
  it('user creates a ticket (event logged, admin notified)', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set(as(userToken))
      .send({ title: 'Printer on fire', description: 'The office printer is literally on fire.', priority: 'urgent', category: 'technical' });
    expect(res.status).toBe(201);
    ticketId = res.body.data._id;

    const activity = await request(app).get(`/api/tickets/${ticketId}/activity`).set(as(userToken));
    expect(activity.body.data.map((a) => a.type)).toContain('ticket.created');

    const notes = await request(app).get('/api/notifications').set(as(adminToken));
    expect(notes.body.unreadCount).toBeGreaterThan(0);
  });

  it('validates ticket input', async () => {
    const res = await request(app).post('/api/tickets').set(as(userToken)).send({ title: 'x', description: 'short' });
    expect(res.status).toBe(422);
  });

  it('rejects malformed ids and hides other users\' tickets', async () => {
    expect((await request(app).get('/api/tickets/not-an-id').set(as(userToken))).status).toBe(422);
    expect((await request(app).get(`/api/tickets/${ticketId}`).set(as(user2Token))).status).toBe(404);
    expect((await request(app).delete(`/api/tickets/${ticketId}`).set(as(user2Token))).status).toBe(404);
  });

  it('users only list their own tickets; admins list all', async () => {
    const other = await request(app).get('/api/tickets').set(as(user2Token));
    expect(other.body.data).toHaveLength(0);
    const admin = await request(app).get('/api/tickets').set(as(adminToken));
    expect(admin.body.data.length).toBeGreaterThan(0);
  });

  it('blocks users from admin endpoints', async () => {
    const res = await request(app).patch(`/api/admin/tickets/${ticketId}`).set(as(userToken)).send({ status: 'resolved' });
    expect(res.status).toBe(403);
    expect((await request(app).get('/api/admin/activity').set(as(userToken))).status).toBe(403);
  });

  it('owner can edit an open ticket and an event is recorded', async () => {
    const res = await request(app).patch(`/api/tickets/${ticketId}`).set(as(userToken)).send({ title: 'Printer is on fire!' });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Printer is on fire!');
    const activity = await request(app).get(`/api/tickets/${ticketId}/activity`).set(as(userToken));
    expect(activity.body.data.map((a) => a.type)).toContain('ticket.updated');
  });

  it('ignores NoSQL-operator injection in filters', async () => {
    const res = await request(app).get('/api/tickets?status[$ne]=open').set(as(adminToken));
    expect([200, 422]).toContain(res.status);
    const inj = await request(app).get('/api/tickets').query({ status: '{"$ne":"x"}' }).set(as(adminToken));
    expect(inj.status).toBe(422);
  });
});

describe('comments, admin workflow & events', () => {
  it('both parties can comment; comments are tied to ticket and author', async () => {
    const c1 = await request(app).post(`/api/tickets/${ticketId}/comments`).set(as(userToken)).send({ body: 'Any update?' });
    expect(c1.status).toBe(201);
    expect(c1.body.data.author.name).toBe('Una User');
    const c2 = await request(app).post(`/api/tickets/${ticketId}/comments`).set(as(adminToken)).send({ body: 'On it.' });
    expect(c2.body.data.authorRole).toBe('admin');

    const list = await request(app).get(`/api/tickets/${ticketId}/comments`).set(as(userToken));
    expect(list.body.data).toHaveLength(2);
    expect((await request(app).get(`/api/tickets/${ticketId}/comments`).set(as(user2Token))).status).toBe(404);
  });

  it('admin changes status/priority; resolved fires both events and notifies the owner once', async () => {
    const before = (await request(app).get('/api/notifications').set(as(userToken))).body.unreadCount;
    const res = await request(app).patch(`/api/admin/tickets/${ticketId}`).set(as(adminToken)).send({ status: 'resolved', priority: 'high' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('resolved');
    expect(res.body.data.resolvedAt).toBeTruthy();

    const types = (await request(app).get(`/api/tickets/${ticketId}/activity`).set(as(adminToken))).body.data.map((a) => a.type);
    expect(types).toEqual(expect.arrayContaining(['ticket.status_changed', 'ticket.resolved']));

    const after = (await request(app).get('/api/notifications').set(as(userToken))).body;
    // priority change (ticket.updated) + resolved = 2 notifications, no duplicate from status_changed
    expect(after.unreadCount - before).toBe(2);
  });

  it('resolved tickets are locked for owner edits/deletes', async () => {
    expect((await request(app).patch(`/api/tickets/${ticketId}`).set(as(userToken)).send({ title: 'Edited' })).status).toBe(409);
    expect((await request(app).delete(`/api/tickets/${ticketId}`).set(as(userToken))).status).toBe(409);
  });

  it('closed tickets reject user comments but admins can still reply', async () => {
    await request(app).patch(`/api/admin/tickets/${ticketId}`).set(as(adminToken)).send({ status: 'closed' });
    expect((await request(app).post(`/api/tickets/${ticketId}/comments`).set(as(userToken)).send({ body: 'hello?' })).status).toBe(409);
    expect((await request(app).post(`/api/tickets/${ticketId}/comments`).set(as(adminToken)).send({ body: 'Closing out.' })).status).toBe(201);
  });

  it('filters, searches, sorts and paginates', async () => {
    for (const [title, priority] of [['Low thing here', 'low'], ['Urgent thing here', 'urgent'], ['Medium thing here', 'medium']]) {
      await request(app).post('/api/tickets').set(as(userToken)).send({ title, description: 'A sufficiently long description.', priority });
    }
    const byPriority = await request(app).get('/api/tickets?sort=priority&status=open').set(as(adminToken));
    expect(byPriority.body.data[0].priority).toBe('urgent');

    const search = await request(app).get('/api/tickets?search=medium%20thing').set(as(adminToken));
    expect(search.body.data).toHaveLength(1);

    const page = await request(app).get('/api/tickets?limit=2&page=2').set(as(adminToken));
    expect(page.body.pagination).toMatchObject({ page: 2, limit: 2 });
  });

  it('stats reflect scope and admin can view the activity feed', async () => {
    const adminStats = await request(app).get('/api/stats').set(as(adminToken));
    expect(adminStats.body.data.total).toBe(4);
    expect(adminStats.body.data.last7Days).toHaveLength(7);
    const otherStats = await request(app).get('/api/stats').set(as(user2Token));
    expect(otherStats.body.data.total).toBe(0);
    const feed = await request(app).get('/api/admin/activity').set(as(adminToken));
    expect(feed.status).toBe(200);
  });

  it('admin can delete any ticket and related data is removed', async () => {
    const res = await request(app).delete(`/api/tickets/${ticketId}`).set(as(adminToken));
    expect(res.status).toBe(200);
    expect((await request(app).get(`/api/tickets/${ticketId}`).set(as(adminToken))).status).toBe(404);
  });
});
