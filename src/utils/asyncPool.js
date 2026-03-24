/**
 * asyncPool — zero-dependency concurrency limiter (CommonJS)
 *
 * Runs `iteratorFn` over all `items` with at most `concurrency` tasks
 * running at the same time.  Returns an array of PromiseSettledResult objects
 * so callers can handle per-item failures without aborting the batch.
 *
 * @param {number}   concurrency  Max parallel tasks
 * @param {any[]}    items        Input array
 * @param {Function} iteratorFn   Async function receiving (item, index, items)
 * @returns {Promise<Array<{status:'fulfilled'|'rejected', value?: any, reason?: any}>>}
 */
async function asyncPool(concurrency, items, iteratorFn) {
  const results = [];
  const executing = new Set();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const p = Promise.resolve().then(() => iteratorFn(item, i, items));
    results.push(p);

    const e = p.then(() => executing.delete(e)).catch(() => executing.delete(e));
    executing.add(e);

    if (executing.size >= concurrency) {
      // Wait for the fastest running task to finish before adding another
      await Promise.race(executing);
    }
  }

  // Wait for all remaining tasks and collect settled results
  return Promise.allSettled(results);
}

module.exports = { asyncPool };
