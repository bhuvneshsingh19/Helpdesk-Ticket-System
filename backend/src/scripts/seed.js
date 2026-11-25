import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Ticket } from '../models/Ticket.js';
import { Comment } from '../models/Comment.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { Notification } from '../models/Notification.js';

const reset = process.argv.includes('--reset');

await connectDB();

if (reset) {
  await Promise.all([
    User.deleteMany({}),
    Ticket.deleteMany({}),
    Comment.deleteMany({}),
    ActivityLog.deleteMany({}),
    Notification.deleteMany({}),
  ]);
}

const ensureUser = async (data) =>
  (await User.findOne({ email: data.email })) || User.create(data);

const admin = await ensureUser({
  name: 'Ava Admin',
  email: 'admin@helpdesk.dev',
  password: 'Admin@123',
  role: 'admin',
});
const user = await ensureUser({
  name: 'Uma User',
  email: 'user@helpdesk.dev',
  password: 'User@1234',
  role: 'user',
});

if ((await Ticket.countDocuments({ createdBy: user._id })) === 0) {
  const samples = [
    ['Cannot log in after password reset', 'I reset my password but the new one is rejected on the login page.', 'account', 'high', 'open'],
    ['Invoice shows wrong amount', 'The invoice for October lists 2 seats but we only have 1 active seat.', 'billing', 'medium', 'in_progress'],
    ['Dark mode request', 'It would be great to have a dark theme for late-night support work.', 'feature_request', 'low', 'resolved'],
    ['Export to CSV fails with 500', 'Exporting more than 1,000 rows returns an internal server error.', 'technical', 'urgent', 'open'],
  ];
  for (const [title, description, category, priority, status] of samples) {
    const t = await Ticket.create({
      title, description, category, priority, status, createdBy: user._id,
      resolvedAt: status === 'resolved' ? new Date() : null,
    });
    if (status !== 'open') {
      await Comment.create({
        ticket: t._id, author: admin._id, authorRole: 'admin',
        body: 'Thanks for reporting this - we are looking into it.',
      });
      await Ticket.updateOne({ _id: t._id }, { commentCount: 1 });
    }
  }
}

console.log('Seed complete.\n  Admin: admin@helpdesk.dev / Admin@123\n  User:  user@helpdesk.dev  / User@1234');
await mongoose.disconnect();
