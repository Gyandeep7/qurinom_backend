import mongoose from 'mongoose';

export async function connectToDatabase() {
  const envUri = process.env.MONGO_URI;
  const fallbackAtlas = 'mongodb+srv://gyandeep7177_db_user:OgY3O5TJtXrVDIbM@cluster0.boqb5zg.mongodb.net/?appName=Cluster0';
  const mongoUri = envUri || fallbackAtlas;

  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(mongoUri, {
    autoIndex: true,
    serverSelectionTimeoutMS: 10000
  });
}


