import { generateReliably, type GenerateRequest } from './generate';

self.onmessage = (e: MessageEvent<GenerateRequest>) => {
  const { id, ...req } = e.data;
  try {
    self.postMessage({ id, puzzle: generateReliably(req) });
  } catch (err) {
    self.postMessage({ id, error: String(err) });
  }
};
