import { searchBestMove } from "./Search";
import type {  Position  } from "../chess/Types";

self.onmessage = (e: MessageEvent) => {
  const { position, depth } = e.data as { position: Position, depth: number };

  try {
    const result = searchBestMove(position, depth);
    self.postMessage({ type: 'SUCCESS', result });
  } catch (error: any) {
    self.postMessage({ type: 'ERROR', error: error.message });
  }
};
