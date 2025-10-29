import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Board } from '../models/Board.js';
import { User } from '../models/User.js';
import { BoardMember, BOARD_ROLES } from '../models/BoardMember.js';
import { getUserRoleForBoard, roleAtLeast } from '../lib/roles.js';

const router = express.Router();

// Get all boards for user (owner or member)
router.get('/', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const memberBoards = await BoardMember.find({ user: userId }).select('board').lean();
  const boardIds = memberBoards.map((m) => m.board);
  const boards = await Board.find({ $or: [{ owner: userId }, { _id: { $in: boardIds } }] })
    .sort({ updatedAt: -1 })
    .lean();
  res.json({ boards });
});

// Create board
router.post('/', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required' });
  const board = await Board.create({ name, owner: userId, members: [] });
  res.status(201).json({ board });
});

// Rename board
router.patch('/:id', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { name } = req.body;
  const role = await getUserRoleForBoard(id, userId);
  if (!role || !roleAtLeast(role, BOARD_ROLES.ADMIN)) return res.status(403).json({ message: 'Forbidden' });
  const board = await Board.findById(id);
  if (!board) return res.status(404).json({ message: 'Board not found' });
  if (name) board.name = name;
  await board.save();
  res.json({ board });
});

// Delete board
router.delete('/:id', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const role = await getUserRoleForBoard(id, userId);
  if (!role || !roleAtLeast(role, BOARD_ROLES.ADMIN)) return res.status(403).json({ message: 'Forbidden' });
  const board = await Board.findById(id);
  if (!board) return res.status(404).json({ message: 'Board not found' });
  await board.deleteOne();
  res.json({ ok: true });
});

// Members: list
router.get('/:id/members', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const role = await getUserRoleForBoard(id, userId);
  if (!role) return res.status(403).json({ message: 'Forbidden' });
  const members = await BoardMember.find({ board: id }).populate('user', 'name email').lean();
  res.json({ members: members.map((m) => ({ id: m._id, role: m.role, user: m.user })) });
});

// Invite (existing user by email)
router.post('/:id/invite', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  let { email, role } = req.body;
  email = String(email || '').trim().toLowerCase();
  if (!email || !role) return res.status(400).json({ message: 'Email and role required' });
  const inviterRole = await getUserRoleForBoard(id, userId);
  if (!inviterRole || !roleAtLeast(inviterRole, BOARD_ROLES.ADMIN)) return res.status(403).json({ message: 'Forbidden' });
  const u = await User.findOne({ email });
  if (!u) return res.status(404).json({ message: 'User not found' });
  const board = await Board.findById(id);
  if (!board) return res.status(404).json({ message: 'Board not found' });
  const member = await BoardMember.findOneAndUpdate(
    { board: id, user: u._id },
    { $set: { role } },
    { upsert: true, new: true }
  );
  res.status(201).json({ member: { id: member._id, role: member.role, user: { id: u._id, name: u.name, email: u.email } } });
});

// Update role
router.patch('/:id/members/:memberId', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { id, memberId } = req.params;
  const { role } = req.body;
  const inviterRole = await getUserRoleForBoard(id, userId);
  if (!inviterRole || !roleAtLeast(inviterRole, BOARD_ROLES.ADMIN)) return res.status(403).json({ message: 'Forbidden' });
  const member = await BoardMember.findOneAndUpdate({ _id: memberId, board: id }, { $set: { role } }, { new: true }).populate('user', 'name email');
  if (!member) return res.status(404).json({ message: 'Member not found' });
  res.json({ member: { id: member._id, role: member.role, user: member.user } });
});

// Remove member
router.delete('/:id/members/:memberId', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { id, memberId } = req.params;
  const inviterRole = await getUserRoleForBoard(id, userId);
  if (!inviterRole || !roleAtLeast(inviterRole, BOARD_ROLES.ADMIN)) return res.status(403).json({ message: 'Forbidden' });
  await BoardMember.deleteOne({ _id: memberId, board: id });
  res.json({ ok: true });
});

export default router;


