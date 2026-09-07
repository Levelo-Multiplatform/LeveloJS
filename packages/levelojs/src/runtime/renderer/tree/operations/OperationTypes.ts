export enum OperationType {
  // Node Creation
  CreateElement,
  CreateText,

  // Tree Manipulation
  AppendChild,
  InsertBefore,
  ReplaceChild,
  RemoveChild,

  // Node Destruction
  DeleteNode,

  // Properties
  SetProperty,
  RemoveProperty,

  // Styles
  SetStyle,
  RemoveStyle,

  // Setting text
  SetText,

  // Events
  AddEventListener,
  RemoveEventListener,
}