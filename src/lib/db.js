import mongoose from 'mongoose';

export async function connectToDatabase() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/quarioum_tasks';
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(mongoUri, {
    autoIndex: true
  });
}


