import { InternalRenderNode } from "./InternalRenderNode.js";

export class NodeFactory {

  createElement(
    id: number,
    type: string,
  ): InternalRenderNode {

    return new InternalRenderNode(
      id,
      type,
    );
  }

  createText(
    id: number,
    text: string,
  ): InternalRenderNode {

    const node =
      new InternalRenderNode(
        id,
        "#text",
      );

    node.props.set(
      "text",
      text,
    );

    return node;
  }

}