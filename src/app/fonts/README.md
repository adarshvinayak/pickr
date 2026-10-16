# Local font assets

The PICKR interface uses the existing local Noto Sans / Noto Sans Malayalam files through `design-fonts.css`. Material Symbols Rounded is an added subset served locally as `material-symbols-rounded.woff2`, including outline/fill variants for the application's icons.

Material Symbols: https://developers.google.com/fonts/docs/material_symbols
Google Fonts source: https://fonts.google.com/icons
License: `LICENSE-material-symbols.txt` (Apache 2.0, from Google's material-design-icons repository).

The rounded font was fetched through the Google Fonts CSS API with the sorted `icon_names` subset parameter. Add new icon names to the subset when adding a symbol not already present. Runtime font fetching from Google is not needed in the app.
