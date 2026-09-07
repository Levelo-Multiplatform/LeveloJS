export class NodeSnapshot {

  constructor(
    readonly id: number,
    readonly type: string,
    readonly props: ReadonlyMap<
      string,
      unknown
    >,
    readonly styles: ReadonlyMap<
      string,
      string
    >,
    readonly events: ReadonlyMap<
      string,
      EventListener
    >,
    readonly children:
      readonly NodeSnapshot[],
  ) {}

}