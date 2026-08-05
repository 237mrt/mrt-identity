type EventListener<Payload> = (payload: Payload) => void | Promise<void>;

type UnknownEventListener = EventListener<unknown>;

export class TypedEventEmitter<EventMap extends object> {
  private readonly listeners = new Map<
    keyof EventMap,
    Set<UnknownEventListener>
  >();

  public on<EventName extends keyof EventMap>(
    eventName: EventName,
    listener: EventListener<EventMap[EventName]>,
  ): () => void {
    let eventListeners = this.listeners.get(eventName);

    if (!eventListeners) {
      eventListeners = new Set<UnknownEventListener>();

      this.listeners.set(eventName, eventListeners);
    }

    eventListeners.add(listener as UnknownEventListener);

    return () => {
      this.off(eventName, listener);
    };
  }

  public once<EventName extends keyof EventMap>(
    eventName: EventName,
    listener: EventListener<EventMap[EventName]>,
  ): () => void {
    const wrappedListener: EventListener<EventMap[EventName]> = async (
      payload,
    ) => {
      this.off(eventName, wrappedListener);

      await listener(payload);
    };

    return this.on(eventName, wrappedListener);
  }

  public off<EventName extends keyof EventMap>(
    eventName: EventName,
    listener: EventListener<EventMap[EventName]>,
  ): boolean {
    const eventListeners = this.listeners.get(eventName);

    if (!eventListeners) {
      return false;
    }

    const removed = eventListeners.delete(listener as UnknownEventListener);

    if (eventListeners.size === 0) {
      this.listeners.delete(eventName);
    }

    return removed;
  }

  public removeAllListeners<EventName extends keyof EventMap>(
    eventName?: EventName,
  ): void {
    if (eventName !== undefined) {
      this.listeners.delete(eventName);
      return;
    }

    this.listeners.clear();
  }

  public listenerCount<EventName extends keyof EventMap>(
    eventName: EventName,
  ): number {
    return this.listeners.get(eventName)?.size ?? 0;
  }

  public async emit<EventName extends keyof EventMap>(
    eventName: EventName,
    payload: EventMap[EventName],
  ): Promise<void> {
    const eventListeners = [...(this.listeners.get(eventName) ?? [])];

    /*
     * Event listener hataları ana kimlik doğrulama
     * işlemini bozmamalıdır.
     */
    await Promise.allSettled(
      eventListeners.map((listener) => listener(payload)),
    );
  }
}
