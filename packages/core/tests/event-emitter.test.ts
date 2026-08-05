import { describe, expect, it, vi } from "vitest";

import { TypedEventEmitter } from "../src/events/TypedEventEmitter.ts";

interface TestEventMap {
  message: {
    text: string;
  };

  count: {
    value: number;
  };
}

describe("TypedEventEmitter", () => {
  it("event listener çalıştırmalıdır", async () => {
    const emitter = new TypedEventEmitter<TestEventMap>();

    const listener = vi.fn();

    emitter.on("message", listener);

    await emitter.emit("message", {
      text: "Merhaba",
    });

    expect(listener).toHaveBeenCalledWith({
      text: "Merhaba",
    });
  });

  it("unsubscribe fonksiyonu listenerı kaldırmalıdır", async () => {
    const emitter = new TypedEventEmitter<TestEventMap>();

    const listener = vi.fn();

    const unsubscribe = emitter.on("count", listener);

    unsubscribe();

    await emitter.emit("count", {
      value: 1,
    });

    expect(listener).not.toHaveBeenCalled();
  });

  it("once listener yalnızca bir kez çalışmalıdır", async () => {
    const emitter = new TypedEventEmitter<TestEventMap>();

    const listener = vi.fn();

    emitter.once("count", listener);

    await emitter.emit("count", {
      value: 1,
    });

    await emitter.emit("count", {
      value: 2,
    });

    expect(listener).toHaveBeenCalledTimes(1);

    expect(listener).toHaveBeenCalledWith({
      value: 1,
    });
  });

  it("off metodu listenerı kaldırmalıdır", async () => {
    const emitter = new TypedEventEmitter<TestEventMap>();

    const listener = vi.fn();

    emitter.on("message", listener);

    const removed = emitter.off("message", listener);

    expect(removed).toBe(true);

    await emitter.emit("message", {
      text: "Test",
    });

    expect(listener).not.toHaveBeenCalled();
  });

  it("listener hatası event yayınını reddetmemelidir", async () => {
    const emitter = new TypedEventEmitter<TestEventMap>();

    emitter.on("message", async () => {
      throw new Error("Listener hatası");
    });

    await expect(
      emitter.emit("message", {
        text: "Test",
      }),
    ).resolves.toBeUndefined();
  });

  it("listener sayısını döndürmelidir", () => {
    const emitter = new TypedEventEmitter<TestEventMap>();

    emitter.on("message", () => undefined);

    emitter.on("message", () => undefined);

    expect(emitter.listenerCount("message")).toBe(2);
  });
});
