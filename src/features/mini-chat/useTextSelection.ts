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

    // Use selectionchange event for more reliable detection
    document.addEventListener("selectionchange", handleSelection);

    const hideToolbarListener = () => hideMiniChatToolbar();
    document.addEventListener("scroll", hideToolbarListener, true);

    return () => {
      // Remove selectionchange listener
      document.removeEventListener("selectionchange", handleSelection);
      document.removeEventListener("scroll", hideToolbarListener, true);
    };
  }, []);
}
