/**
 * SentinelAI Asynchronous Job Queue Service
 * Instantiates Bull queue backed by Redis to manage background scan workloads.
 */

const Queue = require('bull');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

console.log(`[queueService] Initializing Bull Queue with Redis at: ${REDIS_URL}`);

// Configure the primary URL scanning job queue
const urlScanQueue = new Queue('url-scan-queue', REDIS_URL, {
  defaultJobOptions: {
    attempts: 3, // Retry failed queries up to 3 times
    backoff: {
      type: 'exponential',
      delay: 5000, // Wait 5s before first retry
    },
    removeOnComplete: true, // Delete completed jobs to prevent memory bloat in Redis
    removeOnFail: false, // Keep failed jobs for diagnostic audits
  }
});

/**
 * Push a new URL scan job to the queue
 * @param {string} url Sanitized URL to inspect
 * @param {string|null} userId Owner Analyst ID (optional)
 * @param {string} scanId PostgreSQL Database Pre-saved Scan UUID
 * @returns {Promise<Object>} The enqueued Bull Job instance
 */
const addScanJob = async (url, userId, scanId) => {
  try {
    const job = await urlScanQueue.add({
      url,
      userId,
      scanId
    });
    console.log(`[queueService] Enqueued scan job (Job ID: ${job.id}, Scan UUID: ${scanId}) for: ${url}`);
    return job;
  } catch (err) {
    console.error(`[queueService] Failed to push job to Redis queue: ${err.message}`);
    throw new Error('Task queue failure: Unable to schedule security assessment.');
  }
};

module.exports = {
  urlScanQueue,
  addScanJob,
};
