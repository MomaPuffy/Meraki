// Centralized color configuration for user positions and departments
export interface ColorTheme {
  headerFrom: string;
  headerTo: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  accentColor: string;
}

export const COLOR_THEMES = {
  green: {
    headerFrom: "from-green-600",
    headerTo: "to-green-800",
    badgeBg: "bg-green-100",
    badgeText: "text-green-800",
    borderColor: "border-green-200",
    accentColor: "green-600",
  } as ColorTheme,
  blue: {
    headerFrom: "from-blue-600",
    headerTo: "to-blue-800",
    badgeBg: "bg-blue-100",
    badgeText: "text-blue-800",
    borderColor: "border-blue-200",
    accentColor: "blue-600",
  } as ColorTheme,
  purple: {
    headerFrom: "from-purple-600",
    headerTo: "to-purple-800",
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-800",
    borderColor: "border-purple-200",
    accentColor: "purple-600",
  } as ColorTheme,
  red: {
    headerFrom: "from-red-600",
    headerTo: "to-red-800",
    badgeBg: "bg-red-100",
    badgeText: "text-red-800",
    borderColor: "border-red-200",
    accentColor: "red-600",
  } as ColorTheme,
  orange: {
    headerFrom: "from-orange-600",
    headerTo: "to-orange-800",
    badgeBg: "bg-orange-100",
    badgeText: "text-orange-800",
    borderColor: "border-orange-200",
    accentColor: "orange-600",
  } as ColorTheme,
  indigo: {
    headerFrom: "from-indigo-600",
    headerTo: "to-indigo-800",
    badgeBg: "bg-indigo-100",
    badgeText: "text-indigo-800",
    borderColor: "border-indigo-200",
    accentColor: "indigo-600",
  } as ColorTheme,
  pink: {
    headerFrom: "from-pink-600",
    headerTo: "to-pink-800",
    badgeBg: "bg-pink-100",
    badgeText: "text-pink-800",
    borderColor: "border-pink-200",
    accentColor: "pink-600",
  } as ColorTheme,
} as const;

export type ColorKey = keyof typeof COLOR_THEMES;

// Position to color mapping - easy to modify and extend
export const POSITION_COLOR_MAP: Record<string, ColorKey> = {
  "advisor": "green",
  "president": "green", 
  "vice-president": "green",
  "member": "blue", // default position
  // Add more positions here as needed
  // "secretary": "purple",
  // "treasurer": "orange",
};

// Department to color mapping - new feature
export const DEPARTMENT_COLOR_MAP: Record<string, ColorKey> = {
  "documentary department": "blue",
  "multimedia department": "purple",
  "event coordinator": "orange",
  "crafting department": "pink",
  "cosplayer": "indigo",
  // Add more departments here as needed
};

// Utility function to get color theme based on position and department
// Position takes priority over department if both are specified
export const getUserColorTheme = (position?: string, department?: string): ColorTheme => {
  // First check position-based colors (higher priority)
  if (position) {
    const normalizedPosition = position.toLowerCase().trim();
    const positionColor = POSITION_COLOR_MAP[normalizedPosition];
    if (positionColor) {
      return COLOR_THEMES[positionColor];
    }
  }

  // Then check department-based colors
  if (department) {
    const normalizedDepartment = department.toLowerCase().trim();
    const departmentColor = DEPARTMENT_COLOR_MAP[normalizedDepartment];
    if (departmentColor) {
      return COLOR_THEMES[departmentColor];
    }
  }

  // Default to blue if no match found
  return COLOR_THEMES.blue;
};

// Utility function to determine color key for database storage
// Position takes priority over department
export const getUserColorKey = (position?: string, department?: string): ColorKey => {
  // First check position-based colors (higher priority)
  if (position) {
    const normalizedPosition = position.toLowerCase().trim();
    const positionColor = POSITION_COLOR_MAP[normalizedPosition];
    if (positionColor) {
      return positionColor;
    }
  }

  // Then check department-based colors
  if (department) {
    const normalizedDepartment = department.toLowerCase().trim();
    const departmentColor = DEPARTMENT_COLOR_MAP[normalizedDepartment];
    if (departmentColor) {
      return departmentColor;
    }
  }

  // Default to blue
  return "blue";
};

// Legacy function for backward compatibility (position only)
export const getPositionColorTheme = (position?: string): ColorTheme => {
  return getUserColorTheme(position, undefined);
};

// Legacy function for backward compatibility (position only)
export const getPositionColorKey = (position?: string): ColorKey => {
  return getUserColorKey(position, undefined);
};
