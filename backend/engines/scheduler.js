import cron from 'node-cron';
import { runShortageDetection } from './shortage.js';
import { runAnomalyDetection } from './anomaly.js';
import { runHotItemDetection } from './hotItems.js';
import { runForecasting } from './forecasting.js';

const engines = [
  { name: 'Shortage detection',  fn: runShortageDetection },
  { name: 'Anomaly detection',   fn: runAnomalyDetection },
  { name: 'Hot item detection',  fn: runHotItemDetection },
  { name: 'Forecasting',         fn: runForecasting },
];

async function runAll() {
  console.log('=== VoltStore AI Engine starting ===');
  for (const { name, fn } of engines) {
    try {
      await fn();
      console.log(`✓ ${name} complete`);
    } catch (e) {
      console.error(`✗ ${name} failed:`, e.message);
    }
  }
  console.log('=== All engines complete ===');
}

export function startScheduler() {
  // Run immediately on server start
  runAll().catch(e => console.error('Initial AI run failed:', e));

  // Then run every hour at minute 0
  cron.schedule('0 * * * *', () => {
    runAll().catch(e => console.error('Scheduled AI run failed:', e));
  });

  console.log('🤖 AI Engine scheduler started — running every hour');
}
