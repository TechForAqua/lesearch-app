import {
  autoUpdate,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
  size,
} from "@floating-ui/react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePdf } from "../internal";
import { createPortal } from "react-dom";

interface SelectionTooltipProps {
  children: React.ReactNode;
}

export const SelectionTooltip = ({ children }: SelectionTooltipProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const lastSelectionRef = useRef<Range | null>(null);
  const viewportRef = usePdf((state) => state.viewportRef);

  const { refs, floatingStyles, context } = useFloating({
    placement: "bottom",
    open: isOpen,
    onOpenChange: setIsOpen,
    whileElementsMounted: autoUpdate,
    strategy: "fixed",
    middleware: [
      offset(10),
      shift({ padding: 8 }),
      size({
        apply({  availableHeight, elements }) {
          // Set a fixed width and height for the tooltip
          Object.assign(elements.floating.style, {
            width: '200px',
            height: 'auto',
            maxHeight: `${availableHeight}px`,
          });
        },
      }),
    ],
  });

  const dismiss = useDismiss(context);
  const { getFloatingProps } = useInteractions([dismiss]);

  // Function to update tooltip position based on selection
  const updateTooltipPosition = useCallback(() => {
    const selection = document.getSelection();

    if (!selection || selection.isCollapsed) {
      setIsOpen(false);
      lastSelectionRef.current = null;
      return;
    }

    const range = selection.getRangeAt(0);
    if (!range) return;

    const rects = range.getClientRects();
    const lastRect = rects[rects.length - 1];

    lastSelectionRef.current = range;
    if (lastRect) {
      refs.setReference({
        getBoundingClientRect: () => ({
          width: lastRect.width,
          height: lastRect.height,
          x: lastRect.left,
          y: lastRect.bottom,
          top: lastRect.bottom,
          right: lastRect.right,
          bottom: lastRect.bottom + lastRect.height,
          left: lastRect.left,
        }),
        getClientRects: () => [lastRect],
      });
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [refs]);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = document.getSelection();

      if (selection && viewportRef.current?.contains(selection.anchorNode)) {
        const anchorNode = selection.anchorNode;
        const focusNode = selection.focusNode;
        
        const isInUnselectableArea = (node: Node | null): boolean => {
          if (!node) return false;
          
          let element = node.nodeType === Node.ELEMENT_NODE 
            ? node as Element 
            : node.parentElement;
            
          while (element) {
            if (element.getAttribute('data-annotation-tooltip')) {
              return true;
            }

            if (element.hasAttribute('data-floating-ui-portal')) {
              return true;
            }

            element = element.parentElement;
          }
          return false;
        };

        if (!isInUnselectableArea(anchorNode) && !isInUnselectableArea(focusNode)) {
          requestAnimationFrame(updateTooltipPosition);
        } else {
          setIsOpen(false);
        }
      } else {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (!isOpen || !lastSelectionRef.current) return;
      requestAnimationFrame(updateTooltipPosition);
    };

    const viewport = viewportRef.current;
    document.addEventListener("selectionchange", handleSelectionChange);

    if (viewport) {
      viewport.addEventListener("scroll", handleScroll, {
        passive: true,
      });
    }

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      if (viewport) {
        viewport.removeEventListener("scroll", handleScroll);
      }
    };
  }, [refs, isOpen, viewportRef, updateTooltipPosition]);

  useEffect(() => {
    const handleFloatingClick = (e: MouseEvent) => {
      if (refs.floating.current?.contains(e.target as Node)) {
        e.stopPropagation();
      }
    };

    document.addEventListener("click", handleFloatingClick);
    return () => document.removeEventListener("click", handleFloatingClick);
  }, [refs.floating]);

  return (
    <>
      {isOpen && viewportRef.current && createPortal(
        <div
          ref={refs.setFloating}
          style={{
            ...floatingStyles,
            position: 'fixed',
            zIndex: 50,
          }}
          {...getFloatingProps()}
          className="bg-popover rounded-md border shadow-md p-1"
        >
          {children}
        </div>,
        viewportRef.current
      )}
    </>
  );
};
