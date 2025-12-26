// Zotero state slice for Zustand

import type { StateCreator } from 'zustand';
import type {
  ZoteroItem,
  ZoteroAnnotation,
  ZoteroCollection,
  ZoteroConnectionStatus,
} from '../../types/zotero';

export interface ZoteroState {
  // Connection
  connectionStatus: ZoteroConnectionStatus;
  backendUrl: string;

  // Search
  searchQuery: string;
  searchResults: ZoteroItem[];
  isSearching: boolean;
  fullTextSearch: boolean;

  // Selected item
  selectedItemKey: string | null;
  selectedItemDetails: ZoteroItem | null;
  selectedItemAnnotations: ZoteroAnnotation[];

  // Collections
  collections: ZoteroCollection[];

  // UI state
  activeTab: 'search' | 'library' | 'annotations' | 'settings';
}

export interface ZoteroActions {
  // Connection
  setConnectionStatus: (status: ZoteroConnectionStatus) => void;
  setBackendUrl: (url: string) => void;

  // Search
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: ZoteroItem[]) => void;
  setIsSearching: (isSearching: boolean) => void;
  setFullTextSearch: (enabled: boolean) => void;

  // Selected item
  setSelectedItemKey: (key: string | null) => void;
  setSelectedItemDetails: (item: ZoteroItem | null) => void;
  setSelectedItemAnnotations: (annotations: ZoteroAnnotation[]) => void;

  // Collections
  setCollections: (collections: ZoteroCollection[]) => void;

  // UI
  setActiveTab: (tab: 'search' | 'library' | 'annotations' | 'settings') => void;

  // Clear
  clearSearch: () => void;
}

export type ZoteroSlice = ZoteroState & ZoteroActions;

const initialState: ZoteroState = {
  connectionStatus: 'disconnected',
  backendUrl: 'ws://localhost:3001',
  searchQuery: '',
  searchResults: [],
  isSearching: false,
  fullTextSearch: false,
  selectedItemKey: null,
  selectedItemDetails: null,
  selectedItemAnnotations: [],
  collections: [],
  activeTab: 'search',
};

export const createZoteroSlice: StateCreator<ZoteroSlice> = (set) => ({
  ...initialState,

  // Connection
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setBackendUrl: (url) => set({ backendUrl: url }),

  // Search
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results }),
  setIsSearching: (isSearching) => set({ isSearching }),
  setFullTextSearch: (enabled) => set({ fullTextSearch: enabled }),

  // Selected item
  setSelectedItemKey: (key) => set({ selectedItemKey: key }),
  setSelectedItemDetails: (item) => set({ selectedItemDetails: item }),
  setSelectedItemAnnotations: (annotations) => set({ selectedItemAnnotations: annotations }),

  // Collections
  setCollections: (collections) => set({ collections }),

  // UI
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Clear
  clearSearch: () =>
    set({
      searchQuery: '',
      searchResults: [],
      isSearching: false,
    }),
});
