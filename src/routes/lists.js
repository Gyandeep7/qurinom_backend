import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Board } from '../models/Board.js';
import { List } from '../models/List.js';
import { BOARD_ROLES } from '../models/BoardMember.js';
import { getUserRoleForBoard, roleAtLeast } from '../lib/roles.js';

const router = express.Router();

// Get lists for a board the user has access to
router.get('/board/:boardId', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { boardId } = req.params;
  const role = await getUserRoleForBoard(boardId, userId);
  if (!role) return res.status(403).json({ message: 'Forbidden' });
  const lists = await List.find({ board: boardId }).sort({ position: 1, createdAt: 1 }).lean();
  res.json({ lists });
});

// Create list in board (only owner can modify for simplicity)
router.post('/', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { boardId, title, position } = req.body;
  if (!boardId || !title) return res.status(400).json({ message: 'Missing fields' });
  const role = await getUserRoleForBoard(boardId, userId);
  if (!role || !roleAtLeast(role, BOARD_ROLES.EDITOR)) return res.status(403).json({ message: 'Forbidden' });
  const list = await List.create({ board: boardId, title, position: position ?? 0 });
  res.status(201).json({ list });
});

// Rename or reposition list (owner only)
router.patch('/:id', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const list = await List.findById(id).populate('board');
  if (!list) return res.status(404).json({ message: 'List not found' });
  const role = await getUserRoleForBoard(list.board._id, userId);
  if (!role || !roleAtLeast(role, BOARD_ROLES.EDITOR)) return res.status(403).json({ message: 'Forbidden' });
  const { title, position } = req.body;
  if (title !== undefined) list.title = title;
  if (position !== undefined) list.position = position;
  await list.save();
  res.json({ list });
});

// Delete list (owner only)
router.delete('/:id', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const list = await List.findById(id).populate('board');
  if (!list) return res.status(404).json({ message: 'List not found' });
  const role = await getUserRoleForBoard(list.board._id, userId);
  if (!role || !roleAtLeast(role, BOARD_ROLES.EDITOR)) return res.status(403).json({ message: 'Forbidden' });
  await list.deleteOne();
  res.json({ ok: true });
});

// Reorder lists within a board (owner only)
router.post('/reorder', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { boardId, orders } = req.body; // orders: [{id, position}]
  if (!boardId || !Array.isArray(orders)) return res.status(400).json({ message: 'Missing fields' });
  const role = await getUserRoleForBoard(boardId, userId);
  if (!role || !roleAtLeast(role, BOARD_ROLES.EDITOR)) return res.status(403).json({ message: 'Forbidden' });
  const bulk = orders.map((o) => ({ updateOne: { filter: { _id: o.id, board: boardId }, update: { $set: { position: o.position } } } }));
  if (bulk.length) await List.bulkWrite(bulk);
  const lists = await List.find({ board: boardId }).sort({ position: 1, createdAt: 1 }).lean();
  res.json({ lists });
});

export default router;


