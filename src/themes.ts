// src/themes.ts

export interface AgeStop {
  maxHours: number;
  bg: string;
  border: string;
  shadow: string;
  text: string;
}

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
  ageStops?: AgeStop[]; // Optional age-based palette (hours)
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
      selectedText: "#000000",
      hotBg: "#fde047",
      hotBorder: "#fde047",
      hotShadow: "#fde047",
      hotText: "#000000",
      activeBg: "#60a5fa",
      activeBorder: "#60a5fa",
      activeShadow: "#60a5fa",
      activeText: "#1a1a2e",
      ageStops: [
        { maxHours: 1, bg: "#fde047", border: "#facc15", shadow: "#facc15", text: "#1a1a2e" },
        { maxHours: 12, bg: "#fef08a", border: "#facc15", shadow: "#facc15", text: "#1a1a2e" },
        { maxHours: 24, bg: "#dbeafe", border: "#93c5fd", shadow: "#93c5fd", text: "#1a1a2e" },
        { maxHours: 48, bg: "#60a5fa", border: "#60a5fa", shadow: "#60a5fa", text: "#1a1a2e" },
        { maxHours: 96, bg: "#2a2a4a", border: "#3a3a52", shadow: "#3a3a52", text: "#ffffff" },
        { maxHours: 168, bg: "#1a1a2e", border: "#3a3a52", shadow: "#3a3a52", text: "#ffffff" },
        { maxHours: 504, bg: "#141423", border: "#2b2b3f", shadow: "#2b2b3f", text: "#e5e7eb" },
        { maxHours: 840, bg: "#0f0f1a", border: "#242436", shadow: "#242436", text: "#d1d5db" },
      ],
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
    bg: "bg-[#e9ecef]",
    text: "text-[#0f172a]",
    bgType: 'grid',
    canvasColor: "#e9ecef",
    node: {
      bg: "#ffffff",
      border: "#cdcdcd",
      text: "#0b1220",
      shadow: "#9ca3af",
      selectedBg: "#ffffff",
      selectedBorder: "#2563eb",
      selectedShadow: "#2563eb",
      selectedText: "#0b1220",
      hotBg: "#fef08a",
      hotBorder: "#fcd34d",
      hotShadow: "#fde047",
      hotText: "#713f12",
      activeBg: "#dbeafe",
      activeBorder: "#93c5fd",
      activeShadow: "#bfdbfe",
      activeText: "#1e3a5f",
      ageStops: [
        { maxHours: 1, bg: "#fde047", border: "#cdcdcd", shadow: "#facc15", text: "#713f12" },
        { maxHours: 12, bg: "#fef08a", border: "#cdcdcd", shadow: "#fcd34d", text: "#713f12" },
        { maxHours: 24, bg: "#fef3c7", border: "#cdcdcd", shadow: "#fde68a", text: "#713f12" },
        { maxHours: 48, bg: "#fff7d6", border: "#cdcdcd", shadow: "#fef3c7", text: "#713f12" },
        { maxHours: 96, bg: "#fffdf5", border: "#cdcdcd", shadow: "#e5e7eb", text: "#4b5563" },
        { maxHours: 168, bg: "#ffffff", border: "#cdcdcd", shadow: "#e5e7eb", text: "#374151" },
        { maxHours: 504, bg: "#f3f4f6", border: "#cdcdcd", shadow: "#d1d5db", text: "#374151" },
        { maxHours: 840, bg: "#e5e7eb", border: "#cdcdcd", shadow: "#cbd5e1", text: "#374151" },
      ],
      flippedBg: "#f9fafb",
      flippedText: "#0f172a",
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
      ageStops: [
        { maxHours: 1, bg: "#854d0e", border: "#a16207", shadow: "#a16207", text: "#fef3c7" },
        { maxHours: 12, bg: "#a16207", border: "#ca8a04", shadow: "#ca8a04", text: "#fef3c7" },
        { maxHours: 24, bg: "#92400e", border: "#b45309", shadow: "#b45309", text: "#fde68a" },
        { maxHours: 48, bg: "#78350f", border: "#92400e", shadow: "#92400e", text: "#fef3c7" },
        { maxHours: 96, bg: "#4b5563", border: "#6b7280", shadow: "#6b7280", text: "#f3f4f6" },
        { maxHours: 168, bg: "#374151", border: "#4b5563", shadow: "#4b5563", text: "#f3f4f6" },
        { maxHours: 504, bg: "#2d3748", border: "#4b5563", shadow: "#4b5563", text: "#e5e7eb" },
        { maxHours: 840, bg: "#1f2937", border: "#374151", shadow: "#374151", text: "#e5e7eb" },
      ],
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
      ageStops: [
        { maxHours: 1, bg: "#fff1a8", border: "#000000", shadow: "rgba(0,0,0,0.2)", text: "#000000" },
        { maxHours: 12, bg: "#fff7cc", border: "#000000", shadow: "rgba(0,0,0,0.18)", text: "#000000" },
        { maxHours: 24, bg: "#fffbe6", border: "#000000", shadow: "rgba(0,0,0,0.15)", text: "#000000" },
        { maxHours: 48, bg: "#ffffff", border: "#000000", shadow: "rgba(0,0,0,0.12)", text: "#000000" },
        { maxHours: 96, bg: "#f7f7f7", border: "#000000", shadow: "rgba(0,0,0,0.1)", text: "#000000" },
        { maxHours: 168, bg: "#f0f0f0", border: "#000000", shadow: "rgba(0,0,0,0.1)", text: "#000000" },
        { maxHours: 504, bg: "#e6e6e6", border: "#000000", shadow: "rgba(0,0,0,0.12)", text: "#000000" },
        { maxHours: 840, bg: "#d9d9d9", border: "#000000", shadow: "rgba(0,0,0,0.15)", text: "#000000" },
      ],
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
      ageStops: [
        { maxHours: 1, bg: "#da7422", border: "#da7422", shadow: "#da7422", text: "#0a0a0a" },
        { maxHours: 12, bg: "#d38b2a", border: "#a59132", shadow: "#a59132", text: "#0a0a0a" },
        { maxHours: 24, bg: "#b5852e", border: "#a59132", shadow: "#a59132", text: "#0a0a0a" },
        { maxHours: 48, bg: "#8c7a33", border: "#a59132", shadow: "#a59132", text: "#0a0a0a" },
        { maxHours: 96, bg: "#625834", border: "#a59132", shadow: "#a59132", text: "#fffbdb" },
        { maxHours: 168, bg: "#544a2f", border: "#a59132", shadow: "#a59132", text: "#fffbdb" },
        { maxHours: 504, bg: "#443d28", border: "#8a7b2a", shadow: "#8a7b2a", text: "#fffbdb" },
        { maxHours: 840, bg: "#383222", border: "#7a6c24", shadow: "#7a6c24", text: "#fffbdb" },
      ],
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
    bg: "bg-[#E1E8F6]",
    text: "text-[#2b3548]",
    bgType: 'grid',
    canvasColor: "#E1E8F6",
    node: {
      bg: "#ffffff",
      border: "#cdcdcd",
      text: "#1b2538",
      shadow: "#cbd5e1",
      selectedBg: "#ffffff",
      selectedBorder: "#abc4ff",
      selectedShadow: "#abc4ff",
      selectedText: "#1b2538",
      hotBg: "#ABC4FF",
      hotBorder: "#ABC4FF",
      hotShadow: "#ABC4FF",
      hotText: "#1e3a5f",
      activeBg: "#B6CCFE",
      activeBorder: "#B6CCFE",
      activeShadow: "#B6CCFE",
      activeText: "#1e3a5f",
      ageStops: [
        { maxHours: 1, bg: "#c7d2fe", border: "#cdcdcd", shadow: "#a5b4fc", text: "#1e3a5f" },
        { maxHours: 12, bg: "#e0e7ff", border: "#cdcdcd", shadow: "#c7d2fe", text: "#1e3a5f" },
        { maxHours: 24, bg: "#eef2ff", border: "#cdcdcd", shadow: "#e0e7ff", text: "#334155" },
        { maxHours: 48, bg: "#f5f7ff", border: "#cdcdcd", shadow: "#eef2ff", text: "#334155" },
        { maxHours: 96, bg: "#fbfcff", border: "#cdcdcd", shadow: "#e2e8f0", text: "#475569" },
        { maxHours: 168, bg: "#ffffff", border: "#cdcdcd", shadow: "#e2e8f0", text: "#475569" },
        { maxHours: 504, bg: "#f1f5f9", border: "#cdcdcd", shadow: "#d7dde6", text: "#475569" },
        { maxHours: 840, bg: "#e2e8f0", border: "#cdcdcd", shadow: "#cbd5e1", text: "#475569" },
      ],
      flippedBg: "#f8fafc",
      flippedText: "#1b2538",
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
