import React, { useEffect, useState, useCallback, memo } from "react";
import { type Tab, usePanelStore } from "@/store/usePanelStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { FilePen, FileText, Plus, X } from "lucide-react";
import { Button } from "../ui/button";
import { AnaraViewer } from "../anara/anara";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useStore } from "@/store/useCollectionStore";
import { PDFImport } from "../sidebar/pdf-import";
import { usePdfStore } from "@/store/usePdfStore";
import EditorLayout from "../platejs/EditorLayout";
import { SaveStatus } from "../sidebar/save-status";
import { useDocStore } from "@/store/useDocStore";
import type { Annotation } from "@/anaralabs/lector";
import { toast } from "sonner";
import { useUserStore } from "@/store/userStore";
import GridLoader from "../loader/grid-loader";
import { useTheme } from "next-themes";

interface TabContentProps {
	tab: Tab;
	pdfs: Record<string, { highlights: Annotation[] }>;
}

// Memoize the tab content to prevent unnecessary re-renders
const TabContent = memo(({ tab, pdfs }: TabContentProps) => {
	if (tab.type === "pdf" && tab.pdfUrl) {
		return (
			<AnaraViewer
				pdfId={tab.id}
				pdfUrl={tab.pdfUrl}
				pdfHighlights={pdfs[tab.id]?.highlights || []}
			/>
		);
	}
	return <EditorLayout docid={tab.id} />;
});
TabContent.displayName = 'TabContent';

interface TabTriggerProps {
	tab: Tab;
	onRemove: (id: string) => void;
}

// Memoize the tab trigger to prevent unnecessary re-renders
const TabTrigger = memo(({ tab, onRemove }: TabTriggerProps) => (
	<div
		key={tab.id}
		className="relative flex items-center group flex-shrink-0 h-full border-r border-gray-200 last:border-r-0 overflow-hidden"
	>
		<TabsTrigger
			value={tab.id}
			className="flex items-center gap-1 px-3 h-full text-xs font-medium leading-none truncate max-w-[180px] rounded-none shadow-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-muted-foreground data-[state=active]:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 border-b-2 border-transparent data-[state=active]:border-b-primary -mb-[2px] pr-6"
		>
			{tab.type === "pdf" ? (
				<FileText size={15} />
			) : (
				<FilePen size={15} />
			)}
			<span className="truncate">{tab.name}</span>
		</TabsTrigger>
		<button
			type="button"
			aria-label={`Close ${tab.name}`}
			className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-opacity cursor-pointer flex items-center justify-center"
			onClick={(e) => {
				e.stopPropagation();
				onRemove(tab.id);
			}}
			onMouseDown={(e) => e.stopPropagation()}
		>
			<X size={11} className="text-gray-500" />
		</button>
	</div>
));
TabTrigger.displayName = 'TabTrigger';

const MiddlePanel = () => {
	const {
		activePageId,
		getMiddlePanelTabs,
		removeTab,
		middleActiveTabId,
		setMiddleActiveTabId,
		addTab,
	} = usePanelStore();
	const { setCreation, createItem, deleteItem } = useStore();
	const { pdfs } = usePdfStore();
	const [isPdfImportOpen, setIsPdfImportOpen] = useState(false);
	const { saveStatus } = useDocStore();
	const { user } = useUserStore();
	const tabs = getMiddlePanelTabs();
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const { resolvedTheme } = useTheme();

	// Keep track of the previous middleActiveTabId
	const prevMiddleActiveTabIdRef = React.useRef(middleActiveTabId);

	// Update activeTabId when tabs change but preserve selection
	useEffect(() => {
		// If there are tabs and no active tab is selected, set the first tab as active
		if (
			tabs.length > 0 &&
			(!middleActiveTabId || !tabs.find((tab) => tab.id === middleActiveTabId))
		) {
			setMiddleActiveTabId(tabs[0].id);
		}

		// Update the previous active tab ref
		prevMiddleActiveTabIdRef.current = middleActiveTabId;
	}, [tabs, middleActiveTabId, setMiddleActiveTabId]);

	const handleAddNote = useCallback(() => {
		setIsDropdownOpen(false);
		setTimeout(() => {
			setCreation({
				parentId: activePageId,
				type: "note",
				panel: "middle"
			});
		}, 0);
	}, [activePageId, setCreation]);

	const handleAddPdf = useCallback(() => {
		setIsDropdownOpen(false);
		setTimeout(() => {
			setCreation({
				parentId: activePageId,
				type: "pdf",
				panel: "middle"
			});
		}, 0);
	}, [activePageId, setCreation]);

	const handleOpenPdfImport = useCallback(() => {
		setIsPdfImportOpen(true);
	}, []);
	const handleClosePdfImport = useCallback(() => {
		setIsPdfImportOpen(false);
	}, []);

	const handleRemoveTab = useCallback((tabId: string) => {
		removeTab(tabId, "middle");
	}, [removeTab]);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	}, []);

	const handleDrop = useCallback(async (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
		setIsLoading(true);

		const file = e.dataTransfer.files?.[0];
		if (!file || !file.type.includes('pdf')) {
			toast.error("Please drop a PDF file");
			return;
		}

		if (!user) {
			toast.error("User not found");
			return;
		}

		try {
			const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
			const formData = new FormData();
			formData.append("file", file);
			formData.append("userId", user.id);

			const id = await createItem(fileName, activePageId, "pdf");

			if (!id) {
				toast.error("Failed to create PDF");
				return;
			}

			formData.append("id", id);

			const response = await fetch("/api/documents/upload", {
				method: "POST",
				body: formData,
			});

			if (!response.ok) {
				deleteItem(id, "pdf");
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to upload document");
			}

			// Add the PDF as a tab in the middle panel
			await addTab(id, "pdf", "middle");
			toast.success("PDF added successfully");

		} catch (error) {
			console.error("Error importing PDF:", error);
			toast.error("Failed to import PDF");
		}
		finally {
			setIsLoading(false);
		}
	}, [user, createItem, deleteItem, addTab, activePageId]);

	if(isLoading) {
		return (
		<div className="flex flex-col w-full h-full items-center justify-center">
			<GridLoader size="80" color={`${resolvedTheme==="light"?'#000000':'#ffffff'}`} />
		</div>
	)}

	// Enhanced empty state with drag and drop
	if (tabs.length === 0)
		return (
			<>
				<div 
					className={`flex flex-col w-full h-full items-center justify-center bg-card/50 transition-colors ${
						isDragging ? 'bg-primary/5' : ''
					}`}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
				>
					<div className="text-center max-w-sm space-y-4 p-6 rounded-lg border-2 border-dashed border-primary/20">
						<h3 className="text-xl font-medium text-foreground">
							This panel is empty
						</h3>
						<p className="text-sm text-muted-foreground">
							Drag and drop a PDF file here or use the buttons below
						</p>

						<div className="flex flex-col gap-3 mt-4">
							<Button
								variant="default"
								size="lg"
								className="gap-2 w-full justify-center"
								onClick={handleOpenPdfImport}
							>
								<FileText size={16} />
								Open PDF Document
							</Button>

							<Button
								variant="outline"
								size="lg"
								className="gap-2 w-full justify-center"
								onClick={handleAddNote}
							>
								<FilePen size={16} />
								Create New Note
							</Button>
						</div>
					</div>
				</div>
				<PDFImport
					isOpen={isPdfImportOpen}
					onClose={handleClosePdfImport}
					targetPanel="middle"
				/>
			</>
		);

	return (
		<>
			<Tabs
				value={middleActiveTabId}
				onValueChange={setMiddleActiveTabId}
				defaultValue={middleActiveTabId || tabs[0]?.id}
				className="flex flex-col w-full h-full"
			>
				<TabsList className="w-full p-0 bg-background justify-start border-b border-border rounded-none flex-shrink-0 h-8 overflow-hidden">
					<div className="flex flex-1 min-w-0 h-full overflow-x-auto no-scrollbar">
						{tabs.map((tab) => (
							<TabTrigger key={tab.id} tab={tab} onRemove={handleRemoveTab} />
						))}
					</div>
					<SaveStatus status={saveStatus[middleActiveTabId]} />
					<DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon">
								<Plus size={16} />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuItem
								className="flex items-center gap-2 cursor-pointer"
								onSelect={handleAddPdf}
							>
								<FileText size={16} />
								Open PDF
							</DropdownMenuItem>
							<DropdownMenuItem
								className="flex items-center gap-2 cursor-pointer"
								onSelect={handleAddNote}
							>
								<FilePen size={16} />
								Add Note
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</TabsList>
				<div className="flex-1 overflow-hidden">
					{tabs.map((tab: Tab) => (
						<TabsContent
							key={tab.id}
							value={tab.id}
							className="flex flex-col mt-0 h-full overflow-hidden"
						>
							<TabContent tab={tab} pdfs={pdfs} />
						</TabsContent>
					))}
				</div>
			</Tabs>
			<PDFImport
				isOpen={isPdfImportOpen}
				onClose={handleClosePdfImport}
				targetPanel="middle"
			/>
		</>
	);
};

MiddlePanel.displayName = 'MiddlePanel';
export default memo(MiddlePanel);
