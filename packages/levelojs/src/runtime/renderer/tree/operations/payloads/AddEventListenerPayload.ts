export interface AddEventListenerPayload {
    event: string;
    handler: EventListener;
    options?: EventListenerOptions | boolean;
}