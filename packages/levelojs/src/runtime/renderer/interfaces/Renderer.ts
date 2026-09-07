import { RenderTree } from "../tree/RenderTree.js";

export interface Renderer {
  render(tree: RenderTree): void;
}
