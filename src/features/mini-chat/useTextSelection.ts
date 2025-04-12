import { useEffect, useRef } from "react"; // Import useRef
import { EventPayload } from "effector"; // Import useRef
import { showMiniChatToolbar, hideMiniChatToolbar } from "./model";

export function useMiniChatTextSelection() {
  // Ref must be called at the top level of the hook
  const lastPointerCoordsRef = useRef({ x: 0, y: 0 });
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Ref to store the coordinates of the last mouseup/touchend event - MOVED OUTSIDE
    // const lastPointerCoordsRef = useRef({ x: 0, y: 0 });

    // Handler to capture and update the last known pointer/touch coordinates
    const updateLastPointerCoords = (event: MouseEvent | TouchEvent) => {
      let clientX: number;
      let clientY: number;

      if (event instanceof MouseEvent) {
        clientX = event.clientX;
        clientY = event.clientY;
        // For touch events, check touches for move/start, changedTouches for end
      } else if ("touches" in event && event.touches.length > 0) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
      } else if ("changedTouches" in event && event.changedTouches.length > 0) {
        // Fallback for touchend using changedTouches
        clientX = event.changedTouches[0].clientX;
        clientY = event.changedTouches[0].clientY;
      } else {
        // Unable to get coordinates, keep previous
        clientX = lastPointerCoordsRef.current.x;
        clientY = lastPointerCoordsRef.current.y;
      }
      lastPointerCoordsRef.current = { x: clientX, y: clientY };
    };

    function cancelMiniChatToolbar() {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      hideMiniChatToolbar();
    }

    function handleSelection() {
      cancelMiniChatToolbar();

      const delay = 400;

      // Debounce mini chat toolbar
      debounceTimeoutRef.current = setTimeout(() => {
        const selection = window.getSelection();

        if (!selection || selection.isCollapsed) {
          cancelMiniChatToolbar();
          return;
        }

        // We no longer need getBoundingClientRect for positioning
        // const range = selection.getRangeAt(0);
        // const rect = range.getBoundingClientRect();

        // Check if selection is inside a chat message element
        let node = selection.anchorNode as HTMLElement | null;
        while (node && node.nodeType !== 1) {
          node = node.parentElement;
        }
        if (!node) {
          cancelMiniChatToolbar();
          return;
        }

        const isInChatMessage = node.closest(".chat-message");
        if (!isInChatMessage) {
          cancelMiniChatToolbar();
          return;
        }

        const selectedText = selection.toString().trim();
        if (!selectedText) {
          cancelMiniChatToolbar();
          return;
        }

        // Use the stored pointer coordinates with offset
        const finalX = lastPointerCoordsRef.current.x + window.scrollX - 40; // Offset left 8px
        const finalY = lastPointerCoordsRef.current.y + window.scrollY + 16; // Offset down 8px

        // Debounce the showMiniChatToolbar call
        showMiniChatToolbar({
          x: finalX,
          y: finalY,
          selectionText: selectedText,
        });
      }, delay);
    } // End of handleSelection function

    // Use selectionchange event for more reliable detection
    // Add listeners to continuously capture pointer/touch position
    document.addEventListener("mousedown", updateLastPointerCoords);
    document.addEventListener("mousemove", updateLastPointerCoords);
    document.addEventListener("touchstart", updateLastPointerCoords, {
      passive: true,
    }); // Use passive for touchmove performance
    document.addEventListener("touchmove", updateLastPointerCoords, {
      passive: true,
    });
    // Keep up/end listeners as well for final position capture
    document.addEventListener("mouseup", updateLastPointerCoords);
    document.addEventListener("touchend", updateLastPointerCoords);

    document.addEventListener("selectionchange", handleSelection);

    const hideToolbarListener = () => hideMiniChatToolbar();
    document.addEventListener("scroll", hideToolbarListener, true);

    return () => {
      // Remove selectionchange listener
      // Remove all added listeners
      document.removeEventListener("mousedown", updateLastPointerCoords);
      document.removeEventListener("mousemove", updateLastPointerCoords);
      document.removeEventListener("touchstart", updateLastPointerCoords);
      document.removeEventListener("touchmove", updateLastPointerCoords);
      document.removeEventListener("mouseup", updateLastPointerCoords);
      document.removeEventListener("touchend", updateLastPointerCoords);
      document.removeEventListener("selectionchange", handleSelection);
      document.removeEventListener("scroll", hideToolbarListener, true);
    };
  }, []);
}
