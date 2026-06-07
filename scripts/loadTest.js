const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5001/api';
const CONCURRENCY = process.env.CONCURRENCY || 50;
const DURATION_MS = process.env.DURATION || 10000;

const metrics = {
  totalRequests: 0,
  success: 0,
  failed: 0,
  latencies: [],
};

async function hitRecommendation() {
  const start = Date.now();
  try {
    await axios.get(`${API_URL}/products?recommendation=true&limit=6`);
    metrics.success++;
    metrics.latencies.push(Date.now() - start);
  } catch (error) {
    metrics.failed++;
    console.error(`[Error] ${error.message}`);
  } finally {
    metrics.totalRequests++;
  }
}

async function runTest() {
  console.log(`🚀 Starting Load Test on ${API_URL}`);
  console.log(`👥 Concurrency: ${CONCURRENCY} | ⏱️ Duration: ${DURATION_MS}ms`);

  const startTime = Date.now();
  const tasks = [];

  // Continuous execution for DURATION_MS
  const testInterval = setInterval(async () => {
    if (Date.now() - startTime > DURATION_MS) {
      clearInterval(testInterval);
      return;
    }

    // Spawn concurrent workers
    for (let i = 0; i < CONCURRENCY; i++) {
      tasks.push(hitRecommendation());
    }
  }, 1000); // 50 requests per second

  // Wait for duration to finish
  await new Promise(resolve => setTimeout(resolve, DURATION_MS + 2000));
  await Promise.all(tasks);

  printResults();
}

function printResults() {
  const sortedLatencies = metrics.latencies.sort((a, b) => a - b);
  const avg = sortedLatencies.reduce((a, b) => a + b, 0) / sortedLatencies.length || 0;
  const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0;
  const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0;

  console.log('\n--- Load Test Results ---');
  console.log(`Total Requests: ${metrics.totalRequests}`);
  console.log(`✅ Success: ${metrics.success}`);
  console.log(`❌ Failed: ${metrics.failed}`);
  console.log(`⏱️ Avg Latency: ${avg.toFixed(2)}ms`);
  console.log(`⏱️ p95 Latency: ${p95}ms`);
  console.log(`⏱️ p99 Latency: ${p99}ms`);
  console.log('-------------------------\n');
}

runTest();
