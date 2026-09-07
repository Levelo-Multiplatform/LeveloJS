import {
  OperationType,
  RenderOperation,
} from "../tree/operations/index.js";

import {
  InternalRenderNode,
} from "../tree/InternalRenderNode.js";

import {
  NodeSnapshot,
} from "../snapshot/NodeSnapshot.js";

import {
  NodeDiffer,
} from "./NodeDiffer.js";


export class DefaultNodeDiffer
  implements NodeDiffer {

  diff(
    previous:
      NodeSnapshot | null,

    current:
      InternalRenderNode,
  ): readonly RenderOperation[] {

    const operations:
      RenderOperation[] = [];


    /*
     * ============================================================
     * NEW NODE
     * ============================================================
     *
     * A new node requires its complete initial state.
     *
     * Create
     * Properties
     * Styles
     * Events
     */

    if (!previous) {

      this.createNode(
        current,
        operations,
      );

      return operations;
    }


    /*
     * ============================================================
     * TEXT NODE
     * ============================================================
     */

    if (
      previous.type === "#text" &&
      current.type === "#text"
    ) {

      this.diffText(
        previous,
        current,
        operations,
      );

      return operations;
    }


    /*
     * ============================================================
     * ELEMENT NODE
     * ============================================================
     */

    if (
      previous.type !== "#text" &&
      current.type !== "#text"
    ) {

      this.diffProperties(
        previous,
        current,
        operations,
      );

      this.diffStyles(
        previous,
        current,
        operations,
      );

      this.diffEvents(
        previous,
        current,
        operations,
      );
    }


    return operations;
  }


  /*
   * ============================================================
   * CREATE NODE
   * ============================================================
   */

  private createNode(
    node:
      InternalRenderNode,

    operations:
      RenderOperation[],
  ): void {

    /*
     * ------------------------------------------------------------
     * Text node
     * ------------------------------------------------------------
     */

    if (
      node.type === "#text"
    ) {

      operations.push({
        type:
          OperationType.CreateText,

        target:
          node.id,

        payload: {
          text:
            String(
              node.props.get(
                "text",
              ) ?? "",
            ),
        },
      });

      return;
    }


    /*
     * ------------------------------------------------------------
     * Element node
     * ------------------------------------------------------------
     */

    operations.push({
      type:
        OperationType.CreateElement,

      target:
        node.id,

      payload: {
        type:
          node.type,
        props: Object.fromEntries(node.props),
      },
    });


    /*
     * ------------------------------------------------------------
     * Initial properties
     * ------------------------------------------------------------
     */

    for (
      const [
        key,
        value,
      ] of node.props
    ) {

      /*
       * Text is only meaningful
       * for text nodes.
       */

      if (
        key === "text" ||
        key === "__namespace"
      ) {

        continue;
      }


      operations.push({
        type:
          OperationType.SetProperty,

        target:
          node.id,

        payload: {
          key,
          value,
        },
      });
    }


    /*
     * ------------------------------------------------------------
     * Initial styles
     * ------------------------------------------------------------
     */

    for (
      const [
        property,
        value,
      ] of node.styles
    ) {

      operations.push({
        type:
          OperationType.SetStyle,

        target:
          node.id,

        payload: {
          property,
          value,
        },
      });
    }


    /*
     * ------------------------------------------------------------
     * Initial events
     * ------------------------------------------------------------
     */

    for (
      const [
        event,
        handler,
      ] of node.events
    ) {

      operations.push({
        type:
          OperationType.AddEventListener,

        target:
          node.id,

        payload: {
          event,
          handler,
        },
      });
    }
  }


  /*
   * ============================================================
   * TEXT
   * ============================================================
   */

  private diffText(
    previous:
      NodeSnapshot,

    current:
      InternalRenderNode,

    operations:
      RenderOperation[],
  ): void {

    const previousText =
      String(
        previous.props.get(
          "text",
        ) ?? "",
      );


    const currentText =
      String(
        current.props.get(
          "text",
        ) ?? "",
      );


    if (
      previousText ===
      currentText
    ) {

      return;
    }


    operations.push({
      type:
        OperationType.SetText,

      target:
        current.id,

      payload: {
        text:
          currentText,
      },
    });
  }


  /*
   * ============================================================
   * PROPERTIES
   * ============================================================
   */

  private diffProperties(
    previous:
      NodeSnapshot,

    current:
      InternalRenderNode,

    operations:
      RenderOperation[],
  ): void {

    /*
     * ----------------------------------------------------------
     * Add or update properties.
     * ----------------------------------------------------------
     */

    for (
      const [
        key,
        value,
      ] of current.props
    ) {

      if (
        key === "text" ||
        key === "__namespace"
      ) {

        continue;
      }


      const previousValue =
        previous.props.get(
          key,
        );


      if (
        previousValue ===
        value
      ) {

        continue;
      }


      operations.push({
        type:
          OperationType.SetProperty,

        target:
          current.id,

        payload: {
          key,
          value,
        },
      });
    }


    /*
     * ----------------------------------------------------------
     * Remove deleted properties.
     * ----------------------------------------------------------
     */

    for (
      const key of previous.props.keys()
    ) {

      if (
        key === "text" ||
        key === "__namespace"
      ) {

        continue;
      }


      if (
        current.props.has(
          key,
        )
      ) {

        continue;
      }


      operations.push({
        type:
          OperationType.RemoveProperty,

        target:
          current.id,

        payload: {
          key,
        },
      });
    }
  }


  /*
   * ============================================================
   * STYLES
   * ============================================================
   */

  private diffStyles(
    previous:
      NodeSnapshot,

    current:
      InternalRenderNode,

    operations:
      RenderOperation[],
  ): void {

    /*
     * ----------------------------------------------------------
     * Add or update styles.
     * ----------------------------------------------------------
     */

    for (
      const [
        property,
        value,
      ] of current.styles
    ) {

      const previousValue =
        previous.styles.get(
          property,
        );


      if (
        previousValue ===
        value
      ) {

        continue;
      }


      operations.push({
        type:
          OperationType.SetStyle,

        target:
          current.id,

        payload: {
          property,
          value,
        },
      });
    }


    /*
     * ----------------------------------------------------------
     * Remove deleted styles.
     * ----------------------------------------------------------
     */

    for (
      const property
        of previous.styles.keys()
    ) {

      if (
        current.styles.has(
          property,
        )
      ) {

        continue;
      }


      operations.push({
        type:
          OperationType.RemoveStyle,

        target:
          current.id,

        payload: {
          property,
        },
      });
    }
  }


  /*
   * ============================================================
   * EVENTS
   * ============================================================
   */

  private diffEvents(
    previous:
      NodeSnapshot,

    current:
      InternalRenderNode,

    operations:
      RenderOperation[],
  ): void {

    /*
     * ----------------------------------------------------------
     * Add or update events.
     * ----------------------------------------------------------
     */

    for (
      const [
        event,
        handler,
      ] of current.events
    ) {

      const previousHandler =
        previous.events.get(
          event,
        );


      /*
       * Nothing changed.
       */

      if (
        previousHandler ===
        handler
      ) {

        continue;
      }


      /*
       * Remove previous handler
       * when the handler changed.
       */

      if (
        previousHandler
      ) {

        operations.push({
          type:
            OperationType.RemoveEventListener,

          target:
            current.id,

          payload: {
            event,

            handler:
              previousHandler,
          },
        });
      }


      /*
       * Add current handler.
       */

      operations.push({
        type:
          OperationType.AddEventListener,

        target:
          current.id,

        payload: {
          event,
          handler,
        },
      });
    }


    /*
     * ----------------------------------------------------------
     * Remove handlers that no longer exist.
     * ----------------------------------------------------------
     */

    for (
      const [
        event,
        handler,
      ] of previous.events
    ) {

      if (
        current.events.has(
          event,
        )
      ) {

        continue;
      }


      operations.push({
        type:
          OperationType.RemoveEventListener,

        target:
          current.id,

        payload: {
          event,
          handler,
        },
      });
    }
  }

}