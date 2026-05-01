const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('./Models/Category');

dotenv.config();

const categories = [
  { name: 'Science',           description: 'Physics, Chemistry, Biology and more', icon: '⚗️' },
  { name: 'Mathematics',       description: 'Algebra, Geometry, Calculus and more', icon: '📐' },
  { name: 'History',           description: 'World history, civilizations and events', icon: '🏛️' },
  { name: 'Geography',         description: 'Countries, capitals, maps and nature', icon: '🌍' },
  { name: 'Technology',        description: 'Computers, AI, programming and gadgets', icon: '💻' },
  { name: 'Literature',        description: 'Books, authors, poetry and stories', icon: '📚' },
  { name: 'Sports',            description: 'Football, cricket, Olympics and more', icon: '⚽' },
  { name: 'Music',             description: 'Genres, artists, instruments and theory', icon: '🎵' },
  { name: 'Movies',            description: 'Films, directors, actors and awards', icon: '🎬' },
  { name: 'General Knowledge', description: 'Mixed topics for the curious mind', icon: '🧠' },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    await Category.deleteMany({});
    console.log('Old categories cleared');

    const inserted = await Category.insertMany(categories);
    console.log(`✅ ${inserted.length} categories inserted`);

    process.exit(0);
  } catch (err) {
    console.error('Seeder error:', err.message);
    process.exit(1);
  }
};

seed();