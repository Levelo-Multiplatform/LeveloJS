// index.ts - Node-Isolated Levelo JS Compiler Plugin (CommonJS format mirroring vite-plugin-solid)
import { createFilter, FilterPattern, Plugin } from 'vite';
import babel, { PluginObj, NodePath } from '@babel/core';
import * as t from '@babel/types';
import syntaxJsx from '@babel/plugin-syntax-jsx';
import transformTypescript from '@babel/plugin-transform-typescript';

// Define the interface for options parameter
interface LeveloPluginOptions {
  include?: FilterPattern;
  exclude?: FilterPattern;
}


/**
 * Helper utility to isolate file extension identifiers safely.
 * function getExtension(filename) {
 * const index = filename.lastIndexOf('.');
 * return index < 0 ? '' : filename.substring(index).replace(/\?.+$/, '');
 * }
 */


/**
 * Enterprise-Grade Vite Plugin for Levelo JS.
 * @param {LeveloPluginOptions} options - Levelo Compiler Options
 * @returns {Plugin} - Official Vite Plugin Type
 */
export function leveloPlugin(options: LeveloPluginOptions = {}): Plugin {
  const filter = createFilter(options.include, options.exclude);
  let projectRoot: string = process.cwd();

  return {
    name: 'vite-plugin-levelojs',
    enforce: 'pre', // Process JSX before any other plugin intercepts

    async config(userConfig) {
      projectRoot = userConfig.root || process.cwd();
      return {
        optimizeDeps: {
          include: ['levelojs'],
          rolldownOptions: {
            transform: {
              jsx: 'preserve' // Prevent Rolldown from injecting React runtimes
            }
          }
        }
      };
    },

    async transform(source: string, id: string) {
      if (!filter(id)) return null;

      const cleanId = id.replace(/\?.*$/, '');
      if (!/\.[mc]?[tj]sx$/i.test(cleanId)) return null;

      const isTypescript = /\.[mc]?tsx$/i.test(cleanId);
      const babelPlugins: any = [syntaxJsx];

      if (isTypescript) {
        babelPlugins.push([transformTypescript, { isTSX: true }]);
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
        babelrc: false
      };

      try {
        const result = await babel.transformAsync(source, babelOpts);
        if (!result) return null;
        return { code: result.code|| '', map: result.map };
      } catch (err: any) {
        this.error(`[Levelo Compiler Error] ${cleanId} processing failed:\n${err.message}`);
        return null;
      }
    }
  };
}

/**
 * Shared Top-Down Recursive JSX Transformer.
 * Recursively injects namespaces into children elements.
 */

function transformJSX(
  path: NodePath<t.JSXElement>,
  types: typeof t,
  parentNameSpace: string | null = null,
): t.CallExpression {
  const openingElement = path.node.openingElement;
  const tagName = (openingElement.name as t.JSXIdentifier).name;

  const isSvg = tagName === 'svg';
  const isMath = tagName === 'math';

  const namespace = 
    parentNameSpace || 
    (isSvg ? 'svg' : isMath ? 'math' : null);

  const isComponent = tagName[0] === tagName[0].toUpperCase();
  const factoryIdentifier = isComponent ? types.identifier(tagName) : types.stringLiteral(tagName);

  const properties: (t.ObjectProperty | t.ObjectMethod)[] = [];
  openingElement.attributes.forEach(attr => {
    if (types.isJSXAttribute(attr)) {
      const propKey = types.identifier(attr.name.name as string);

      if (types.isJSXExpressionContainer(attr.value)) {
        const expression = attr.value.expression;
        const getterProperty = types.objectMethod(
          'get',
          propKey,
          [],
          types.blockStatement([types.returnStatement(expression as t.Expression)])
        );
        properties.push(getterProperty);
      }
      else if (attr.value) {
        properties.push(types.objectProperty(propKey, attr.value as t.Expression));
      }
      else {
        properties.push(types.objectProperty(propKey, types.booleanLiteral(true)));
      }
    }
  });

  // Inject __namespace property into attributes if an active namespace is detected
  if (namespace) {
    properties.push(types.objectProperty(
      types.identifier("__namespace"),
      types.stringLiteral(
        namespace === "svg" ? "http://www.w3.org/2000/svg" : "http://www.w3.org/1998/Math/MathML"
      )
    ));
  }

  const propsObject = types.objectExpression(properties);
  const children: any[] = [];
  const childPaths = path.get('children');

  path.node.children.forEach((child, index) => {
    if (types.isJSXText(child)) {
      const cleanText = child.value.trim();
      if (cleanText) {
        children.push(types.stringLiteral(cleanText));
      }
    }
    else if (types.isJSXExpressionContainer(child)) {
      const expression = child.expression;
      if (!types.isJSXEmptyExpression(expression)) {
        // JSX expressions become lazy getters so signals can update only the
        // binding that consumed them instead of rerunning the component.
        children.push(
          types.arrowFunctionExpression(
            [],
            expression as t.Expression,
          ),
        );
      }
    }
    // Recursively transform nested JSX elements while passing types (t) and the active namespace context
    else if (types.isJSXElement(child)) {
      const transformedChild = transformJSX(childPaths[index] as NodePath<t.JSXElement>, types, namespace);
      children.push(transformedChild);
    }
  });

  const callExpression = types.callExpression(types.identifier('h'), [
    factoryIdentifier,
    propsObject,
    ...children
  ]);

  path.replaceWith(callExpression as any);
  path.skip();

  return callExpression;
}

/**
 * Deep AST Transformation Node Visitor.
 */
function leveloJsBabelTransformer({ types }: {types: typeof t} ): PluginObj {
  return {
    name: 'levelojs-jsx-transformer',
    visitor: {
      JSXElement(path: any) {
        // Root elements start with a null parent namespace context, passing down babel types (t)
        transformJSX(path, types, null);
      }
    }
  };
}
