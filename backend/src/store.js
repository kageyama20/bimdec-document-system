/*
 * In-memory inbox store.
 *
 * This keeps the most recent parsed messages in RAM so the admin
 * dashboard can fetch them quickly and so newly-arrived mail can be
 * pushed out over Socket.IO the instant it's detected.
 *
 * NOTE: this resets whenever the service restarts (deploys, crashes,
 * free-tier sleep/wake cycles). The real, permanent copy of every
 * message always stays on the mail server itself — this store is a
 * fast local cache, not the source of truth. If you need permanent
 * searchable history beyond what your mailbox already gives you,
 * point this service at a real database (e.g. the same Supabase
 * project used for users/invites) and write messages there instead
 * of (or in addition to) this array.
 */

const MAX_MESSAGES = 300;

let messages = [];
let connectionState = { status: 'pending', detail: 'Starting up…', updatedAt: new Date().toISOString() };

function addMessage(msg) {
  // De-dupe by uid in case of re-sync
  messages = messages.filter(m => m.uid !== msg.uid);
  messages.unshift(msg);
  if (messages.length > MAX_MESSAGES) messages.length = MAX_MESSAGES;
  return msg;
}

function addMessages(list) {
  list.forEach(addMessage);
}

function getMessages({ limit = 50, offset = 0 } = {}) {
  return messages.slice(offset, offset + limit);
}

function getMessageByUid(uid) {
  return messages.find(m => String(m.uid) === String(uid)) || null;
}

function markRead(uid) {
  const m = getMessageByUid(uid);
  if (m) m.unread = false;
  return m;
}

function setConnectionState(status, detail) {
  connectionState = { status, detail, updatedAt: new Date().toISOString() };
}

function getConnectionState() {
  return connectionState;
}

module.exports = {
  addMessage,
  addMessages,
  getMessages,
  getMessageByUid,
  markRead,
  setConnectionState,
  getConnectionState,
};
