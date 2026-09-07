import { OperationType } from "./OperationTypes.js";

import {
  CreateElementPayload,
  CreateTextPayload,
  AppendChildPayload,
  RemoveChildPayload,
  ReplaceChildPayload,
  InsertBeforePayload,
  SetPropertyPayload,
  RemovePropertyPayload,
  SetStylePayload,
  RemoveStylePayload,
  SetTextPayload,
  AddEventListenerPayload,
  RemoveEventListenerPayload,
} from "./payloads/index.js";

export type RenderOperation =
  | {
      type: OperationType.CreateElement;
      target: number;
      payload: CreateElementPayload;
    }
  | {
      type: OperationType.DeleteNode;
      target: number;
      payload: Record<string, never>;
    }
  | {
      type: OperationType.CreateText;
      target: number;
      payload: CreateTextPayload;
    }
  | {
      type: OperationType.AppendChild;
      target: number;
      payload: AppendChildPayload;
    }
  | {
      type: OperationType.RemoveChild;
      target: number;
      payload: RemoveChildPayload;
    }
  | {
      type: OperationType.ReplaceChild;
      target: number;
      payload: ReplaceChildPayload;
    }
  | {
      type: OperationType.InsertBefore;
      target: number;
      payload: InsertBeforePayload;
    }
  | {
      type: OperationType.SetProperty;
      target: number;
      payload: SetPropertyPayload;
    }
  | {
      type: OperationType.RemoveProperty;
      target: number;
      payload: RemovePropertyPayload;
    }
  | {
      type: OperationType.SetStyle;
      target: number;
      payload: SetStylePayload;
    }
  | {
      type: OperationType.RemoveStyle;
      target: number;
      payload: RemoveStylePayload;
    }
  | {
      type: OperationType.AddEventListener;
      target: number;
      payload: AddEventListenerPayload;
    }
  | {
      type: OperationType.RemoveEventListener;
      target: number;
      payload: RemoveEventListenerPayload;
    }
  | {
    type: OperationType.SetText;
    target: number;
    payload: SetTextPayload;
  }

  // Extracts a specific RenderOperation from the union by its OperationType.
  export type RenderOperationOf<
    T extends OperationType,
  > = Extract<
    RenderOperation,
    {
      type: T;
    }
  >;