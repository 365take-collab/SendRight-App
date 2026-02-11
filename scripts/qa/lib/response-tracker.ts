import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { QA_CONFIG } from './config.js';

interface BaselineEntry {
  endpoint: string;
  avgMs: number;
  samples: number[];
  updatedAt: string;
}

interface Baselines {
  [endpoint: string]: BaselineEntry;
}

const MAX_SAMPLES = 20;

function loadBaselines(): Baselines {
  const filePath = QA_CONFIG.responseTime.baselineFile;
  if (!existsSync(filePath)) return {};
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return {};
  }
}

function saveBaselines(baselines: Baselines): void {
  const filePath = QA_CONFIG.responseTime.baselineFile;
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(baselines, null, 2), 'utf-8');
}

export function recordResponseTime(endpoint: string, responseMs: number): {
  isDegraded: boolean;
  avgMs: number;
  currentMs: number;
  threshold: number;
} {
  const baselines = loadBaselines();

  if (!baselines[endpoint]) {
    baselines[endpoint] = {
      endpoint,
      avgMs: responseMs,
      samples: [responseMs],
      updatedAt: new Date().toISOString(),
    };
    saveBaselines(baselines);
    return { isDegraded: false, avgMs: responseMs, currentMs: responseMs, threshold: responseMs * QA_CONFIG.responseTime.thresholdMultiplier };
  }

  const entry = baselines[endpoint];
  entry.samples.push(responseMs);
  if (entry.samples.length > MAX_SAMPLES) {
    entry.samples = entry.samples.slice(-MAX_SAMPLES);
  }
  entry.avgMs = Math.round(entry.samples.reduce((a, b) => a + b, 0) / entry.samples.length);
  entry.updatedAt = new Date().toISOString();
  saveBaselines(baselines);

  const threshold = entry.avgMs * QA_CONFIG.responseTime.thresholdMultiplier;
  return {
    isDegraded: responseMs > threshold,
    avgMs: entry.avgMs,
    currentMs: responseMs,
    threshold: Math.round(threshold),
  };
}
