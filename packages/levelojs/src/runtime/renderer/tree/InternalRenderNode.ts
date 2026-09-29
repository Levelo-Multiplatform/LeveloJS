import { RenderNode } from "../interfaces/RenderNode.js";

export interface DynamicChildBinding {
  readonly getter: () => unknown;
  readonly initialValue: unknown;
  readonly position: number;
  readonly initialLength: number;
  current: InternalRenderNode[];
  lastValue: unknown;
}

export class InternalRenderNode
  implements RenderNode {

  parent:
    InternalRenderNode | null = null;

  readonly children:
    InternalRenderNode[] = [];

  readonly props =
    new Map<
      string,
      unknown
    >();

  readonly styles =
    new Map<
      string,
      string
    >();

  readonly events =
    new Map<
      string,
      EventListener
    >();

  /** Reactive property expressions captured during element creation. */
  readonly reactiveProps =
    new Map<string, () => unknown>();

  /** Reactive style expressions captured during element creation. */
  readonly reactiveStyles =
    new Map<string, () => unknown>();

  /** Reactive event expressions captured during element creation. */
  readonly reactiveEvents =
    new Map<string, () => unknown>();

  /** Reactive text expressions owned by this node. */
  reactiveText: (() => unknown) | null = null;

  /** Dynamic child expressions owned by this node. */
  readonly dynamicChildren: DynamicChildBinding[] = [];

  constructor(
    readonly id: number,
    readonly type: string,
  ) {}

  appendChild(
    child: InternalRenderNode,
  ): void {

    /*
     * If the child already belongs to
     * another parent, detach it first.
     */
    if (
      child.parent &&
      child.parent !== this
    ) {

      child.parent.removeChild(
        child,
      );

    }

    /*
     * Prevent duplicate insertion.
     */
    const existingIndex =
      this.children.indexOf(
        child,
      );

    if (
      existingIndex !== -1
    ) {

      this.children.splice(
        existingIndex,
        1,
      );

    }

    child.parent =
      this;

    this.children.push(
      child,
    );
  }

  removeChild(
    child: InternalRenderNode,
  ): void {

    const index =
      this.children.indexOf(
        child,
      );

    if (
      index === -1
    ) {

      return;

    }

    this.children.splice(
      index,
      1,
    );

    child.parent =
      null;
  }

  insertBefore(
    child: InternalRenderNode,
    before: InternalRenderNode,
  ): void {

    /*
     * If child is already inside this
     * parent, remove it first so that
     * moving it does not duplicate it.
     */
    const existingIndex =
      this.children.indexOf(
        child,
      );

    if (
      existingIndex !== -1
    ) {

      this.children.splice(
        existingIndex,
        1,
      );

    } else if (
      child.parent &&
      child.parent !== this
    ) {

      child.parent.removeChild(
        child,
      );

    }

    const beforeIndex =
      this.children.indexOf(
        before,
      );

    /*
     * If the reference node does not
     * exist, insert at the end.
     */
    if (
      beforeIndex === -1
    ) {

      child.parent =
        this;

      this.children.push(
        child,
      );

      return;
    }

    child.parent =
      this;

    this.children.splice(
      beforeIndex,
      0,
      child,
    );
  }

  /*
   * DOM-style signature:
   *
   * replaceChild(
   *   newChild,
   *   oldChild,
   * )
   */
  replaceChild(
    newChild: InternalRenderNode,
    oldChild: InternalRenderNode,
  ): void {

    const index =
      this.children.indexOf(
        oldChild,
      );

    if (
      index === -1
    ) {

      return;

    }

    /*
     * If the new child already belongs
     * to another parent, detach it.
     */
    if (
      newChild.parent &&
      newChild.parent !== this
    ) {

      newChild.parent.removeChild(
        newChild,
      );

    }

    /*
     * If the new child is already in this
     * parent's children, remove it before
     * inserting it at the replacement
     * position.
     */
    const existingNewIndex =
      this.children.indexOf(
        newChild,
      );

    if (
      existingNewIndex !== -1 &&
      existingNewIndex !== index
    ) {

      this.children.splice(
        existingNewIndex,
        1,
      );

      /*
       * Removing an earlier item shifts
       * the replacement index.
       */
      const adjustedIndex =
        existingNewIndex < index
          ? index - 1
          : index;

      this.children[
        adjustedIndex
      ] = newChild;

      oldChild.parent =
        null;

      newChild.parent =
        this;

      return;
    }

    oldChild.parent =
      null;

    newChild.parent =
      this;

    this.children[
      index
    ] = newChild;
  }
}