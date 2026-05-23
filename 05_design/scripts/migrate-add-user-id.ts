/* eslint-disable no-console */
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User';
import Todo from '../models/Todo';
import WeeklyPlan from '../models/WeeklyPlan';
import Goal from '../models/Goal';

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: tsx scripts/migrate-add-user-id.ts <userId | username>');
    console.error('  Assigns all existing Todo/WeeklyPlan/Goal documents without a userId to the target user.');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI environment variable is required.');
    process.exit(1);
  }

  await mongoose.connect(uri);

  let user;
  if (mongoose.Types.ObjectId.isValid(target)) {
    user = await User.findById(target);
  }
  if (!user) {
    user = await User.findOne({ username: target });
  }
  if (!user) {
    console.error(`User not found by id/username: ${target}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const userId = user._id;
  console.log(`Migrating orphan documents to user: ${user.username} (${userId})`);

  const [todoRes, weeklyRes, goalRes] = await Promise.all([
    Todo.updateMany({ userId: { $exists: false } }, { $set: { userId } }),
    WeeklyPlan.updateMany({ userId: { $exists: false } }, { $set: { userId } }),
    Goal.updateMany({ userId: { $exists: false } }, { $set: { userId } }),
  ]);

  console.log(`  Todos updated:        ${todoRes.modifiedCount}`);
  console.log(`  WeeklyPlans updated:  ${weeklyRes.modifiedCount}`);
  console.log(`  Goals updated:        ${goalRes.modifiedCount}`);

  await mongoose.disconnect();
  console.log('Migration complete.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
