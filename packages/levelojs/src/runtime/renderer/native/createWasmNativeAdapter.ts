import { NativeAdapter } from "../platforms/native/NativeAdapter.js";
import { LeveloWasmBridge } from "./LeveloWasmBridge.js";

export async function createWasmNativeAdapter(): Promise<NativeAdapter> {
  const bridge = new LeveloWasmBridge();

  await bridge.initialize();

  return new NativeAdapter(bridge);
}