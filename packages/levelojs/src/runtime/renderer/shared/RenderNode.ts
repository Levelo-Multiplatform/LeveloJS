export interface RenderNode {
  readonly id: number;

  readonly type: string;

  parent: RenderNode | null;

  readonly children: readonly RenderNode[];

  readonly props: ReadonlyMap<
    string,
    unknown
  >;

  readonly styles: ReadonlyMap<
    string,
    string
  >;

  readonly events: ReadonlyMap<
    string,
    EventListener
  >;
}