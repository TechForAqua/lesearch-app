import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import { persist, createJSONStorage } from 'zustand/middleware';

// Panel visibility control
interface PanelVisibility {
  showMiddlePanel: boolean;
  showRightPanel: boolean;
}

// Unified Tab type for UI
export interface Tab {
  id: string;
  name: string;
  type: 'pdf' | 'note';
  pdfUrl?: string;
  content?: string;
}

// Shape of the panel store
interface PanelStore {
  /* State */
  activePageId: string | null;
  leftActiveTabId: string;
  middleActiveTabId: string;
  isLoading: boolean;
  error: string | null;
  pageTabs: Record<
    string,
    { leftPanelTabs: Tab[]; middlePanelTabs: Tab[] }
  >;
  panelVisibility: Record<string, PanelVisibility>;

  /* State setters */
  setActivePageId: (pageId: string) => void;
  setLeftActiveTabId: (tabId: string) => void;
  setMiddleActiveTabId: (tabId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  setPanelVisibility: (pageId: string, visibility: PanelVisibility) => void;

  /* Getters */
  getLeftPanelTabs: () => Tab[];
  getMiddlePanelTabs: () => Tab[];
  getPanelVisibility: (pageId: string) => PanelVisibility;

  /* Side effects */
  addTab: (
    pageId: string,
    pageType: 'pdf' | 'note',
    panel: 'left' | 'middle'
  ) => Promise<void>;
  removeTab: (
    tabId: string,
    panel: 'left' | 'middle'
  ) => void;
  removeTabFromAllPanels: (tabId: string) => void;
}

/**
 * Fetches and normalizes page data from Supabase
 * 
 * This function retrieves PDF or Note data from Supabase using the provided ID.
 * It includes comprehensive error handling for common database query issues:
 * 
 * 1. ID not found - When no records match the provided ID
 * 2. Duplicate IDs - When multiple records share the same ID (database integrity issue)
 * 3. Missing required fields - When critical fields like pdf_url are missing
 * 4. Database connection errors - When Supabase operations fail
 * 
 * TROUBLESHOOTING:
 * - If you see "not found" errors: Verify the ID exists in the database
 * - If you see "multiple found" errors: Check database for duplicate entries with same ID
 * - If you see empty error objects ({}): Check Supabase connection and permissions
 * 
 * @param pageId - The unique identifier of the PDF or Note to fetch
 * @param pageType - The type of resource to fetch ('pdf' or 'note')
 * @returns Promise<Tab> - Normalized tab data including all required fields
 * @throws Error with descriptive message when fetch fails
 */
async function fetchPageData(
  pageId: string,
  pageType: 'pdf' | 'note'
): Promise<Tab> {
  try {
    const supabase = createClient();
    
    if (pageType === 'pdf') {
      // First retrieve all matching records to better diagnose issues
      const { data: allMatches, error: matchError } = await supabase
        .from('pdfs')
        .select('id,name,pdf_url')
        .eq('id', pageId);
        
      if (matchError) {
        console.error('Supabase PDF query error:', matchError);
        throw new Error(`Database error while searching for PDF: ${matchError.message || 'Unknown error'}`);
      }
      
      // Handle the cases of no matches or multiple matches explicitly
      if (!allMatches || allMatches.length === 0) {
        console.error(`No PDF found with ID "${pageId}"`);
        throw new Error(`PDF with ID "${pageId}" not found. Verify the ID is correct and the PDF exists in the database.`);
      }
      
      if (allMatches.length > 1) {
        console.error(`Multiple PDFs (${allMatches.length}) found with the same ID "${pageId}"`);
        throw new Error(`Database integrity error: Multiple PDFs found with ID "${pageId}". Please contact the database administrator.`);
      }
      
      // If we get here, we have exactly one match
      const data = allMatches[0];
      
      if (!data.pdf_url) {
        throw new Error(`PDF URL is missing for PDF with ID "${pageId}"`);
      }
      
      return {
        id: data.id,
        name: data.name,
        type: 'pdf',
        pdfUrl: data.pdf_url,
      };
    }

    // First retrieve all matching records to better diagnose issues
    const { data: allMatches, error: matchError } = await supabase
      .from('notes')
      .select('id,name,content')
      .eq('id', pageId);
      
    if (matchError) {
      console.error('Supabase Note query error:', matchError);
      throw new Error(`Database error while searching for Note: ${matchError.message || 'Unknown error'}`);
    }
    
    // Handle the cases of no matches or multiple matches explicitly
    if (!allMatches || allMatches.length === 0) {
      console.error(`No Note found with ID "${pageId}"`);
      throw new Error(`Note with ID "${pageId}" not found. Verify the ID is correct and the note exists in the database.`);
    }
    
    if (allMatches.length > 1) {
      console.error(`Multiple Notes (${allMatches.length}) found with the same ID "${pageId}"`);
      throw new Error(`Database integrity error: Multiple Notes found with ID "${pageId}". Please contact the database administrator.`);
    }
    
    // If we get here, we have exactly one match
    const data = allMatches[0];
    
    return {
      id: data.id,
      name: data.name,
      type: 'note',
      content: data.content || '', // Ensure content is never undefined
    };
  } catch (err) {
    // Rethrow with more context if it's not already an Error object
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`Error fetching ${pageType} with ID "${pageId}": ${String(err)}`);
  }
}

type PersistedState = Pick<PanelStore, 'pageTabs' | 'activePageId' | 'leftActiveTabId' | 'panelVisibility'>;

export const usePanelStore = create(
  persist<PanelStore, [], [], PersistedState>(
    (set, get) => ({
    /* Initial State */
    activePageId: null,
    leftActiveTabId: "",
    middleActiveTabId: "",
    isLoading: false,
    error: null,
    pageTabs: {},
    panelVisibility: {},

    /* State setters */
    setActivePageId: (pageId) => set({ activePageId: pageId }),
    setLeftActiveTabId: (tabId) => set({ leftActiveTabId: tabId }),
    setMiddleActiveTabId: (tabId) => set({ middleActiveTabId: tabId }),
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),
    setPanelVisibility: (pageId, visibility) =>
      set((state) => ({
        panelVisibility: {
          ...state.panelVisibility,
          [pageId]: visibility,
        },
      })),

    /* Getters for current active page */
    getLeftPanelTabs: () => {
      const activeId = get().activePageId;
      if(!activeId) {
        return [];
      }
      const leftPanelTabs = get().pageTabs[activeId]?.leftPanelTabs ?? [];
      return leftPanelTabs;
    },
    getMiddlePanelTabs: () => {
      const pageId = get().activePageId;
      return pageId
        ? get().pageTabs[pageId]?.middlePanelTabs ?? []
        : [];
    },
    getPanelVisibility: (pageId) => {
      // Default to only showing left panel, with middle and right panels hidden
      return get().panelVisibility[pageId] || { showMiddlePanel: false, showRightPanel: false };
    },

    /* Unified add/remove tab methods */
    addTab: async (pageId, pageType, panel) => {
      set({ isLoading: true, error: null });
      try {
        // Get current active page ID from the route
        let activePageId = get().activePageId;

        // Validate inputs
        if (!pageId) {
          throw new Error('Invalid pageId: Page ID is required');
        }
        if (!pageType || !['pdf', 'note'].includes(pageType)) {
          throw new Error(`Invalid pageType: ${pageType}. Must be 'pdf' or 'note'`);
        }

        // Special case for left panel: If no active page exists, make this page the active one
        if (!activePageId && panel === 'left') {
          get().setActivePageId(pageId);
          activePageId = pageId;
        }

        // Ensure we have an active page (except for left panel which can set itself as active)
        if (!activePageId) {
          throw new Error('No active page selected. Please select a page before adding tabs or use the left panel to add tabs.');
        }

        // Get existing tabs for the active page
        const existing = get().pageTabs[activePageId] || {
          leftPanelTabs: [],
          middlePanelTabs: [],
        };

        // Check if tab already exists in the target panel
        const targetTabs = panel === 'left' ? existing.leftPanelTabs : existing.middlePanelTabs;
        const tabExists = targetTabs.some(tab => tab.id === pageId);

        if (tabExists) {
          // If tab exists, just activate it
          if (panel === 'left') {
            get().setLeftActiveTabId(pageId);
          } else {
            get().setMiddleActiveTabId(pageId);
            // Ensure middle panel is visible when selecting an existing tab
            get().setPanelVisibility(activePageId, {
              ...get().getPanelVisibility(activePageId),
              showMiddlePanel: true
            });
          }
          return;
        }

        // Fetch new tab data
        const tab = await fetchPageData(pageId, pageType);

        // Update state with new tab
        set((state) => {
          const updated = { ...existing };
          
          // Add tab to appropriate panel
          if (panel === 'left') {
            updated.leftPanelTabs = [...updated.leftPanelTabs, tab];
          } else {
            updated.middlePanelTabs = [...updated.middlePanelTabs, tab];
            // Ensure middle panel is visible when adding a new tab
            get().setPanelVisibility(activePageId, {
              ...get().getPanelVisibility(activePageId),
              showMiddlePanel: true
            });
          }

          // Update state with new tabs and active tab IDs
          return {
            pageTabs: {
              ...state.pageTabs,
              [activePageId]: updated,
            },
            leftActiveTabId: panel === 'left' ? tab.id : state.leftActiveTabId,
            middleActiveTabId: panel === 'middle' ? tab.id : state.middleActiveTabId,
          };
        });

        // Set active tab after state update
        setTimeout(() => {
          if (panel === 'left') {
            get().setLeftActiveTabId(tab.id);
          } else {
            get().setMiddleActiveTabId(tab.id);
          }
        }, 50);

      } catch (err) {
        const errorMessage = err instanceof Error 
          ? err.message 
          : 'Unknown error occurred while adding tab. Please check your network connection and try again.';
        console.error('Error adding tab:', err);
        set({ error: errorMessage });
      } finally {
        set({ isLoading: false });
      }
    },

    removeTab: (tabId, panel) => {
      const activePageId = get().activePageId;
      if (!activePageId) return;
      
      // Store current active tab IDs before removing tabs
      const currentLeftActiveTabId = get().leftActiveTabId;
      const currentMiddleActiveTabId = get().middleActiveTabId;
      
      set((state) => {
        const existing = state.pageTabs[activePageId] || {
          leftPanelTabs: [],
          middlePanelTabs: [],
        };
        const updated = { ...existing };
        
        let newLeftActiveTabId = currentLeftActiveTabId;
        let newMiddleActiveTabId = currentMiddleActiveTabId;
        
        if (panel === 'left') {
          updated.leftPanelTabs = existing.leftPanelTabs.filter(
            (t) => t.id !== tabId
          );
          
          // If the removed tab was active, select another tab
          if (currentLeftActiveTabId === tabId && updated.leftPanelTabs.length > 0) {
            newLeftActiveTabId = updated.leftPanelTabs[0].id;
            // Use setTimeout to ensure state updates properly
            setTimeout(() => get().setLeftActiveTabId(newLeftActiveTabId), 50);
          }
        } else {
          updated.middlePanelTabs = existing.middlePanelTabs.filter(
            (t) => t.id !== tabId
          );
          
          // If the removed tab was active, select another tab
          if (currentMiddleActiveTabId === tabId && updated.middlePanelTabs.length > 0) {
            newMiddleActiveTabId = updated.middlePanelTabs[0].id;
            // Use setTimeout to ensure state updates properly
            setTimeout(() => get().setMiddleActiveTabId(newMiddleActiveTabId), 50);
          }
        }

        return {
          pageTabs: {
            ...state.pageTabs,
            [activePageId]: updated,
          },
          // Preserve existing active tab IDs to prevent panel selection issues
          leftActiveTabId: newLeftActiveTabId,
          middleActiveTabId: newMiddleActiveTabId,
        };
      });
    },
    removeTabFromAllPanels: (tabId: string) => {
      set((state) => {
        // Create a new pageTabs object to store the updated state
        const updatedPageTabs = { ...state.pageTabs };
        
        // Iterate through all pages
        for (const pageId of Object.keys(updatedPageTabs)) {
          const page = updatedPageTabs[pageId];
          
          // Filter out the tab from left panel
          if (page.leftPanelTabs) {
            page.leftPanelTabs = page.leftPanelTabs.filter(tab => tab.id !== tabId);
          }
          
          // Filter out the tab from middle panel
          if (page.middlePanelTabs) {
            page.middlePanelTabs = page.middlePanelTabs.filter(tab => tab.id !== tabId);
          }
        }

        // Update active tab IDs if needed
        let newLeftActiveTabId = state.leftActiveTabId;
        let newMiddleActiveTabId = state.middleActiveTabId;

        // If the removed tab was active in left panel, select another tab
        if (state.leftActiveTabId === tabId) {
          const activePageId = state.activePageId;
          if (activePageId && updatedPageTabs[activePageId]?.leftPanelTabs.length > 0) {
            newLeftActiveTabId = updatedPageTabs[activePageId].leftPanelTabs[0].id;
            setTimeout(() => get().setLeftActiveTabId(newLeftActiveTabId), 50);
          } else {
            newLeftActiveTabId = "";
          }
        }

        // If the removed tab was active in middle panel, select another tab
        if (state.middleActiveTabId === tabId) {
          const activePageId = state.activePageId;
          if (activePageId && updatedPageTabs[activePageId]?.middlePanelTabs.length > 0) {
            newMiddleActiveTabId = updatedPageTabs[activePageId].middlePanelTabs[0].id;
            setTimeout(() => get().setMiddleActiveTabId(newMiddleActiveTabId), 50);
          } else {
            newMiddleActiveTabId = "";
          }
        }

        return {
          pageTabs: updatedPageTabs,
          leftActiveTabId: newLeftActiveTabId,
          middleActiveTabId: newMiddleActiveTabId,
        };
      });
    },
  }),
  {
    name: 'panel-storage',
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
      pageTabs: state.pageTabs,
      activePageId: state.activePageId,
      leftActiveTabId: state.leftActiveTabId,
      panelVisibility: state.panelVisibility,
    }),
  }
  )
);
  