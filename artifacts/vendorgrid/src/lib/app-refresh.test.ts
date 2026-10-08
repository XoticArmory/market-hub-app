import assert from "node:assert/strict";
import test from "node:test";
import { installAppRefresh } from "./app-refresh.ts";

test("entry/resume checks, form protection, offline handling and reload guards", async () => {
  const saved = new Map<string, PropertyDescriptor | undefined>();
  const replace = (name: string, value: unknown) => {
    saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, value });
  };
  class Element {
    isContentEditable = false;
    isConnected = true;
    form: Form | null = null;
    editable = false;
    matches() { return this.editable; }
    closest() { return this.form; }
  }
  class Form extends Element {}
  const windowMock = new EventTarget() as EventTarget & { location: { reload: () => void } };
  let reloads = 0;
  windowMock.location = { reload: () => { reloads++; } };
  const documentMock = Object.assign(new EventTarget(), {
    activeElement: null as Element | null,
    visibilityState: "visible",
  });
  const sw = Object.assign(new EventTarget(), {
    controller: null as object | null,
    register: async (_url: string, options: { updateViaCache: string }) => {
      assert.equal(options.updateViaCache, "none");
      return { update: async () => { checks++; } };
    },
  });
  let checks = 0;
  let resumes = 0;
  const navigatorMock = { serviceWorker: sw, onLine: true };
  let timer: (() => void) | undefined;
  let now = 1000;
  const originalNow = Date.now;
  replace("window", windowMock);
  replace("document", documentMock);
  replace("navigator", navigatorMock);
  replace("HTMLElement", Element);
  replace("HTMLFormElement", Form);
  replace("setTimeout", (callback: () => void) => { timer = callback; return 1; });
  Date.now = () => now;

  try {
    installAppRefresh({ serviceWorkerUrl: "/sw.js", onResume: () => { resumes++; } });
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(checks, 1, "check the worker immediately on entry");
    sw.controller = {};
    sw.dispatchEvent(new Event("controllerchange"));
    assert.equal(reloads, 0, "first installation must not reload");

    windowMock.dispatchEvent(new Event("vendorgrid:foreground"));
    windowMock.dispatchEvent(new Event("focus"));
    await Promise.resolve();
    assert.equal(resumes, 1, "deduplicate same-visit events");
    assert.equal(checks, 2);
    documentMock.visibilityState = "hidden";
    now += 2000;
    documentMock.dispatchEvent(new Event("visibilitychange"));
    assert.equal(resumes, 1, "ignore background events");
    documentMock.visibilityState = "visible";
    navigatorMock.onLine = false;
    windowMock.dispatchEvent(new Event("pageshow"));
    assert.equal(resumes, 2);
    assert.equal(checks, 2, "do not check workers offline");
    now += 2000;
    navigatorMock.onLine = true;
    windowMock.dispatchEvent(new Event("online"));
    await Promise.resolve();
    assert.equal(checks, 3, "retry when connectivity returns");

    const form = new Form();
    const input = new Element();
    input.form = form;
    input.editable = true;
    const edit = new Event("input");
    Object.defineProperty(edit, "target", { value: input });
    documentMock.dispatchEvent(edit);
    sw.dispatchEvent(new Event("controllerchange"));
    assert.equal(reloads, 0, "defer updates while a connected form is dirty");
    assert.ok(timer, "retry deferred reloads");
    form.isConnected = false; // e.g. save completed and the user navigated away
    documentMock.activeElement = input;
    timer!();
    assert.equal(reloads, 0, "also protect focused editable controls");
    documentMock.activeElement = null;
    timer!();
    assert.equal(reloads, 1, "apply the pending update once editing is finished");
    sw.dispatchEvent(new Event("controllerchange"));
    windowMock.dispatchEvent(new Event("focus"));
    assert.equal(reloads, 1, "never start repeated reloads in the same page");
  } finally {
    Date.now = originalNow;
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
});
