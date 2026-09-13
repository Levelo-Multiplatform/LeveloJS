import { OperationBatch } from "../../tree/operations/index.js";
import { PlatformAdapter } from "../PlatformAdapter.js";
import { WebOperationRegistry } from "./WebOperationRegistry.js";
import { NativeNodeRegistry } from "./NativeNodeRegistry.js";

export class WebAdapter implements PlatformAdapter<HTMLElement> {
  constructor(
    private readonly registry: WebOperationRegistry,
    private readonly nodes: NativeNodeRegistry,
  ) {}

  execute(batch: OperationBatch): void {
    for (const operation of batch) {
      this.registry.execute(operation);
    }
  }

  mount(host: HTMLElement, rootId: number): void {
    const root = this.nodes.resolve<Node>(rootId);
    if (root.parentNode !== host) {
      host.appendChild(root);
    }
  }

  unmount(host: HTMLElement, rootId: number): void {
    const root = this.nodes.resolve<Node>(rootId);
    if (root.parentNode === host) {
      host.removeChild(root);
    }
    this.nodes.remove(rootId);
  }
}
