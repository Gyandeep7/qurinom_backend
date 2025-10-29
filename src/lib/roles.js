import { Board } from '../models/Board.js';
import { BoardMember, BOARD_ROLES } from '../models/BoardMember.js';

export { BOARD_ROLES };

export async function getUserRoleForBoard(boardId, userId) {
  const board = await Board.findById(boardId).select('owner').lean();
  if (!board) return null;
  if (String(board.owner) === String(userId)) return BOARD_ROLES.ADMIN;
  const member = await BoardMember.findOne({ board: boardId, user: userId }).lean();
  return member?.role || null;
}

export function roleAtLeast(role, minimum) {
  const order = [BOARD_ROLES.VIEWER, BOARD_ROLES.EDITOR, BOARD_ROLES.ADMIN];
  return order.indexOf(role) >= order.indexOf(minimum);
}


