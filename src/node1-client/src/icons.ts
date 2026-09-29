import { createIcons, icons } from "lucide";

export function renderLucideIcons(root?: HTMLElement | Document) {
  createIcons({
    icons,
    nameAttr: "data-lucide",
    root: root || document,
  });
}
