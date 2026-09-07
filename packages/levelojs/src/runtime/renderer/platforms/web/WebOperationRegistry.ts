import {
  OperationType,
  RenderOperation,
} from "../../tree/operations/index.js";

import {
  NativeNodeRegistry,
} from "./NativeNodeRegistry.js";

import {
  WebOperationExecutor,
} from "./WebOperationExecutor.js";

import {
  CreateElementExecutor,
} from "./executors/CreateElementExecutor.js";

import {
  CreateTextExecutor,
} from "./executors/CreateTextExecutor.js";

import {
  AppendChildExecutor,
} from "./executors/AppendChildExecutor.js";

import {
  InsertBeforeExecutor,
} from "./executors/InsertBeforeExecutor.js";

import {
  RemoveChildExecutor,
} from "./executors/RemoveChildExecutor.js";

import {
  ReplaceChildExecutor,
} from "./executors/ReplaceChildExecutor.js";

import {
  SetPropertyExecutor,
} from "./executors/SetPropertyExecutor.js";

import {
  RemovePropertyExecutor,
} from "./executors/RemovePropertyExecutor.js";

import {
  SetStyleExecutor,
} from "./executors/SetStyleExecutor.js";

import {
  RemoveStyleExecutor,
} from "./executors/RemoveStyleExecutor.js";

import {
  AddEventListenerExecutor,
} from "./executors/AddEventListenerExecutor.js";

import {
  RemoveEventListenerExecutor,
} from "./executors/RemoveEventListenerExecutor.js";

import {
  SetTextExecutor,
} from "./executors/SetTextExecutor.js";

import {
  DeleteNodeExecutor,
} from "./executors/DeleteNodeExecutor.js";
import { OperationExecutorRegistry } from "../../operations/OperationExecutorRegistry.js";


export class WebOperationRegistry implements OperationExecutorRegistry {


  /*
   * ============================================================
   * EXECUTORS
   * ============================================================
   */

  private readonly executors =
    new Map<
      OperationType,
      WebOperationExecutor
    >();


  /*
   * ============================================================
   * CONSTRUCTOR
   * ============================================================
   */

  constructor(
    registry:
      NativeNodeRegistry,
  ) {


    /*
     * ----------------------------------------------------------
     * Creation
     * ----------------------------------------------------------
     */

    this.register(
      OperationType.CreateElement,
      new CreateElementExecutor(
        registry,
      ),
    );


    this.register(
      OperationType.CreateText,
      new CreateTextExecutor(
        registry,
      ),
    );

    this.register(
      OperationType.DeleteNode,
      new DeleteNodeExecutor(
        registry,
      ),
    );


    /*
     * ----------------------------------------------------------
     * Tree operations
     * ----------------------------------------------------------
     */

    this.register(
      OperationType.AppendChild,
      new AppendChildExecutor(
        registry,
      ),
    );


    this.register(
      OperationType.InsertBefore,
      new InsertBeforeExecutor(
        registry,
      ),
    );


    this.register(
      OperationType.RemoveChild,
      new RemoveChildExecutor(
        registry,
      ),
    );


    this.register(
      OperationType.ReplaceChild,
      new ReplaceChildExecutor(
        registry,
      ),
    );


    /*
     * ----------------------------------------------------------
     * Properties
     * ----------------------------------------------------------
     */

    this.register(
      OperationType.SetProperty,
      new SetPropertyExecutor(
        registry,
      ),
    );


    this.register(
      OperationType.RemoveProperty,
      new RemovePropertyExecutor(
        registry,
      ),
    );


    /*
     * ----------------------------------------------------------
     * Styles
     * ----------------------------------------------------------
     */

    this.register(
      OperationType.SetStyle,
      new SetStyleExecutor(
        registry,
      ),
    );


    this.register(
      OperationType.RemoveStyle,
      new RemoveStyleExecutor(
        registry,
      ),
    );


    /*
     * ----------------------------------------------------------
     * Events
     * ----------------------------------------------------------
     */

    this.register(
      OperationType.AddEventListener,
      new AddEventListenerExecutor(
        registry,
      ),
    );


    this.register(
      OperationType.RemoveEventListener,
      new RemoveEventListenerExecutor(
        registry,
      ),
    );


    /*
     * ----------------------------------------------------------
     * Text
     * ----------------------------------------------------------
     */

    this.register(
      OperationType.SetText,
      new SetTextExecutor(
        registry,
      ),
    );
  }


  /*
   * ============================================================
   * REGISTER
   * ============================================================
   */

  register(
    type:
      OperationType,

    executor:
      WebOperationExecutor,
  ): void {

    this.executors.set(
      type,
      executor,
    );
  }


  /*
   * ============================================================
   * RESOLVE
   * ============================================================
   */

  resolve(
    type:
      OperationType,
  ):
    WebOperationExecutor {

    const executor =
      this.executors.get(
        type,
      );


    if (!executor) {

      throw new Error(
        `No web operation executor registered for "${type}".`,
      );
    }


    return executor;
  }


  /*
   * ============================================================
   * EXECUTE
   * ============================================================
   */

  execute(
    operation:
      RenderOperation,
  ): void {

    const executor =
      this.resolve(
        operation.type,
      );


    /*
     * ----------------------------------------------------------
     * Execute operation
     * ----------------------------------------------------------
     */

    executor.execute(
      operation,
    );
  }

}