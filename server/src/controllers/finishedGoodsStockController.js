import { listFinishedGoodsStock } from '../services/finishedGoodsStockService.js';

export async function listFinishedGoods(req, res) {
  const result = await listFinishedGoodsStock({
    page: req.query.page,
    limit: req.query.limit,
    search: req.query.search?.trim() || req.query.q?.trim(),
    type: req.query.type?.trim(),
    sortBy: req.query.sortBy?.trim(),
    sortOrder: req.query.sortOrder?.trim(),
  });

  return res.status(200).json(result);
}
