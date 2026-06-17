# Build Resources

This directory holds application icons and other build-time resources consumed by
`electron-builder`.

## Required icons

Place the following icon files here before running `pnpm build:win` / `pnpm build:mac`.
If an icon is missing, electron-builder falls back to its default Electron icon.

| File          | Platform              | Size / Format                  |
|---------------|-----------------------|--------------------------------|
| `icon.ico`    | Windows               | Multi-resolution .ico (256×256 recommended, incl. 16/32/48/64/128) |
| `icon.icns`   | macOS                 | .icns (1024×1024 source recommended) |
| `icon.png`    | Linux (AppImage)      | 512×512 PNG                    |

## Generating icons

From a 1024×1024 PNG source (`icon.png`), generate the others:

```bash
# Requires electron-icon-builder: pnpm dlx electron-icon-builder --input=icon.png --output=build
pnpm dlx electron-icon-builder --input=build/icon.png --output=build
```

This produces `build/icons/win/icon.ico`, `build/icons/mac/icon.icns`, etc. Move
them to `build/icon.ico` and `build/icon.icns` to match `electron-builder.yml`.
