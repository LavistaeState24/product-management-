import Counter from '../models/Counter.js';

export const ORDER_COUNTER_NAME = 'orderNo';

export function formatOrderNo(sequence) {
  return `ORD-${String(sequence).padStart(4, '0')}`;
}

export async function getNextSequence(name, { session } = {}) {
  let query = Counter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    },
  );

  if (session) {
    query = query.session(session);
  }

  const counter = await query;
  return counter.seq;
}

export async function generateOrderNo(options = {}) {
  const sequence = await getNextSequence(ORDER_COUNTER_NAME, options);
  return formatOrderNo(sequence);
}
