export type NativeNode = Node;

export class NativeNodeRegistry {

  private readonly nodes =
    new Map<number, NativeNode>();

  get size(): number {
    return this.nodes.size;
  }

  register(
    id: number,
    node: NativeNode,
  ): void {

    if (this.nodes.has(id)) {
      throw new Error(
        `Native node "${id}" is already registered.`,
      );
    }

    this.nodes.set(
      id,
      node,
    );
  }

  resolve<T extends NativeNode = NativeNode>(
    id: number,
  ): T {

    const node =
      this.nodes.get(id);

    if (!node) {
      throw new Error(
        `Native node "${id}" was not found.`,
      );
    }

    return node as T;
  }

  remove(
    id: number,
  ): NativeNode | undefined {

    const node =
      this.nodes.get(id);

    if (node) {
      this.nodes.delete(id);
    }

    return node;
  }

  has(
    id: number,
  ): boolean {
    return this.nodes.has(id);
  }

  clear(): void {
    this.nodes.clear();
  }

  values(): IterableIterator<NativeNode> {
    return this.nodes.values();
  }
}