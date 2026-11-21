// Live game rooms. The server is the only authority: it runs the clock, scores every
// answer, and never sends a correct answer before it is revealed.
// Rooms live in this process's memory, so run a single instance of this server.
//
// Two modes:
// - sync: one question at a time for everyone, with a reveal after each
// - exam: every question at once and one deadline; players answer in any order, can
//   change answers until they submit, and see the answers when the game ends
const mongoose = require('mongoose');
const { Category, Question, UserQuiz, Result, LiveGame } = require('./models');

const LIMITS = {
  MIN_QUESTIONS: 3,
  MAX_QUESTIONS: 30,
  MIN_SECONDS: 5,             // per question (sync)
  MAX_SECONDS: 300,
  MIN_EXAM_SECONDS: 60,       // whole game (exam)
  MAX_EXAM_SECONDS: 3 * 60 * 60,
  MAX_CUSTOM_QUESTIONS: 50,   // a player's own quiz is played in full (the builder allows 50)
  MAX_PLAYERS: 50,
};
const MODES = ['sync', 'exam'];
const EXAM_POINTS = 1000;                    // per correct answer; ties go to the faster finisher
const EXAM_BROADCAST_MS = 300;               // answer counts in an exam are sent at most this often
const PASS_MARK = 50;                        // percentage, as in QuizApp_Backend/Utils/quizRules.js
const ANSWER_GRACE_MS = 500;                 // network delay allowed after the clock hits zero
const HOST_AWAY_ADVANCE_MS = 15 * 1000;      // reveal moves on by itself if the host is offline
const EMPTY_ROOM_MS = 10 * 60 * 1000;        // a room nobody is connected to is closed
const FINISHED_ROOM_MS = 15 * 60 * 1000;     // the final scores stay viewable this long
const MAX_POINTS = 1000;                     // a correct answer at once; 500 at the last moment

// No 0/O or 1/I, so a code read aloud or off a projector can't be mistyped
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 5;

const rooms = new Map();

// A failure the player should see as is (anything else becomes a generic message)
class GameError extends Error {
  constructor(message) {
    super(message);
    this.expose = true;
  }
}

const clamp = (n, min, max, fallback) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
};

function newCode() {
  for (;;) {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    if (!rooms.has(code)) return code;
  }
}

const normalizeCode = (code) => (typeof code === 'string' ? code.trim().toUpperCase() : '');

function getRoom(code) {
  const room = rooms.get(normalizeCode(code));
  if (!room) throw new GameError('No game with that code. Check it and try again.');
  return room;
}

const isConnected = (player) => player.sockets.size > 0;

// Points a player has earned, counting only questions already revealed
// (a score that jumps mid-question would give the answer away)
function visibleScore(room, player) {
  let points = 0;
  let correct = 0;
  // An exam's scores stay hidden until it ends
  if (room.status === 'exam') return { points, correct };
  player.answers.forEach((a, i) => {
    if (!a) return;
    if (room.status === 'question' && i >= room.index) return;
    points += a.points;
    if (a.isCorrect) correct += 1;
  });
  return { points, correct };
}

function ranking(room) {
  const rows = [...room.players.values()].map((p) => {
    const { points, correct } = visibleScore(room, p);
    return { player: p, points, correct };
  });
  rows.sort((a, b) => b.points - a.points || b.correct - a.correct
    || (room.mode === 'exam' ? examTime(room, a.player) - examTime(room, b.player) : 0)
    || a.player.joinedAt - b.player.joinedAt);
  return rows;
}

// How long a player took in an exam: until they submitted, or the whole time
function examTime(room, player) {
  if (!room.startedAt) return 0;
  const end = player.submittedAt || room.endedAt || room.endsAt;
  return Math.max(0, Math.min(end, room.endsAt) - room.startedAt);
}

// How many players picked each option of question i
const optionCounts = (room, i) => room.questions[i].options.map(
  (o) => [...room.players.values()].filter((p) => p.answers[i]?.option === o).length,
);

// What one player sees. Built per player: their own answer is in it, and the
// correct answer only once the question has been revealed.
function snapshot(room, userId) {
  const q = room.questions[room.index];
  const showQuestion = (room.status === 'question' || room.status === 'reveal') && q;
  const revealed = room.status === 'reveal';
  const me = room.players.get(userId);
  const myAnswer = me && room.index >= 0 ? me.answers[room.index] : null;

  const exam = room.status === 'exam';
  const finished = room.status === 'finished';

  return {
    code: room.code,
    status: room.status,
    mode: room.mode,
    isHost: room.hostId === userId,
    host: { id: room.hostId, name: room.hostName },
    category: room.category,
    custom: room.custom,
    seconds: room.seconds,
    totalSeconds: room.totalSeconds,
    total: room.questions.length,
    index: room.index,
    serverNow: Date.now(),
    endsAt: room.status === 'question' || exam ? room.endsAt : null,
    // Exam: every question, without answers
    questions: exam ? room.questions.map((x) => ({ text: x.text, options: x.options, difficulty: x.difficulty })) : null,
    question: showQuestion ? { text: q.text, options: q.options, difficulty: q.difficulty } : null,
    reveal: revealed ? {
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || '',
      counts: q.options.map((o) => [...room.players.values()].filter((p) => p.answers[room.index]?.option === o).length),
    } : null,
    me: me ? {
      answer: myAnswer?.option ?? null,
      isCorrect: revealed && myAnswer ? myAnswer.isCorrect : null,
      points: revealed && myAnswer ? myAnswer.points : null,
      answers: exam ? room.questions.map((_x, i) => me.answers[i]?.option ?? null) : undefined,
      submitted: room.mode === 'exam' ? !!me.submittedAt : undefined,
    } : null,
    players: ranking(room).map(({ player, points, correct }, i) => ({
      id: player.id,
      name: player.name,
      rank: i + 1,
      score: points,
      correct,
      isHost: player.id === room.hostId,
      connected: isConnected(player),
      answered: room.status === 'question' ? !!player.answers[room.index] : undefined,
      lastPoints: revealed ? (player.answers[room.index]?.points ?? 0) : undefined,
      answeredCount: exam ? player.answers.filter(Boolean).length : undefined,
      submitted: room.mode === 'exam' ? !!player.submittedAt : undefined,
      timeMs: finished && room.mode === 'exam' ? examTime(room, player) : undefined,
    })),
    // After the game: every question with its answer, this player's pick and everyone's counts
    review: finished ? room.questions.map((x, i) => ({
      text: x.text,
      options: x.options,
      correctAnswer: x.correctAnswer,
      explanation: x.explanation || '',
      myAnswer: me?.answers[i]?.option ?? null,
      counts: optionCounts(room, i),
    })) : undefined,
    saved: finished ? room.saved : undefined,
    gameId: finished ? room.gameId : undefined,
  };
}

function broadcast(io, room) {
  clearTimeout(room.broadcastTimer);
  room.broadcastTimer = null;
  for (const player of room.players.values()) {
    const state = snapshot(room, player.id);
    for (const socketId of player.sockets) io.to(socketId).emit('room:state', state);
  }
}

// Soon, at most once per EXAM_BROADCAST_MS: many players clicking answers in an exam
// would otherwise each send everyone the whole question list
function broadcastSoon(io, room) {
  if (room.broadcastTimer) return;
  room.broadcastTimer = setTimeout(() => {
    room.broadcastTimer = null;
    if (rooms.get(room.code) === room) broadcast(io, room);
  }, EXAM_BROADCAST_MS);
}

function clearTimers(room) {
  clearTimeout(room.timer);
  clearTimeout(room.idleTimer);
  clearTimeout(room.broadcastTimer);
  room.timer = null;
  room.idleTimer = null;
  room.broadcastTimer = null;
}

function closeRoom(io, room, reason) {
  clearTimers(room);
  rooms.delete(room.code);
  io.to(room.code).emit('room:closed', { reason });
  io.in(room.code).socketsLeave(room.code);
  for (const player of room.players.values()) {
    for (const socketId of player.sockets) {
      const s = io.sockets.sockets.get(socketId);
      if (s && s.data.code === room.code) s.data.code = null;
    }
  }
}

// Close the room once nobody has been connected to it for a while
function checkEmpty(io, room) {
  clearTimeout(room.idleTimer);
  const anyone = [...room.players.values()].some(isConnected);
  if (anyone) return;
  room.idleTimer = setTimeout(() => {
    if (rooms.get(room.code) === room && ![...room.players.values()].some(isConnected)) {
      closeRoom(io, room, 'Everyone left, so the game was closed.');
    }
  }, EMPTY_ROOM_MS);
}

// ── Game flow ──

function askNext(io, room) {
  clearTimeout(room.timer);
  room.index += 1;
  if (room.index >= room.questions.length) {
    finish(io, room).catch((err) => console.error(`[live] room ${room.code}: finishing failed:`, err));
    return;
  }

  room.status = 'question';
  room.startedAt = Date.now();
  room.endsAt = room.startedAt + room.seconds * 1000;
  room.timer = setTimeout(() => reveal(io, room), room.seconds * 1000 + ANSWER_GRACE_MS);
  broadcast(io, room);
}

// Exam: every question at once, until the deadline (or everyone submits)
function startExam(io, room) {
  room.status = 'exam';
  room.startedAt = Date.now();
  room.endsAt = room.startedAt + room.totalSeconds * 1000;
  room.timer = setTimeout(() => endExam(io, room), room.totalSeconds * 1000 + ANSWER_GRACE_MS);
  broadcast(io, room);
}

function endExam(io, room) {
  if (room.status !== 'exam') return;
  room.endedAt = Math.min(Date.now(), room.endsAt);
  finish(io, room).catch((err) => console.error(`[live] room ${room.code}: finishing failed:`, err));
}

// Everyone still connected has submitted: no need to wait for the clock
function checkExamDone(io, room) {
  const connected = [...room.players.values()].filter(isConnected);
  if (connected.length && connected.every((p) => p.submittedAt)) endExam(io, room);
}

function reveal(io, room) {
  if (room.status !== 'question') return;
  clearTimeout(room.timer);
  room.status = 'reveal';
  room.timer = null;
  const host = room.players.get(room.hostId);
  if (!host || !isConnected(host)) {
    room.timer = setTimeout(() => room.status === 'reveal' && askNext(io, room), HOST_AWAY_ADVANCE_MS);
  }
  broadcast(io, room);
}

async function finish(io, room) {
  clearTimeout(room.timer);
  room.status = 'finished';
  room.endedAt = room.endedAt || Date.now();
  room.index = room.questions.length - 1;
  room.saved = null; // null while saving, then true / false
  broadcast(io, room);

  const [saved, gameId] = await Promise.all([saveResults(room), saveGame(room)]);
  room.saved = saved;
  room.gameId = gameId;
  if (rooms.get(room.code) !== room) return;
  broadcast(io, room);
  room.idleTimer = setTimeout(() => {
    if (rooms.get(room.code) === room) closeRoom(io, room, 'This game has ended.');
  }, FINISHED_ROOM_MS);
}

// Every player who answered at least once gets a normal result, so the game counts
// in their history, analytics and the leaderboard. Returns whether all were saved.
async function saveResults(room) {
  // A quiz anyone can write would let players farm leaderboard points, and its id
  // isn't a category, so these games show their podium but aren't saved
  if (room.custom) return true;
  const total = room.questions.length;
  const docs = [];
  for (const player of room.players.values()) {
    if (!player.answers.some(Boolean)) continue;
    const answers = room.questions.map((q, i) => {
      const a = player.answers[i];
      return { question: q.id, selectedOption: a?.option || '', isCorrect: !!a?.isCorrect };
    });
    const score = answers.filter((a) => a.isCorrect).length;
    const percentage = Math.round((score / total) * 100);
    // Exam: the time until they submitted. One at a time: the time used per question,
    // an unanswered question counting as the full clock.
    const ms = room.mode === 'exam'
      ? examTime(room, player)
      : room.questions.reduce((sum, _q, i) => sum + (player.answers[i]?.ms ?? room.seconds * 1000), 0);
    docs.push({
      user: player.id,
      quiz: room.category.id,
      attempt: new mongoose.Types.ObjectId(),
      answers,
      score,
      total,
      percentage,
      passed: percentage >= PASS_MARK,
      timeTaken: Math.round(ms / 1000),
    });
  }
  if (!docs.length) return true;
  try {
    await Result.insertMany(docs, { ordered: false });
    return true;
  } catch (err) {
    console.error(`[live] room ${room.code}: could not save results:`, err.message);
    return false;
  }
}

// The finished game, for every player's "Past games" (custom quizzes included).
// Returns its id, or null when nobody answered anything or it could not be saved.
async function saveGame(room) {
  const ranked = ranking(room);
  if (!ranked.some(({ player }) => player.answers.some(Boolean))) return null;
  try {
    const game = await LiveGame.create({
      code: room.code,
      host: room.hostId,
      hostName: room.hostName,
      mode: room.mode,
      source: { kind: room.custom ? 'custom' : 'category', id: room.category.id, name: room.category.name },
      seconds: room.mode === 'sync' ? room.seconds : undefined,
      totalSeconds: room.mode === 'exam' ? room.totalSeconds : undefined,
      questions: room.questions.map((q) => ({
        text: q.text, options: q.options, correctAnswer: q.correctAnswer, explanation: q.explanation || '',
      })),
      players: ranked.map(({ player, points, correct }, i) => ({
        user: player.id,
        name: player.name,
        rank: i + 1,
        score: points,
        correct,
        timeMs: room.mode === 'exam' ? examTime(room, player) : undefined,
        answers: room.questions.map((_q, j) => {
          const a = player.answers[j];
          return a
            ? { option: a.option, isCorrect: a.isCorrect, points: a.points, ms: a.ms }
            : { option: null, isCorrect: false, points: 0 };
        }),
      })),
      startedAt: new Date(room.startedAt),
      endedAt: new Date(room.endedAt || Date.now()),
    });
    return String(game._id);
  } catch (err) {
    console.error(`[live] room ${room.code}: could not save the game:`, err.message);
    return null;
  }
}

// ── Actions (one per client event) ──

function addSocket(io, room, user, socket) {
  // One room per connection: joining another leaves the previous one
  if (socket.data.code && socket.data.code !== room.code) leave(io, socket, { explicit: false });
  const player = room.players.get(user.id);
  player.sockets.add(socket.id);
  socket.join(room.code);
  socket.data.code = room.code;
  clearTimeout(room.idleTimer);
  room.idleTimer = null;
  // The host is back during a reveal: they move the game on again, not the fallback timer
  if (room.status === 'reveal' && user.id === room.hostId && room.timer) {
    clearTimeout(room.timer);
    room.timer = null;
  }
}

const isPlayable = (q) => q.text && Array.isArray(q.options) && q.options.length >= 2 && q.options.includes(q.correctAnswer);
const toGameQuestion = (q) => ({
  id: q._id,
  text: q.text,
  options: q.options,
  correctAnswer: q.correctAnswer,
  explanation: q.explanation,
  difficulty: q.difficulty,
});

// A random set from one of the shared categories
async function categoryQuestions(categoryId, count) {
  if (typeof categoryId !== 'string' || !mongoose.isValidObjectId(categoryId)) throw new GameError('Choose a category.');
  const category = await Category.findById(categoryId).select('name').lean();
  if (!category) throw new GameError('That category no longer exists.');

  // Oversampled a little so malformed questions can be skipped
  const sample = await Question.aggregate([
    { $match: { category: new mongoose.Types.ObjectId(categoryId) } },
    { $sample: { size: count + 10 } },
    { $project: { text: 1, options: 1, correctAnswer: 1, explanation: 1, difficulty: 1 } },
  ]);
  const questions = sample.filter(isPlayable).slice(0, count).map(toGameQuestion);
  if (questions.length < LIMITS.MIN_QUESTIONS) {
    throw new GameError(`This category needs at least ${LIMITS.MIN_QUESTIONS} questions for a live game.`);
  }
  return { source: { id: String(category._id), name: category.name }, questions, custom: false };
}

// Every question of a quiz the host wrote, in the order they wrote them.
// Only the owner can host it: someone else's quiz id is "not found".
async function customQuestions(quizId, userId) {
  if (typeof quizId !== 'string' || !mongoose.isValidObjectId(quizId)) throw new GameError('Choose one of your quizzes.');
  const quiz = await UserQuiz.findOne({ _id: quizId, owner: userId }).select('title questions').lean();
  if (!quiz) throw new GameError('That quiz no longer exists.');
  const questions = (quiz.questions || []).filter(isPlayable).slice(0, LIMITS.MAX_CUSTOM_QUESTIONS).map(toGameQuestion);
  if (questions.length < LIMITS.MIN_QUESTIONS) {
    throw new GameError(`A quiz needs at least ${LIMITS.MIN_QUESTIONS} questions for a live game.`);
  }
  return { source: { id: String(quiz._id), name: quiz.title }, questions, custom: true };
}

async function create(io, socket, payload) {
  const user = socket.data.user;
  const mode = MODES.includes(payload.mode) ? payload.mode : 'sync';
  const seconds = clamp(payload.seconds, LIMITS.MIN_SECONDS, LIMITS.MAX_SECONDS, 20);
  const { source, questions, custom } = payload.quizId !== undefined
    ? await customQuestions(payload.quizId, user.id)
    : await categoryQuestions(payload.categoryId, clamp(payload.count, LIMITS.MIN_QUESTIONS, LIMITS.MAX_QUESTIONS, 10));

  // Exam: the host's total, or 30 seconds a question when they didn't choose one
  const totalSeconds = mode === 'exam'
    ? clamp(payload.totalSeconds, LIMITS.MIN_EXAM_SECONDS, LIMITS.MAX_EXAM_SECONDS,
      Math.max(LIMITS.MIN_EXAM_SECONDS, questions.length * 30))
    : null;

  const room = {
    code: newCode(),
    hostId: user.id,
    hostName: user.name,
    // `category` is what the game is played from: a shared category, or the host's own quiz
    category: source,
    custom,
    mode,
    seconds,
    totalSeconds,
    endedAt: null,
    gameId: null,
    broadcastTimer: null,
    questions,
    status: 'lobby',
    index: -1,
    startedAt: null,
    endsAt: null,
    players: new Map(),
    timer: null,
    idleTimer: null,
    saved: null,
  };
  room.players.set(user.id, { id: user.id, name: user.name, answers: [], sockets: new Set(), joinedAt: Date.now() });
  rooms.set(room.code, room);
  addSocket(io, room, user, socket);
  const timing = mode === 'exam' ? `${totalSeconds}s total` : `${seconds}s each`;
  console.log(`[live] room ${room.code} created by ${user.id}: ${mode}, ${questions.length} questions, ${timing}`);
  broadcast(io, room);
  return { code: room.code };
}

function join(io, socket, payload) {
  const user = socket.data.user;
  const room = getRoom(payload.code);
  if (!room.players.has(user.id)) {
    // Newcomers only in the lobby; players already in the game can always come back
    if (room.status !== 'lobby') throw new GameError('This game has already started.');
    if (room.players.size >= LIMITS.MAX_PLAYERS) throw new GameError('This game is full.');
    room.players.set(user.id, { id: user.id, name: user.name, answers: [], sockets: new Set(), joinedAt: Date.now() });
  }
  addSocket(io, room, user, socket);
  broadcast(io, room);
  return { code: room.code };
}

function hostRoom(socket) {
  const room = getRoom(socket.data.code);
  if (room.hostId !== socket.data.user.id) throw new GameError('Only the host can do that.');
  return room;
}

function start(io, socket) {
  const room = hostRoom(socket);
  if (room.status !== 'lobby') throw new GameError('The game has already started.');
  if (room.mode === 'exam') startExam(io, room);
  else askNext(io, room);
  return {};
}

function next(io, socket) {
  const room = hostRoom(socket);
  if (room.status === 'exam') endExam(io, room);          // host ends the exam early
  else if (room.status === 'question') reveal(io, room);  // host ends the question early
  else if (room.status === 'reveal') askNext(io, room);
  else throw new GameError('Nothing to move on to.');
  return {};
}

function answer(io, socket, payload) {
  const user = socket.data.user;
  const room = getRoom(socket.data.code);
  const player = room.players.get(user.id);
  const q = room.questions[room.index];
  const now = Date.now();

  if (!player) throw new GameError('You are not in this game.');
  if (room.status !== 'question' || payload.index !== room.index || now > room.endsAt + ANSWER_GRACE_MS) {
    throw new GameError('Too late, this question is closed.');
  }
  if (player.answers[room.index]) throw new GameError('You already answered.');
  if (typeof payload.option !== 'string' || !q.options.includes(payload.option)) throw new GameError('Pick one of the options.');

  const ms = Math.min(room.seconds * 1000, now - room.startedAt);
  const isCorrect = payload.option === q.correctAnswer;
  const timeLeft = 1 - ms / (room.seconds * 1000);
  const points = isCorrect ? Math.round(MAX_POINTS / 2 + (MAX_POINTS / 2) * timeLeft) : 0;
  player.answers[room.index] = { option: payload.option, isCorrect, points, ms };

  // Everyone still connected has answered: no need to wait out the clock
  const waiting = [...room.players.values()].some((p) => isConnected(p) && !p.answers[room.index]);
  if (waiting) broadcast(io, room);
  else reveal(io, room);
  return {};
}

// Exam: pick, change or clear (option null) the answer to any question
function examAnswer(io, socket, payload) {
  const room = getRoom(socket.data.code);
  const player = room.players.get(socket.data.user.id);
  const now = Date.now();
  if (!player) throw new GameError('You are not in this game.');
  if (room.status !== 'exam' || now > room.endsAt + ANSWER_GRACE_MS) throw new GameError("Time's up.");
  if (player.submittedAt) throw new GameError('You already submitted your answers.');
  const i = payload.index;
  const q = Number.isInteger(i) ? room.questions[i] : null;
  if (!q) throw new GameError('No such question.');

  if (payload.option === null) {
    player.answers[i] = undefined;
  } else {
    if (typeof payload.option !== 'string' || !q.options.includes(payload.option)) throw new GameError('Pick one of the options.');
    const isCorrect = payload.option === q.correctAnswer;
    player.answers[i] = { option: payload.option, isCorrect, points: isCorrect ? EXAM_POINTS : 0, ms: now - room.startedAt };
  }
  broadcastSoon(io, room);
  return {};
}

// Exam: hand in. Answers are final from here on.
function examSubmit(io, socket) {
  const room = getRoom(socket.data.code);
  const player = room.players.get(socket.data.user.id);
  if (!player) throw new GameError('You are not in this game.');
  if (room.status !== 'exam') throw new GameError('The exam is not running.');
  if (!player.submittedAt) player.submittedAt = Math.min(Date.now(), room.endsAt);
  broadcast(io, room);
  checkExamDone(io, room);
  return {};
}

// Leaving on purpose (explicit) or by dropping the connection
function leave(io, socket, { explicit }) {
  const code = socket.data.code;
  const room = code && rooms.get(code);
  socket.data.code = null;
  if (!room) return {};
  socket.leave(code);

  const user = socket.data.user;
  const player = room.players.get(user.id);
  if (!player) return {};
  player.sockets.delete(socket.id);

  if (explicit && user.id === room.hostId && room.status !== 'finished') {
    closeRoom(io, room, `${room.hostName} ended the game.`);
    return {};
  }
  // Someone leaving the lobby is simply gone; mid-game they keep their score and can rejoin
  if (explicit && room.status === 'lobby' && !isConnected(player)) room.players.delete(user.id);

  if (room.status === 'question') {
    const waiting = [...room.players.values()].some((p) => isConnected(p) && !p.answers[room.index]);
    if (!waiting && [...room.players.values()].some(isConnected)) {
      reveal(io, room);
      return {};
    }
  }
  if (room.status === 'exam') {
    // The last player still writing left: everyone still here has submitted
    const connected = [...room.players.values()].filter(isConnected);
    if (connected.length && connected.every((p) => p.submittedAt)) {
      endExam(io, room);
      return {};
    }
  }
  if (room.status === 'reveal' && user.id === room.hostId && !isConnected(player) && !room.timer) {
    room.timer = setTimeout(() => room.status === 'reveal' && askNext(io, room), HOST_AWAY_ADVANCE_MS);
  }
  broadcast(io, room);
  checkEmpty(io, room);
  return {};
}

// Send the current state again (after a reconnect, or when a page opens)
function sync(io, socket) {
  const room = getRoom(socket.data.code);
  socket.emit('room:state', snapshot(room, socket.data.user.id));
  return {};
}

module.exports = {
  LIMITS,
  GameError,
  actions: { create, join, start, next, answer, examAnswer, examSubmit, sync, leave },
  roomCount: () => rooms.size,
};
