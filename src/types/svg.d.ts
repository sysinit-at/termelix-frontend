/**
 * SVGR imports (`vite-plugin-svgr`).
 *
 * `src/vite-env.d.ts` declares the same module, but it is outside `tsconfig.app.json`'s include
 * list, so the app build never saw it. That went unnoticed while nothing imported an SVG as a
 * component; the vendored Breeze icons in `src/ui/assets/icons/breeze` do.
 */
declare module "*.svg?react" {
  import type { FC, SVGProps } from "react";

  const ReactComponent: FC<SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}
