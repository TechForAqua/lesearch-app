import { usePdf } from "@/anaralabs/lector";
import { ChevronUpIcon, MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "./icon";

const ZoomMenu = () => {
  const zoom = usePdf((state) => state.zoom);
  const setCustomZoom = usePdf((state) => state.updateZoom);
  const fitToWidth = usePdf((state) => state.zoomFitWidth);
  const { minZoom, maxZoom } = usePdf((state) => state.zoomOptions);

  const handleZoomDecrease = () => setCustomZoom((zoom) => Math.max(minZoom, zoom * 0.9));
  const handleZoomIncrease = () => setCustomZoom((zoom) => Math.min(maxZoom, zoom * 1.1));

  // Ensure zoom is a valid number and within bounds
  const displayZoom = Math.round(Math.min(Math.max(zoom, minZoom), maxZoom) * 100);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-1"
          aria-label="Zoom options"
        >
          {displayZoom}%
          <ChevronUpIcon className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-40">
        <DropdownMenuItem className="flex justify-between">
          <span>{`${displayZoom}%`}</span>
        </DropdownMenuItem>

        <Button
          variant="ghost"
          onClick={handleZoomDecrease}
          size="icon"
          aria-label="Zoom out"
        >
          <Icon as={MinusIcon} />
        </Button>

        <Button
          variant="ghost"
          onClick={handleZoomIncrease}
          size="icon"
          aria-label="Zoom in"
        >
          <Icon as={PlusIcon} />
        </Button>

        <DropdownMenuItem onSelect={() => fitToWidth()}>
          Page fit
        </DropdownMenuItem>

        {[0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4].map((zoomLevel) => (
          <DropdownMenuItem
            key={zoomLevel}
            onSelect={() => setCustomZoom(zoomLevel)}
          >
            {`${zoomLevel * 100}%`}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ZoomMenu;
