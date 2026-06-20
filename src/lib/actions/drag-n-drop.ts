import type { Action } from "svelte/action";

/** The viewport point where a drag was released. */
export type DropPoint = { clientX: number; clientY: number };
type DropHandler = (data: any, point: DropPoint) => void;

// Pointer-based drag-and-drop. Native HTML5 DnD never fires on touch devices and
// behaves inconsistently across browsers, so we drive it with pointer events
// instead — the same model the board already uses to move tokens. Dropzones
// register here so a drag started on any draggable can find its target on release.
const dropzones = new Map<HTMLElement, DropHandler>();

function dropHandlerAt(x: number, y: number): DropHandler | undefined {
  const el = document.elementFromPoint(x, y);
  if (!el) return undefined;
  for (const [node, handler] of dropzones) {
    if (node.contains(el)) return handler;
  }
  return undefined;
}

export const draggable: Action<HTMLElement, any> = (node, data) => {
  let ghost: HTMLElement | null = null;
  let half = { x: 0, y: 0 };

  function moveGhost(x: number, y: number) {
    if (ghost) ghost.style.transform = `translate(${x - half.x}px, ${y - half.y}px)`;
  }

  function onPointerMove(event: PointerEvent) {
    moveGhost(event.clientX, event.clientY);
  }

  function onPointerUp(event: PointerEvent) {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    ghost?.remove();
    ghost = null;
    dropHandlerAt(event.clientX, event.clientY)?.(data, {
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }

  function onPointerDown(event: PointerEvent) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();

    const rect = node.getBoundingClientRect();
    half = { x: rect.width / 2, y: rect.height / 2 };

    ghost = node.cloneNode(true) as HTMLElement;
    Object.assign(ghost.style, {
      position: "fixed",
      left: "0",
      top: "0",
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      margin: "0",
      pointerEvents: "none",
      opacity: "0.8",
      zIndex: "50",
    });
    document.body.appendChild(ghost);
    moveGhost(event.clientX, event.clientY);

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  // Prevent the browser from scrolling/panning while a touch drag is in progress.
  node.style.touchAction = "none";
  node.addEventListener("pointerdown", onPointerDown);

  return {
    update(newData) {
      data = newData;
    },
    destroy() {
      node.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      ghost?.remove();
    },
  };
};

export const dropzone: Action<HTMLElement, DropHandler> = (node, handler) => {
  dropzones.set(node, handler);
  return {
    update(newHandler) {
      dropzones.set(node, newHandler);
    },
    destroy() {
      dropzones.delete(node);
    },
  };
};
