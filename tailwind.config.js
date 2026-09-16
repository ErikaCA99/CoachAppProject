/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#32a685",
          light: "#add9d1",
        },
        secondary: "#f2c0a2",
        accent: {
          DEFAULT: "#f29580",
          strong: "#d95032",
        },
        background: "#ffffff",
        surface: "#add9d1",
        foreground: "#1f2937",
        border: "#add9d1",
        success: "#32a685",
        warning: "#f2c0a2",
        error: "#d95032",
        text: {
          primary: "#1f2937",
          secondary: "#4b5563",
          muted: "#6b7280",
        },
      },
      fontFamily: {
        display: ["Spline Sans", "Inter", "system-ui", "sans-serif"],
        mono: ["SFMono-Regular", "Menlo", "monospace"],
        rounded: ["SF Pro Rounded", "sans-serif"],
        serif: ["Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
