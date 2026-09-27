import { CAROUSEL_GENERATION_CONCURRENCY } from "@/lib/social-media/contentModes";

export function createGenerationQueue(concurrency = CAROUSEL_GENERATION_CONCURRENCY) {
  const pending = [];
  let active = 0;

  function pump() {
    while (active < concurrency && pending.length) {
      const job = pending.shift();
      active += 1;
      Promise.resolve()
        .then(() => job.run())
        .then(job.resolve, job.reject)
        .finally(() => {
          active -= 1;
          pump();
        });
    }
  }

  return {
    enqueue(run) {
      return new Promise((resolve, reject) => {
        pending.push({ run, resolve, reject });
        pump();
      });
    },
  };
}
