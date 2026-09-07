export interface RemoveEventListenerPayload {
    event: string;
    handler: EventListener;
    options?: EventListenerOptions | boolean;
}