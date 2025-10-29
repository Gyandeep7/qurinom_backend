import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Board } from '../models/Board.js';
import { List } from '../models/List.js';
import { Card } from '../models/Card.js';
import { BOARD_ROLES } from '../models/BoardMember.js';
import { getUserRoleForBoard, roleAtLeast } from '../lib/roles.js';

const router = express.Router();

async function ensureBoardAccess(boardId, userId) {
  const board = await Board.findOne({ _id: boardId, $or: [{ owner: userId }, { members: userId }] });
  return board;
}

// List cards in a list
router.get('/list/:listId', requireAuth, async (req, res) => {
  const { listId } = req.params;
  const userId = req.user.id;
  const list = await List.findById(listId).populate('board');
  if (!list) return res.status(404).json({ message: 'List not found' });
  const role = await getUserRoleForBoard(list.board.id, userId);
  if (!role) return res.status(403).json({ message: 'Forbidden' });
  const cards = await Card.find({ list: listId }).sort({ position: 1, createdAt: 1 }).lean();
  res.json({ cards });
});

// Create card
router.post('/', requireAuth, async (req, res) => {
  const userId = req.user.id;
  let { boardId, listId, title, description, dueDate, labels, position } = req.body;
  title = (title || '').trim();
  if (!boardId || !listId || !title) return res.status(400).json({ message: 'Missing fields' });
  const role = await getUserRoleForBoard(boardId, userId);
  if (!role || !roleAtLeast(role, BOARD_ROLES.EDITOR)) return res.status(403).json({ message: 'Forbidden' });
  const list = await List.findOne({ _id: listId, board: boardId });
  if (!list) return res.status(404).json({ message: 'List not found' });
  const card = await Card.create({ board: boardId, list: listId, title, description, dueDate, labels, position: position ?? 0, activity: [{ actor: userId, action: 'created' }] });
  res.status(201).json({ card });
});

// Get single card
router.get('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const card = await Card.findById(id);
  if (!card) return res.status(404).json({ message: 'Card not found' });
  const role = await getUserRoleForBoard(card.board, userId);
  if (!role || !roleAtLeast(role, BOARD_ROLES.EDITOR)) return res.status(403).json({ message: 'Forbidden' });
  res.json({ card });
});

// Update card fields
router.patch('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const card = await Card.findById(id);
  if (!card) return res.status(404).json({ message: 'Card not found' });
  const role = await getUserRoleForBoard(card.board, userId);
  if (!role || !roleAtLeast(role, BOARD_ROLES.EDITOR)) return res.status(403).json({ message: 'Forbidden' });
  const { title, description, dueDate, labels } = req.body;
  if (title !== undefined) card.title = String(title);
  if (description !== undefined) card.description = String(description);
  if (dueDate !== undefined) card.dueDate = dueDate ? new Date(dueDate) : null;
  if (labels !== undefined) card.labels = Array.isArray(labels) ? labels : [];
  card.activity.push({ actor: userId, action: 'updated' });
  await card.save();
  res.json({ card });
});

// Move card between lists / reorder
router.post('/:id/move', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { toListId, toPosition } = req.body;
  const card = await Card.findById(id);
  if (!card) return res.status(404).json({ message: 'Card not found' });
  const role = await getUserRoleForBoard(card.board, userId);
  if (!role || !roleAtLeast(role, BOARD_ROLES.EDITOR)) return res.status(403).json({ message: 'Forbidden' });
  if (toListId) {
    const list = await List.findOne({ _id: toListId, board: card.board });
    if (!list) return res.status(404).json({ message: 'Target list not found' });
    card.list = toListId;
  }
  if (toPosition !== undefined) card.position = Number(toPosition) || 0;
  card.activity.push({ actor: userId, action: 'moved', meta: { toListId, toPosition } });
  await card.save();
  res.json({ card });
});

// Delete card
router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const card = await Card.findById(id);
  if (!card) return res.status(404).json({ message: 'Card not found' });
  const board = await ensureBoardAccess(card.board, userId);
  if (!board) return res.status(403).json({ message: 'Forbidden' });
  await card.deleteOne();
  res.json({ ok: true });
});

// Add comment
router.post('/:id/comments', requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { text } = req.body;
  const card = await Card.findById(id);
  if (!card) return res.status(404).json({ message: 'Card not found' });
  const board = await ensureBoardAccess(card.board, userId);
  if (!board) return res.status(403).json({ message: 'Forbidden' });
  if (!text || !String(text).trim()) return res.status(400).json({ message: 'Comment text required' });
  card.comments.push({ author: userId, text: String(text) });
  card.activity.push({ actor: userId, action: 'commented' });
  await card.save();
  res.status(201).json({ card });
});

// Search cards
router.get('/search/all', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { boardId, q, labels, dueFrom, dueTo } = req.query;
  const accessQuery = { $or: [{ owner: userId }, { members: userId }] };
  if (boardId) accessQuery._id = boardId;
  const boards = await Board.find(accessQuery).select('_id').lean();
  const boardIds = boards.map((b) => b._id);
  const filter = { board: { $in: boardIds } };
  if (q) filter.title = { $regex: String(q), $options: 'i' };
  if (labels) {
    const arr = String(labels).split(',').map((s) => s.trim()).filter(Boolean);
    if (arr.length) filter.labels = { $all: arr };
  }
  if (dueFrom || dueTo) {
    filter.dueDate = {};
    if (dueFrom) filter.dueDate.$gte = new Date(dueFrom);
    if (dueTo) filter.dueDate.$lte = new Date(dueTo);
  }
  const cards = await Card.find(filter).sort({ updatedAt: -1 }).limit(200).lean();
  res.json({ cards });
});

export default router;


