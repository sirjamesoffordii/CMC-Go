# Side Panel Design Files

This folder contains Figma design files and exports for the side panel component.

## Folder Structure

```
side-panel/
├── src/                    # Source design files, components, and assets
│   ├── app/               # Application components
│   └── styles/            # CSS and styling files
├── exports/               # Exported images and assets (PNG, JPG, SVG)
├── specs/                 # Design specifications and measurements
├── package.json           # Project dependencies (add here)
├── vite.config.ts         # Vite configuration (add here)
├── postcss.config.mjs     # PostCSS configuration (add here)
├── *.json                 # Any JSON config files (add here)
└── README.md              # This file
```

## File Organization

### Root Level Files
Add these configuration files directly to the `side-panel/` folder:
- `package.json` - Project dependencies
- `vite.config.ts` - Vite build configuration
- `postcss.config.mjs` - PostCSS configuration
- Any JSON files (like `tsconfig.json`, etc.)
- `ATTRIBUTIONS.md` - Attribution information

### Source Files
- All component files go in `src/app/components/`
- Style files go in `src/styles/`

### Exports
- Screenshots and exported images go in `exports/`

### Specs
- Design specifications and measurements go in `specs/`

## Notes

- PNG/JPG images can be read directly by the AI assistant
- SVG files are also supported
- Text files with design notes are helpful for context
- Configuration files help understand the project setup
