"use client"

import * as React from "react"
import { Command } from "cmdk"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  FileText,
  Search,
  FilePen,
  MoreHorizontal,
  ArrowUpRight,
  ListX,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useStore } from "@/store/useCollectionStore";
import { usePanelStore } from "@/store/usePanelStore";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SearchDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState("all")
  const [activeDropdownId, setActiveDropdownId] = React.useState<string | null>(null)
  const { allItems } = useStore();
  const { addTab } = usePanelStore();
  const router = useRouter();

  // Generate a unique key for each item
  const getItemKey = React.useCallback((item: typeof allItems[0], index: number) => {
    return `${item.id}-${index}`;
  }, []);

  // Get folder path for an item
  const getFolderPath = React.useCallback((item: typeof allItems[0]): string => {
    if (!item.parentId) return "";
    
    const path: string[] = [];
    let currentId = item.parentId;
    
    while (currentId) {
      const parent = allItems.find(i => i.id === currentId);
      if (!parent) break;
      path.unshift(parent.name);
      currentId = parent.parentId || "";
    }
    
    return path.length > 0 ? path.join(" / ") : "";
  }, [allItems]);

  // Filter items based on search query and category
  const filteredItems = React.useMemo(() => {
    const query = search.toLowerCase();
    
    // If no search query, show all items of selected category
    if (!search) {
      return allItems.filter(item => {
        const matchesCategory = selectedCategory === "all" || item.type === selectedCategory;
        const isFile = item.type === "pdf" || item.type === "note";
        return matchesCategory && isFile;
      });
    }
    
    // If there's a search query, filter by both search and category
    return allItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(query);
      const matchesCategory = selectedCategory === "all" || item.type === selectedCategory;
      const isFile = item.type === "pdf" || item.type === "note";
      return matchesSearch && matchesCategory && isFile;
    });
  }, [search, selectedCategory, allItems]);

  // Group items by type for display
  const groupedResults = React.useMemo(() => {
    const groups = {
      pages: [] as typeof allItems,
      files: [] as typeof allItems
    };

    for (const item of filteredItems) {
      if (item.type === "note") {
        groups.pages.push(item);
      } else if (item.type === "pdf") {
        groups.files.push(item);
      }
    }

    return groups;
  }, [filteredItems]);

  const handleItemClick = (item: typeof allItems[0], e: React.MouseEvent) => {
    // Prevent click if it's from dropdown menu
    if (e.target instanceof HTMLElement && e.target.closest('[role="menuitem"]')) {
      e.preventDefault();
      return;
    }
    console.log("Item clicked-->", item);
    router.push(`/documents/${item.id}`);
    setOpen(false);
  };

  const handleOpenInPanel = (item: typeof allItems[0], panel: "left" | "middle") => {
    setActiveDropdownId(null);
    if (item.type === "pdf" || item.type === "note") {
      addTab(item.id, item.type, panel);
      setOpen(false);
    }
  };

  const categories = [
    { id: "all", name: "All", icon: <Search className="w-4 h-4" /> },
    { id: "note", name: "Notes", icon: <FilePen className="w-4 h-4" /> },
    { id: "pdf", name: "Pdfs", icon: <FileText className="w-4 h-4" /> }
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogHeader>
        <VisuallyHidden.Root asChild>
          <DialogTitle>Search</DialogTitle>
        </VisuallyHidden.Root>
      </DialogHeader>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0">
        <div className="flex flex-col h-[600px]">
          <Command className="rounded-t-lg border-none" shouldFilter={false}>
            <div className="flex items-center px-3 border-b mr-3 w-11/12">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <Command.Input
                placeholder="Search notes and PDFs..."
                className="flex h-14 w-full rounded-md bg-transparent py-3 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                value={search}
                onValueChange={setSearch}
              />
              {search && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2 text-muted-foreground hover:text-foreground" 
                  onClick={() => setSearch("")}
                >
                  <ListX className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Categories section */}
            <div className="border-b">
              <div className="flex items-center gap-2 p-2 overflow-x-auto">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => {
                      setSelectedCategory(category.id);
                      // Clear search when switching categories
                      setSearch("");
                    }}
                  >
                    {category.icon}
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>

            <Command.List className="p-0 overflow-hidden">
              <ScrollArea className="h-[450px]">
                {!search ? (
                  <>
                    {/* Show all items of selected category */}
                    {(selectedCategory === "all" || selectedCategory === "note") && groupedResults.pages.length > 0 && (
                      <div className="px-3 pt-4 pb-2">
                        <div className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                          <FilePen className="h-4 w-4 text-blue-500" />
                          Notes
                        </div>
                        <div className="space-y-1">
                          {groupedResults.pages.map((item, index) => (
                            <Command.Item
                              key={getItemKey(item, index)}
                              className="group px-2 py-2 rounded-md cursor-pointer flex items-center justify-between hover:bg-muted/50"
                              onClick={(e) => handleItemClick(item, e)}
                            >
                              <div className="flex items-center gap-2">
                                {item.type === "note" ? (
                                  <FilePen className="w-4 h-4 text-blue-500" />
                                ) : (
                                  <FileText className="w-4 h-4 text-red-500" />
                                )}
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">{item.name}</span>
                                  {getFolderPath(item) ? (
                                    <span className="text-xs text-muted-foreground">
                                      {getFolderPath(item)}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      My Collection
                                    </span>
                                  )}
                                </div>
                                <Badge variant="outline" className="ml-2 text-xs font-normal">
                                  {item.type}
                                </Badge>
                              </div>
                              <DropdownMenu 
                                open={activeDropdownId === item.id} 
                                onOpenChange={(isOpen) => setActiveDropdownId(isOpen ? item.id : null)}
                              >
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem
                                    className="cursor-pointer hover:bg-muted"
                                    onSelect={() => handleOpenInPanel(item, "left")}
                                  >
                                    <ArrowUpRight className="mr-2 h-4 w-4" />
                                    Open in Left Panel
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="cursor-pointer hover:bg-muted"
                                    onSelect={() => handleOpenInPanel(item, "middle")}
                                  >
                                    <ArrowUpRight className="mr-2 h-4 w-4" />
                                    Open in Middle Panel
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </Command.Item>
                          ))}
                        </div>
                      </div>
                    )}

                    {(selectedCategory === "all" || selectedCategory === "pdf") && groupedResults.files.length > 0 && (
                      <div className="px-3 pt-4 pb-2">
                        <div className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-red-500" />
                          PDFs
                        </div>
                        <div className="space-y-1">
                          {groupedResults.files.map((item, index) => (
                            <Command.Item
                              key={getItemKey(item, index)}
                              className="group px-2 py-2 rounded-md cursor-pointer flex items-center justify-between hover:bg-muted/50"
                              onClick={(e) => handleItemClick(item, e)}
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-red-500" />
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">{item.name}</span>
                                  {getFolderPath(item) ? (
                                    <span className="text-xs text-muted-foreground">
                                      {getFolderPath(item)}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      My Collection
                                    </span>
                                  )}
                                </div>
                              </div>
                              <DropdownMenu 
                                open={activeDropdownId === item.id} 
                                onOpenChange={(isOpen) => setActiveDropdownId(isOpen ? item.id : null)}
                              >
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem
                                    className="cursor-pointer hover:bg-muted"
                                    onSelect={() => handleOpenInPanel(item, "left")}
                                  >
                                    <ArrowUpRight className="mr-2 h-4 w-4" />
                                    Open in Left Panel
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="cursor-pointer hover:bg-muted"
                                    onSelect={() => handleOpenInPanel(item, "middle")}
                                  >
                                    <ArrowUpRight className="mr-2 h-4 w-4" />
                                    Open in Middle Panel
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </Command.Item>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Search results */}
                    {(selectedCategory === "all" || selectedCategory === "note") && groupedResults.pages.length > 0 && (
                      <div className="px-3 pt-4 pb-2">
                        <div className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                          <FilePen className="h-4 w-4 text-blue-500" />
                          Notes
                        </div>
                        <div className="space-y-1">
                          {groupedResults.pages.map((item, index) => (
                            <Command.Item
                              key={getItemKey(item, index)}
                              className="group px-2 py-2 rounded-md cursor-pointer flex items-center justify-between hover:bg-muted/50"
                              onClick={(e) => handleItemClick(item, e)}
                            >
                              <div className="flex items-center gap-2">
                                <FilePen className="w-4 h-4 text-blue-500" />
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">{item.name}</span>
                                  {getFolderPath(item) ? (
                                    <span className="text-xs text-muted-foreground">
                                      {getFolderPath(item)}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      My Collection
                                    </span>
                                  )}
                                </div>
                              </div>
                              <DropdownMenu 
                                open={activeDropdownId === item.id} 
                                onOpenChange={(isOpen) => setActiveDropdownId(isOpen ? item.id : null)}
                              >
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem
                                    className="cursor-pointer hover:bg-muted"
                                    onSelect={() => handleOpenInPanel(item, "left")}
                                  >
                                    <ArrowUpRight className="mr-2 h-4 w-4" />
                                    Open in Left Panel
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="cursor-pointer hover:bg-muted"
                                    onSelect={() => handleOpenInPanel(item, "middle")}
                                  >
                                    <ArrowUpRight className="mr-2 h-4 w-4" />
                                    Open in Middle Panel
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </Command.Item>
                          ))}
                        </div>
                      </div>
                    )}

                    {(selectedCategory === "all" || selectedCategory === "pdf") && groupedResults.files.length > 0 && (
                      <div className="px-3 pt-4 pb-2">
                        <div className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-red-500" />
                          PDFs
                        </div>
                        <div className="space-y-1">
                          {groupedResults.files.map((item, index) => (
                            <Command.Item
                              key={getItemKey(item, index)}
                              className="group px-2 py-2 rounded-md cursor-pointer flex items-center justify-between hover:bg-muted/50"
                              onClick={(e) => handleItemClick(item, e)}
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-red-500" />
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">{item.name}</span>
                                  {getFolderPath(item) ? (
                                    <span className="text-xs text-muted-foreground">
                                      {getFolderPath(item)}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      My Collection
                                    </span>
                                  )}
                                </div>
                              </div>
                              <DropdownMenu 
                                open={activeDropdownId === item.id} 
                                onOpenChange={(isOpen) => setActiveDropdownId(isOpen ? item.id : null)}
                              >
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem
                                    className="cursor-pointer hover:bg-muted"
                                    onSelect={() => handleOpenInPanel(item, "left")}
                                  >
                                    <ArrowUpRight className="mr-2 h-4 w-4" />
                                    Open in Left Panel
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="cursor-pointer hover:bg-muted"
                                    onSelect={() => handleOpenInPanel(item, "middle")}
                                  >
                                    <ArrowUpRight className="mr-2 h-4 w-4" />
                                    Open in Middle Panel
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </Command.Item>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No results */}
                    {filteredItems.length === 0 && (
                      <div className="px-3 pt-4 pb-6">
                        <div className="px-2 py-6 rounded-md border border-dashed flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Search className="h-8 w-8 opacity-50" />
                          <p>No results found for &ldquo;{search}&rdquo;</p>
                          <p className="text-xs">Try different keywords or check your spelling</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </ScrollArea>
            </Command.List>
          </Command>

          {/* Keyboard shortcuts footer */}
          <div className="border-t p-2 text-xs text-muted-foreground flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  ↑
                </kbd>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  ↓
                </kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  ↵
                </kbd>
                <span>Select</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  Esc
                </kbd>
                <span>Close</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}