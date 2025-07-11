import { useGesture } from "@use-gesture/react";
import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { usePdf } from "../../internal";
import { clamp } from "../../lib/clamp";
import { firstMemo } from "../../lib/memo";

export const useViewportContainer = ({
  containerRef,
  elementWrapperRef,
  elementRef,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  elementWrapperRef: RefObject<HTMLDivElement | null>;
  elementRef: RefObject<HTMLDivElement | null>;
}) => {
  const [origin, setOrigin] = useState<[number, number]>([0, 0]);

  const { maxZoom, minZoom } = usePdf((state) => state.zoomOptions);
  const zoom = usePdf((state) => state.zoom);
  const viewportRef = usePdf((state) => state.viewportRef);

  const setIsPinching = usePdf((state) => state.setIsPinching);
  const updateZoom = usePdf((state) => state.updateZoom);

  useEffect(() => {
    viewportRef.current = containerRef.current;
  }, [containerRef, viewportRef]);

  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      updateZoom((prevZoom) => {
        if (Number.isNaN(prevZoom) || !Number.isFinite(prevZoom)) {
          return minZoom;
        }
        const newZoom = prevZoom * delta;
        if (Number.isNaN(newZoom) || !Number.isFinite(newZoom)) {
          return prevZoom;
        }
        return Math.min(Math.max(newZoom, minZoom), maxZoom);
      });
    }
  }, [updateZoom, minZoom, maxZoom]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [containerRef, handleWheel]);

  const transformations = useRef<{
    translateX: number;
    translateY: number;
    zoom: number;
  }>({
    translateX: 0,
    translateY: 0,
    zoom,
  });

  const updateTransform = useCallback(
    (zoomUpdate?: boolean) => {
      if (
        !elementRef.current ||
        !containerRef.current ||
        !elementWrapperRef.current
      ) {
        return;
      }

      const { zoom, translateX, translateY } = transformations.current;

      elementRef.current.style.transform = `scale3d(${zoom}, ${zoom}, 1)`;

      const elementBoundingBox = elementRef.current.getBoundingClientRect();

      const width = elementBoundingBox.width;

      elementWrapperRef.current.style.width = `${width}px`;
      elementWrapperRef.current.style.height = `${elementBoundingBox.height}px`;

      containerRef.current.scrollTop = translateY;
      containerRef.current.scrollLeft = translateX;

      if (zoomUpdate) updateZoom(() => transformations.current.zoom);
    },
    [containerRef, elementRef, elementWrapperRef, updateZoom],
  );

  useEffect(() => {
    if (transformations.current.zoom === zoom || !containerRef.current) {
      return;
    }

    const dZoom = zoom / transformations.current.zoom;

    transformations.current = {
      translateX: containerRef.current.scrollLeft * dZoom,
      translateY: containerRef.current.scrollTop * dZoom,
      zoom,
    };

    updateTransform();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, zoom]);

  useLayoutEffect(() => {
    updateTransform();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const preventDefault = (e: TouchEvent) => e.preventDefault();

    // @ts-expect-error Could be null
    document.addEventListener("gesturestart", preventDefault);
    // @ts-expect-error Could be null
    document.addEventListener("gesturechange", preventDefault);

    return () => {
      // @ts-expect-error Could be null
      document.removeEventListener("gesturestart", preventDefault);
      // @ts-expect-error Could be null
      document.removeEventListener("gesturechange", preventDefault);
    };
  });

  useGesture(
    {
      onPinch: ({ origin, first, movement: [ms], memo }) => {
        const newMemo = firstMemo(first, memo, () => {
          const elementRect = elementRef.current!.getBoundingClientRect();
          const containerRect = containerRef.current!.getBoundingClientRect();

          const contentPosition: [number, number] = [
            origin[0] - elementRect.left,
            origin[1] - elementRect.top,
          ];

          const containerPosition: [number, number] = [
            origin[0] - containerRect.left,
            origin[1] - containerRect.top,
          ];

          setOrigin([
            contentPosition[0] / transformations.current.zoom,
            contentPosition[1] / transformations.current.zoom,
          ]);

          return {
            contentPosition,
            containerPosition,
            originZoom: transformations.current.zoom,
            originTranslate: transformations.current.translateY,
          };
        });

        const newZoom = clamp(ms * newMemo.originZoom, minZoom, maxZoom);

        const realMs = newZoom / newMemo.originZoom;

        const newTranslateX =
          newMemo.contentPosition[0] * realMs - newMemo.containerPosition[0];
        const newTranslateY =
          newMemo.contentPosition[1] * realMs - newMemo.containerPosition[1];

        transformations.current = {
          zoom: newZoom,
          translateX: newTranslateX,
          translateY: newTranslateY,
        };

        updateTransform(true);

        return newMemo;
      },
      onPinchStart: () => setIsPinching(true),
      onPinchEnd: () => setIsPinching(false),
    },
    {
      target: containerRef,
    },
  );

  return {
    origin,
  };
};
