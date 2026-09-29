import { DefaultRenderer } from "../DefaultRenderer.js";
import { createWasmNativeAdapter } from "./createWasmNativeAdapter.js";

export async function createWasmRenderer(): Promise<DefaultRenderer> {
  const adapter = await createWasmNativeAdapter();

  return new DefaultRenderer(adapter);
}