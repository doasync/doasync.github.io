import { useEffect } from "react";
import { showMiniChatToolbar, hideMiniChatToolbar } from "./model";

export function useMiniChatTextSelection() {
  useEffect(() => {
    function handleSelection() {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        hideMiniChatToolbar();
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Check if selection is inside a chat message element
      let node = selection.anchorNode as HTMLElement | null;
      while (node && node.nodeType !== 1) {
        node = node.parentElement;
      }
      if (!node) {
        hideMiniChatToolbar();
        return;
      }

      const isInChatMessage = node.closest(".chat-message");
      if (!isInChatMessage) {
        hideMiniChatToolbar();
        return;
      }

      const selectedText = selection.toString().trim();
      if (!selectedText) {
        hideMiniChatToolbar();
        return;
      }
      showMiniChatToolbar({
        x: rect.left + rect.width / 2 + window.scrollX,
        y: rect.bottom + window.scrollY,
        selectionText: selectedText,
      });
    } // End of handleSelection function

    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("keyup", handleSelection);
    document.addEventListener("touchend", handleSelection); // Add listener for touch devices

    const hideToolbarListener = () => hideMiniChatToolbar();
    document.addEventListener("scroll", hideToolbarListener, true);

    return () => {
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("keyup", handleSelection);
      document.removeEventListener("touchend", handleSelection); // Remove listener on cleanup
      document.removeEventListener("scroll", hideToolbarListener, true);
    };
  }, []);
}
