"use client";

import { useEffect } from "react";

export function BadgeRemover() {
  useEffect(() => {
    // Remove the emergent-badge if it exists
    const badge = document.querySelector("#emergent-badge");
    if (badge) {
      badge.remove();
    }
    
    // Also set up a MutationObserver to catch it if it's added dynamically
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.id === "emergent-badge" || element.querySelector("#emergent-badge")) {
              const badge = element.id === "emergent-badge" 
                ? element 
                : element.querySelector("#emergent-badge");
              if (badge) {
                badge.remove();
              }
            }
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    
    return () => {
      observer.disconnect();
    };
  }, []);
  
  return null;
}








