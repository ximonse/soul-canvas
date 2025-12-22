// src/themes.ts

export interface ThemeNodeStyles {
  bg: string;
  border: string;
  text: string;
  shadow: string;
  selectedBg: string; // Background color when selected
  selectedBorder: string; // Border color when selected
  selectedShadow: string; // Shadow color when selected
  selectedText: string; // Text color when selected
  hotBg: string; // Background for 'hot' node
  hotBorder: string; // Border for 'hot' node
  hotShadow: string; // Shadow for 'hot' node
  hotText: string; // Text color for 'hot' node
  activeBg: string; // Background for 'active' node
  activeBorder: string; // Border for 'active' node
  activeShadow: string; // Shadow for 'active' node
  activeText: string; // Text color for 'active' node
  flippedBg: string; // Background for flipped side
  flippedText: string; // Text color for flipped side
}

export interface ThemeChatStyles {
  userFont: string;      // Font for user messages
  assistantFont: string; // Font for assistant messages
}

export interface Theme {
  name: string;
  bg: string;
  text: string;
  node: ThemeNodeStyles;
  lineColor: string;
  lineOpacity: string;
  button: string;
  bgType: 'stars' | 'grid' | 'dots' | 'none'; // Lade till 'none' för E-ink
  canvasColor: string; // Direct CSS color for Konva canvas
  chat: ThemeChatStyles;
}

export const THEMES: Record<string, Theme> = {
  // --- RYMD ---
  space: {
    name: "Rymd",
    bg: "bg-[#050505]",
    text: "text-gray-200",
    bgType: 'stars',
    canvasColor: "#050505",
    node: {
      bg: "#1a1a2e",
      border: "#3a3a52",
      text: "#ffffff",
      shadow: "#000000",
      selectedBg: "#1a1a2e",
      selectedBorder: "#ffffff",
      selectedShadow: "#ffffff",
      selectedText: "#ffffff",
      hotBg: "#fde047",
      hotBorder: "#fde047",
      hotShadow: "#fde047",
      hotText: "#1a1a2e",
      activeBg: "#60a5fa",
      activeBorder: "#60a5fa",
      activeShadow: "#60a5fa",
      activeText: "#1a1a2e",
      flippedBg: "#1a1a2e",
      flippedText: "#e0e0e0",
    },
    lineColor: "#6366f1",
    lineOpacity: "0.6",
    button: "bg-white/10 hover:bg-white/20 border-white/10 text-gray-200",
    chat: {
      userFont: "'JetBrains Mono', 'SF Mono', monospace",
      assistantFont: "'Inter', 'SF Pro', system-ui, sans-serif",
    }
  },

  // --- PAPPER ---
  paper: {
    name: "Papper",
    bg: "bg-[#f3f4f6]",
    text: "text-gray-800",
    bgType: 'grid',
    canvasColor: "#f3f4f6",
    node: {
      bg: "#ffffff",
      border: "#e5e7eb",
      text: "#1f2937",
      shadow: "#9ca3af",
      selectedBg: "#ffffff",
      selectedBorder: "#2563eb",
      selectedShadow: "#2563eb",
      selectedText: "#1f2937",
      hotBg: "#fef08a",
      hotBorder: "#fcd34d",
      hotShadow: "#fde047",
      hotText: "#713f12",
      activeBg: "#dbeafe",
      activeBorder: "#93c5fd",
      activeShadow: "#bfdbfe",
      activeText: "#1e3a5f",
      flippedBg: "#f9fafb",
      flippedText: "#374151",
    },
    lineColor: "#9ca3af",
    lineOpacity: "1",
    button: "bg-white border-gray-300 shadow-sm hover:shadow-md text-gray-700",
    chat: {
      userFont: "'Georgia', 'Times New Roman', serif",
      assistantFont: "'Crimson Pro', 'Libre Baskerville', Georgia, serif",
    }
  },

  // --- PAPPER MÖRK (inverterad) ---
  paperDark: {
    name: "Papper Mörk",
    bg: "bg-[#1f2937]",
    text: "text-gray-200",
    bgType: 'grid',
    canvasColor: "#1f2937",
    node: {
      bg: "#374151",
      border: "#4b5563",
      text: "#f3f4f6",
      shadow: "#111827",
      selectedBg: "#374151",
      selectedBorder: "#60a5fa",
      selectedShadow: "#60a5fa",
      selectedText: "#f3f4f6",
      hotBg: "#854d0e",
      hotBorder: "#a16207",
      hotShadow: "#a16207",
      hotText: "#fef3c7",
      activeBg: "#1e3a5f",
      activeBorder: "#3b82f6",
      activeShadow: "#3b82f6",
      activeText: "#dbeafe",
      flippedBg: "#1f2937",
      flippedText: "#e5e7eb",
    },
    lineColor: "#6b7280",
    lineOpacity: "1",
    button: "bg-gray-700 border-gray-600 shadow-sm hover:shadow-md text-gray-200",
    chat: {
      userFont: "'Georgia', 'Times New Roman', serif",
      assistantFont: "'Crimson Pro', 'Libre Baskerville', Georgia, serif",
    }
  },

  // --- E-INK ---
  eink: {
    name: "E-Ink",
    bg: "bg-white",
    text: "text-black",
    bgType: 'none',
    canvasColor: "#ffffff",
    node: {
      bg: "#ffffff",
      border: "#000000",
      text: "#000000",
      shadow: "rgba(0,0,0,0.1)",
      selectedBg: "#000000",
      selectedBorder: "#000000",
      selectedShadow: "rgba(0,0,0,0.5)",
      selectedText: "#ffffff",
      hotBg: "#ffffff",
      hotBorder: "#000000",
      hotShadow: "rgba(0,0,0,0.2)",
      hotText: "#000000",
      activeBg: "#ffffff",
      activeBorder: "#000000",
      activeShadow: "rgba(0,0,0,0.15)",
      activeText: "#000000",
      flippedBg: "#f0f0f0",
      flippedText: "#000000",
    },
    lineColor: "#000000",
    lineOpacity: "1",
    button: "bg-white border-2 border-black hover:bg-black hover:text-white text-black font-bold shadow-none",
    chat: {
      userFont: "'IBM Plex Mono', 'Courier New', monospace",
      assistantFont: "'IBM Plex Sans', 'Helvetica Neue', sans-serif",
    }
  },

  // --- JORD ---
  earth: {
    name: "Jord",
    bg: "bg-[#30362f]",
    text: "text-[#fffbdb]",
    bgType: 'dots',
    canvasColor: "#30362f",
    node: {
      bg: "#625834",
      border: "#a59132",
      text: "#fffbdb",
      shadow: "#30362f",
      selectedBg: "#625834",
      selectedBorder: "#fffbdb",
      selectedShadow: "#fffbdb",
      selectedText: "#fffbdb",
      hotBg: "#da7422",
      hotBorder: "#da7422",
      hotShadow: "#da7422",
      hotText: "#0a0a0a",
      activeBg: "#a59132",
      activeBorder: "#a59132",
      activeShadow: "#a59132",
      activeText: "#0a0a0a",
      flippedBg: "#30362f",
      flippedText: "#fffbdb",
    },
    lineColor: "#a59132",
    lineOpacity: "0.4",
    button: "bg-[#625834] border-[#a59132] hover:bg-[#a59132] text-[#fffbdb] hover:text-[#0a0a0a]",
    chat: {
      userFont: "'Fira Code', 'Source Code Pro', monospace",
      assistantFont: "'Merriweather', 'Palatino', serif",
    }
  },

  // --- MOLN ---
  clouds: {
    name: "Moln",
    bg: "bg-[#EDF2FB]",
    text: "text-[#5d6b82]",
    bgType: 'grid',
    canvasColor: "#EDF2FB",
    node: {
      bg: "#ffffff",
      border: "#e0e7ff",
      text: "#334155",
      shadow: "#cbd5e1",
      selectedBg: "#ffffff",
      selectedBorder: "#abc4ff",
      selectedShadow: "#abc4ff",
      selectedText: "#334155",
      hotBg: "#ABC4FF",
      hotBorder: "#ABC4FF",
      hotShadow: "#ABC4FF",
      hotText: "#1e3a5f",
      activeBg: "#B6CCFE",
      activeBorder: "#B6CCFE",
      activeShadow: "#B6CCFE",
      activeText: "#1e3a5f",
      flippedBg: "#f8fafc",
      flippedText: "#475569",
    },
    lineColor: "#ABC4FF",
    lineOpacity: "0.8",
    button: "bg-[#ABC4FF] hover:bg-[#90b0ff] text-[#1e3a5f] shadow-sm",
    chat: {
      userFont: "'Nunito', 'Avenir', sans-serif",
      assistantFont: "'Lora', 'Cambria', serif",
    }
  }
};
