import { InjectionToken } from "./InjectionToken.js";

export class RendererContainer {
  private readonly services = new Map<InjectionToken<unknown>, unknown>();

  provide<T>(token: InjectionToken<T>, value: T): this {
    this.services.set(token, value);
    return this;
  }

  resolve<T>(token: InjectionToken<T>): T {
    const value = this.services.get(token);
    if (value === undefined) {
      throw new Error(`[Levelo Renderer] Service not registered: ${token.description}`);
    }
    return value as T;
  }

  has<T>(token: InjectionToken<T>): boolean {
    return this.services.has(token);
  }
}
