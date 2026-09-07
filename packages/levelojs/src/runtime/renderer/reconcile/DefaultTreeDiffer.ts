import {
  RenderTree,
} from "../tree/RenderTree.js";

import {
  RenderTreeSnapshot,
} from "../snapshot/RenderTreeSnapshot.js";

import {
  InternalRenderNode,
} from "../tree/InternalRenderNode.js";

import {
  NodeSnapshot,
} from "../snapshot/NodeSnapshot.js";

import {
  OperationType,
  OperationBatch,
} from "../tree/operations/index.js";

import {
  TreeDiffer,
} from "./TreeDiffer.js";

import {
  NodeDiffer,
} from "./NodeDiffer.js";

import {
  DiffContext,
} from "./DiffContext.js";


export class DefaultTreeDiffer
  implements TreeDiffer {

  constructor(
    private readonly nodeDiffer:
      NodeDiffer,
  ) {}


  diff(
    previous:
      RenderTreeSnapshot | null,

    current:
      RenderTree,
  ): OperationBatch {

    const context =
      new DiffContext(
        previous,
        current,
      );


    /*
     * No root.
     */

    if (
      !current.root
    ) {

      return context.build();
    }


    /*
     * First render.
     */

    if (
      !previous
    ) {

      this.createSubtree(
        current.root,
        null,
        context,
      );

      return context.build();
    }


    /*
     * Existing tree. A root type change is a replacement too.
     */

    if (previous.root.type !== current.root.type) {
      this.deleteSubtree(previous.root, context);
      this.createSubtree(current.root, null, context);
      return context.build();
    }

    this.visit(
      current.root,
      context,
    );


    return context.build();
  }


  /*
   * ============================================================
   * VISIT
   * ============================================================
   */

  private visit(
    current:
      InternalRenderNode,

    context:
      DiffContext,
  ): void {

    const previous =
      context.findPrevious(
        current.id,
      );


    if (
      !previous
    ) {

      return;
    }


    /*
     * Diff node state.
     */

    context.addMany(
      this.nodeDiffer.diff(
        previous,
        current,
      ),
    );


    /*
     * Diff children.
     */

    this.diffChildren(
      previous,
      current,
      context,
    );
  }


  /*
   * ============================================================
   * CHILDREN
   * ============================================================
   */

  private diffChildren(
    previous:
      NodeSnapshot,

    current:
      InternalRenderNode,

    context:
      DiffContext,
  ): void {

    const previousChildren =
      previous.children;

    const currentChildren =
      current.children;


    const previousById =
      new Map<
        number,
        NodeSnapshot
      >();


    for (
      const child of previousChildren
    ) {

      previousById.set(
        child.id,
        child,
      );
    }


    const currentById =
      new Map<
        number,
        InternalRenderNode
      >();


    for (
      const child of currentChildren
    ) {

      currentById.set(
        child.id,
        child,
      );
    }


    /*
     * ==========================================================
     * REMOVALS
     * ==========================================================
     */

    for (
      const previousChild
        of previousChildren
    ) {

      if (
        currentById.has(
          previousChild.id,
        )
      ) {

        continue;
      }


      /*
       * If this old child has a new child
       * occupying its position, replacement
       * will be handled below.
       *
       * Do not emit RemoveChild here.
       */

      const index =
        previousChildren.indexOf(
          previousChild,
        );


      const currentChild =
        currentChildren[index];


      if (
        currentChild &&
        !previousById.has(
          currentChild.id,
        )
      ) {

        continue;
      }


      context.add({
        type:
          OperationType.RemoveChild,

        target:
          current.id,

        payload: {
          childId:
            previousChild.id,
        },
      });

      this.deleteSubtree(
        previousChild,
        context,
      );
    }


    /*
     * ==========================================================
     * CURRENT CHILDREN
     * ==========================================================
     */

    for (
      let index = 0;
      index < currentChildren.length;
      index++
    ) {

      const currentChild =
        currentChildren[index];


      const previousChild =
        previousChildren[index];


      /*
       * --------------------------------------------------------
       * NOTHING AT THIS POSITION BEFORE
       * --------------------------------------------------------
       */

      if (
        !previousChild
      ) {

        /*
         * If this node existed previously
         * under another position, it is
         * an ordering operation.
         */

        if (
          previousById.has(
            currentChild.id,
          )
        ) {

          continue;
        }


        this.createSubtree(
          currentChild,
          current.id,
          context,
        );


        continue;
      }


      /*
       * --------------------------------------------------------
       * SAME NODE
       * --------------------------------------------------------
       */

      if (
        previousChild.id ===
        currentChild.id
      ) {

        /*
         * Same identity but different type.
         */

        if (
          previousChild.type !==
          currentChild.type
        ) {

          this.replaceChild(
            current.id,
            previousChild,
            currentChild,
            context,
          );

        } else {

          this.visit(
            currentChild,
            context,
          );
        }


        continue;
      }


      /*
       * --------------------------------------------------------
       * DIFFERENT NODE AT SAME POSITION
       * --------------------------------------------------------
       *
       * This is the important case:
       *
       * previous:
       *   p#6
       *
       * current:
       *   section#10
       *
       * Therefore:
       *
       * ReplaceChild(6 -> 10)
       */

      const currentAlreadyExists =
        previousById.has(
          currentChild.id,
        );


      const previousStillExists =
        currentById.has(
          previousChild.id,
        );


      /*
       * Both nodes exist elsewhere.
       *
       * This is reordering.
       */

      if (
        currentAlreadyExists &&
        previousStillExists
      ) {

        continue;
      }


      /*
       * New node replacing old node.
       */

      if (
        !currentAlreadyExists &&
        !previousStillExists
      ) {

        this.replaceChild(
          current.id,
          previousChild,
          currentChild,
          context,
        );


        continue;
      }


      /*
       * New node while old node has moved.
       *
       * Create it. Ordering will be
       * handled by diffOrder().
       */

      if (
        !currentAlreadyExists
      ) {

        this.createSubtree(
          currentChild,
          current.id,
          context,
        );
      }
    }


    /*
     * ==========================================================
     * ORDER
     * ==========================================================
     */

    this.diffOrder(
      previousChildren,
      currentChildren,
      current.id,
      context,
    );
  }


  /*
   * ============================================================
   * CREATE SUBTREE
   * ============================================================
   */

  private createSubtree(
    node:
      InternalRenderNode,

    parentId:
      number | null,

    context:
      DiffContext,
  ): void {

    context.addMany(
      this.nodeDiffer.diff(
        null,
        node,
      ),
    );


    for (
      const child of node.children
    ) {

      this.createSubtree(
        child,
        node.id,
        context,
      );
    }


    if (
      parentId !== null
    ) {

      context.add({
        type:
          OperationType.AppendChild,

        target:
          parentId,

        payload: {
          childId:
            node.id,
        },
      });
    }
  }


  /*
   * ============================================================
   * DELETE SUBTREE
   * ============================================================
   */

  private deleteSubtree(
    node: NodeSnapshot,
    context: DiffContext,
  ): void {

    for (const child of node.children) {
      this.deleteSubtree(child, context);
    }

    context.add({
      type: OperationType.DeleteNode,
      target: node.id,
      payload: {},
    });
  }


  /*
   * ============================================================
   * REPLACE CHILD
   * ============================================================
   */

  private replaceChild(
    parentId:
      number,

    previous:
      NodeSnapshot,

    current:
      InternalRenderNode,

    context:
      DiffContext,
  ): void {

    /*
     * Create replacement node.
     */

    context.addMany(
      this.nodeDiffer.diff(
        null,
        current,
      ),
    );


    /*
     * Create replacement descendants.
     */

    for (
      const child of current.children
    ) {

      this.createSubtree(
        child,
        current.id,
        context,
      );
    }


    /*
     * Replace old node.
     */

    context.add({
      type:
        OperationType.ReplaceChild,

      target:
        parentId,

      payload: {
        oldChildId:
          previous.id,

        newChildId:
          current.id,
      },
    });

    this.deleteSubtree(
      previous,
      context,
    );
  }


  /*
   * ============================================================
   * ORDER
   * ============================================================
   */

  private diffOrder(
    previousChildren:
      readonly NodeSnapshot[],

    currentChildren:
      readonly InternalRenderNode[],

    parentId:
      number,

    context:
      DiffContext,
  ): void {

    const working =
      previousChildren
        .map(
          child =>
            child.id,
        )
        .filter(
          id =>
            currentChildren.some(
              child =>
                child.id === id,
            ),
        );


    const desired =
      currentChildren.map(
        child =>
          child.id,
      );


    if (
      working.length <= 1
    ) {

      return;
    }


    for (
      let index = 0;
      index < desired.length;
      index++
    ) {

      const desiredId =
        desired[index];


      const currentIndex =
        working.indexOf(
          desiredId,
        );


      if (
        currentIndex === index
      ) {

        continue;
      }


      if (
        currentIndex === -1
      ) {

        continue;
      }


      const beforeId =
        working[index];


      if (
        beforeId === undefined
      ) {

        continue;
      }


      context.add({
        type:
          OperationType.InsertBefore,

        target:
          parentId,

        payload: {
          childId:
            desiredId,

          beforeChildId:
            beforeId,
        },
      });


      working.splice(
        currentIndex,
        1,
      );


      working.splice(
        index,
        0,
        desiredId,
      );
    }
  }
}