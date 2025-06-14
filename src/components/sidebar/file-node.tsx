"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  FileText,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Trash2,
  Star,
  ArrowUpRight,
  X,
  FilePen,
} from "lucide-react";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useStore, type FileItem } from "@/store/useCollectionStore";
import { usePanelStore } from "@/store/usePanelStore";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PDFImport } from "./pdf-import";
import { DeleteItemDialog } from "./delete-item-dialog";

export type FileNodeProps = {
  file: FileItem;
  level: number;
  childFiles: FileItem[];
  getChildFiles: (parentId: string) => FileItem[];
  onDragStart: (e: React.DragEvent, item: FileItem) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
  draggedItem: FileItem | null;
  setDropTarget: (id: string | null) => void;
  dropTarget: string | null;
  isDraggable?: boolean;
  defaultOpen?: boolean;
  onRequestCreate: (c: {
    parentId: string | null;
    type: FileItem["type"];
  }) => void;
  isCollection?: boolean;
};

export function FileNode({
  file,
  level,
  childFiles,
  getChildFiles,
  onDragStart,
  onDragEnd,
  onDrop,
  draggedItem,
  setDropTarget,
  dropTarget,
  isDraggable = false,
  onRequestCreate,
  isCollection = false,
}: FileNodeProps) {
  const {
    openFolders,
    setOpenFolders,
    activeItemId,
    moveToCollection,
  } = useStore();
  const { activePageId, addTab } = usePanelStore();
  const router = useRouter();
  const isOpen = openFolders.has(file.id);
  const isDragging = draggedItem?.id === file.id;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isPdfImportOpen, setIsPdfImportOpen] = React.useState(false);
  const isActive = file.id === activePageId;
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  const handleMoveToCollection = React.useCallback(async () => {
    await moveToCollection(file.id);
    toast.success("Moved to collection");
  }, [moveToCollection, file.id]);

  const handleDragStart = React.useCallback(
    (e: React.DragEvent) => {
      onDragStart(e, file);
    },
    [onDragStart, file]
  );

  const handleDragEnd = React.useCallback(() => {
    onDragEnd();
  }, [onDragEnd]);

  const handleDropHandler = React.useCallback(
    (e: React.DragEvent) => {
      onDrop(e, file.id);
    },
    [onDrop, file.id]
  );

  const handleDelete = React.useCallback(() => {
    setIsDeleteDialogOpen(true);
    setIsDropdownOpen(false);
  }, []);

  const handleImportPdf = React.useCallback((e: Event) => {
    e.preventDefault();
    setIsPdfImportOpen(true);
    setIsDropdownOpen(false);
  }, []);

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenFolders(file.id, !isOpen);
  };

  // Memoize file structure retrieval and file dragging logic
  const handleDragEnter = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  React.useEffect(() => {
    const handleClick = () => {
      if (draggedItem || dropTarget || activeItemId) {
        onDragEnd();
        setDropTarget(null);
        // setActiveItem(null);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [draggedItem, dropTarget, onDragEnd, setDropTarget, activeItemId]);

  return (
    <>
      <SidebarMenuItem
        className={cn(
          "transition-colors duration-100 cursor-pointer",
          isDragging && " cursor-grabbing"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          // Only  update the drop target if the dragged item is different and not the same as the current drop target
          if (
            draggedItem &&
            draggedItem.id !== file.id &&
            dropTarget !== file.id
          ) {
            setDropTarget(file.id); // Update the drop target only if it's different from the current state
          }
        }}
        onDrop={handleDropHandler}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        <SidebarMenuButton
          asChild
          isActive={isActive}
          draggable={isDraggable}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          className={cn(
            "flex items-center w-full py-1 px-2.5 rounded-md cursor-pointer",
            level > 0 && "ml-4",
            "hover:bg-muted/50"
            // isDropTarget && "bg-muted/50"
          )}
        >
          <div className="relative flex items-center w-full">
            {file.type !== "folder" ? (
              file.type === "note" ? (
                <FilePen />
              ) : (
                <FileText />
              )
            ) : (
              <FolderOpen />
            )}
            {(childFiles.length > 0 || file.type === "folder") && (
              <SidebarMenuAction
                showOnHover
                type="button"
                // variant="ghost"
                aria-label="Toggle Folder"
                // size="icon"
                className={cn(
                "absolute left-2 flex items-center justify-center z-10 transition-opacity",
                "opacity-0 hover:opacity-100",
                "bg-sidebar-accent text-sidebar-accent-foreground rounded-full"
              )}
              onClick={toggleOpen}
            >
                {isOpen ? <ChevronDown /> : <ChevronRight />}
              </SidebarMenuAction>
            )}
            <button
              type="button"
              className="ml-2 flex-1 truncate bg-transparent border-none p-0 text-left cursor-pointer"
              onClick={(e) => {
                if (file.type === "note" || file.type === "pdf") {
                  router.push(`/documents/${file.id}`);
                } else {
                  toggleOpen(e);
                }
              }}
            >
              {file.name}
            </button>
            <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction showOnHover>
                  <MoreHorizontal />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 rounded-lg"
                side="bottom"
                align="start"
              >
                <DropdownMenuItem>
                  <Star className="text-muted-foreground" />
                  <span>Add to Favorites</span>
                </DropdownMenuItem>
                {file.type === "folder" && (
                  <DropdownMenuItem
                    onSelect={() =>
                      onRequestCreate({ parentId: file.id, type: "folder" })
                    }
                  >
                    <Plus /> New Folder
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onSelect={() =>
                    onRequestCreate({ parentId: file.id, type: "note" })
                  }
                >
                  <Plus /> New Note
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleImportPdf}>
                  <Plus /> Import PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link href={file.id}>Copy Link</Link>
                </DropdownMenuItem>
                {file.type !== "folder" && (
                  <>
                    <DropdownMenuItem
                      onSelect={() =>
                        addTab(file.id, file.type as "note" | "pdf", "left")
                      }
                    >
                      <ArrowUpRight /> Open in Left Panel
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        addTab(file.id, file.type as "note" | "pdf", "middle")
                      }
                    >
                      <ArrowUpRight /> Open in Middle Panel
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                {!isCollection && file.type !== "folder" && (
                  <DropdownMenuItem onSelect={handleMoveToCollection}>
                    <X /> Move to Collection
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={handleDelete}>
                  <Trash2 /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <Collapsible
        open={isOpen}
        onOpenChange={() => setOpenFolders(file.id, !isOpen)}
      >
        <CollapsibleContent>
          <div className="border-l border-border ml-4 pl-2">
            {(childFiles.length > 0) ? (
              childFiles.map((child) => (
                <FileNode
                  key={child.id}
                  file={child}
                  level={level + 1}
                  childFiles={getChildFiles(child.id)}
                  getChildFiles={getChildFiles}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onDrop={onDrop}
                  draggedItem={draggedItem}
                  setDropTarget={setDropTarget}
                  dropTarget={dropTarget}
                  isDraggable={child.id !== null}
                  onRequestCreate={onRequestCreate}
                />
              ))
            ) : (
              file.type==="folder" && <div className="ml-4 py-1 italic text-sm text-muted-foreground truncate">
                No files inside
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <DeleteItemDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        itemName={file.name}
        itemId={file.id}
        itemType={file.type}
      />

      {isPdfImportOpen && (
        <PDFImport
          isOpen={isPdfImportOpen}
          onClose={() => setIsPdfImportOpen(false)}
        />
      )}
    </>
  );
}
