// index.ts - Node-Isolated Levelo JS Compiler Plugin
// CommonJS format mirroring vite-plugin-solid

import { createFilter, FilterPattern, Plugin } from "vite";

import babel, { PluginObj, NodePath } from "@babel/core";
import * as t from "@babel/types";

import syntaxJsx from "@babel/plugin-syntax-jsx";
import transformTypescript from "@babel/plugin-transform-typescript";

interface LeveloPluginOptions {
  include?: FilterPattern;
  exclude?: FilterPattern;
}

/**
 * Enterprise-Grade Vite Plugin for Levelo JS.
 */
export function leveloPlugin(
  options: LeveloPluginOptions = {},
): Plugin {
  const filter = createFilter(options.include, options.exclude);
  let projectRoot = process.cwd();

  return {
    name: "vite-plugin-levelojs",
    enforce: "pre",

    async config(userConfig) {
      projectRoot = userConfig.root || process.cwd();

      return {
        optimizeDeps: {
          include: ["levelojs"],
          rolldownOptions: {
            transform: {
              jsx: "preserve",
            },
          },
        },
      };
    },

    async transform(source: string, id: string) {
      if (!filter(id)) return null;

      const cleanId = id.replace(/\?.*$/, "");

      if (!/\.[mc]?[tj]sx$/i.test(cleanId)) {
        return null;
      }

      const isTypescript = /\.[mc]?tsx$/i.test(cleanId);

      const babelPlugins: any[] = [syntaxJsx];

      if (isTypescript) {
        babelPlugins.push([
          transformTypescript,
          { isTSX: true },
        ]);
      }

      babelPlugins.push(leveloJsBabelTransformer);

      const babelOpts = {
        root: projectRoot,
        filename: cleanId,
        sourceFileName: cleanId,
        plugins: babelPlugins,
        ast: false,
        sourceMaps: true,
        configFile: false,
        babelrc: false,
      };

      try {
        const result = await babel.transformAsync(
          source,
          babelOpts,
        );

        if (!result) return null;

        return {
          code: result.code || "",
          map: result.map,
        };
      } catch (err: any) {
        this.error(
          `[Levelo Compiler Error] ${cleanId} processing failed:\n${err.message}`,
        );

        return null;
      }
    },
  };
}

/**
 * Event props must remain direct values.
 *
 * Normal JSX event handlers such as:
 *
 *   onClick={() => setValue(value() + 1)}
 *
 * are passed directly to the runtime so they can be stored in
 * InternalRenderNode.events.
 */
function isEventProp(name: string): boolean {
  return /^on[A-Z]/.test(name) || /^on[a-z]/.test(name);
}

/**
 * Shared Top-Down Recursive JSX Transformer.
 *
 * Recursively injects namespaces into children elements.
 */
function transformJSX(
  path: NodePath<t.JSXElement>,
  types: typeof t,
  parentNamespace: string | null = null,
): t.CallExpression {
  const openingElement = path.node.openingElement;

  const tagName = (
    openingElement.name as t.JSXIdentifier
  ).name;

  const isSvg = tagName === "svg";
  const isMath = tagName === "math";

  const namespace =
    parentNamespace ||
    (isSvg ? "svg" : isMath ? "math" : null);

  const isComponent =
    tagName[0] === tagName[0].toUpperCase();

  const factoryIdentifier = isComponent
    ? types.identifier(tagName)
    : types.stringLiteral(tagName);

  const properties: (
    | t.ObjectProperty
    | t.ObjectMethod
  )[] = [];

  openingElement.attributes.forEach((attr) => {
    if (!types.isJSXAttribute(attr)) {
      return;
    }

    const propName = attr.name.name as string;
    const propKey = types.identifier(propName);

    /*
     * Boolean JSX attributes:
     *
     *   <button disabled />
     */
    if (!attr.value) {
      properties.push(
        types.objectProperty(
          propKey,
          types.booleanLiteral(true),
        ),
      );

      return;
    }

    /*
     * String JSX attributes:
     *
     *   <div id="app" />
     */
    if (!types.isJSXExpressionContainer(attr.value)) {
      properties.push(
        types.objectProperty(
          propKey,
          attr.value as t.Expression,
        ),
      );

      return;
    }

    const expression = attr.value.expression;

    if (types.isJSXEmptyExpression(expression)) {
      return;
    }

    /*
     * Event handlers are intentionally NOT converted into getters.
     *
     * This:
     *
     *   onClick={() => setValue(value() + 1)}
     *
     * must become:
     *
     *   onClick: () => setValue(value() + 1)
     *
     * rather than:
     *
     *   get onClick() {
     *     return () => setValue(value() + 1)
     *   }
     *
     * The runtime uses direct event functions for node.events.
     */
    if (isEventProp(propName)) {
      properties.push(
        types.objectProperty(
          propKey,
          expression as t.Expression,
        ),
      );

      return;
    }

    /*
     * Non-event JSX expressions remain lazy.
     *
     * This preserves Levelo's fine-grained binding model for
     * reactive props without turning event handlers into accessors.
     */
    properties.push(
      types.objectMethod(
        "get",
        propKey,
        [],
        types.blockStatement([
          types.returnStatement(
            expression as t.Expression,
          ),
        ]),
      ),
    );
  });

  /*
   * Inject __namespace when an active namespace is detected.
   */
  if (namespace) {
    properties.push(
      types.objectProperty(
        types.identifier("__namespace"),
        types.stringLiteral(
          namespace === "svg"
            ? "http://www.w3.org/2000/svg"
            : "http://www.w3.org/1998/Math/MathML",
        ),
      ),
    );
  }

  const propsObject = types.objectExpression(properties);

  const children: t.Expression[] = [];
  const childPaths = path.get("children");

  path.node.children.forEach((child, index) => {
    if (types.isJSXText(child)) {
      const cleanText = child.value.trim();

      if (cleanText) {
        children.push(
          types.stringLiteral(cleanText),
        );
      }

      return;
    }

    if (types.isJSXExpressionContainer(child)) {
      const expression = child.expression;

      if (!types.isJSXEmptyExpression(expression)) {
        /*
         * JSX expressions become lazy getters so signals can update
         * only the binding that consumed them.
         */
        children.push(
          types.arrowFunctionExpression(
            [],
            expression as t.Expression,
          ),
        );
      }

      return;
    }

    if (types.isJSXElement(child)) {
      const transformedChild = transformJSX(
        childPaths[index] as NodePath<t.JSXElement>,
        types,
        namespace,
      );

      children.push(transformedChild);
    }
  });

  const callExpression = types.callExpression(
    types.identifier("h"),
    [
      factoryIdentifier,
      propsObject,
      ...children,
    ],
  );

  path.replaceWith(callExpression as any);
  path.skip();

  return callExpression;
}

/**
 * Deep AST Transformation Node Visitor.
 */
function leveloJsBabelTransformer({
  types,
}: {
  types: typeof t;
}): PluginObj {
  return {
    name: "levelojs-jsx-transformer",

    visitor: {
      Program: {
        enter(path: NodePath<t.Program>) {
          const hasHImport = path.node.body.some(
            (node) =>
              types.isImportDeclaration(node) &&
              node.source.value === "levelojs" &&
              node.specifiers.some(
                (specifier) =>
                  types.isImportSpecifier(specifier) &&
                  types.isIdentifier(specifier.imported) &&
                  specifier.imported.name === "h",
              ),
          );

          if (!hasHImport) {
            path.unshiftContainer(
              "body",
              types.importDeclaration(
                [
                  types.importSpecifier(
                    types.identifier("h"),
                    types.identifier("h"),
                  ),
                ],
                types.stringLiteral("levelojs"),
              ),
            );
          }
        },
      },

      JSXElement(path: NodePath<t.JSXElement>) {
        transformJSX(path, types, null);
      },
    },
  };
}