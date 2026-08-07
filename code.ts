const GENERATED_PREFIX = "Theme Compare — ";

type UiCollection = { id: string; name: string; modes: Array<{ id: string; name: string }> };
type UiGroup = { collectionId: string; modes: Array<{ id: string; name: string }> };
type CompareMessage = { type: "compare"; groups: UiGroup[] };
type CancelMessage = { type: "cancel" };
type IncomingMessage = CompareMessage | CancelMessage;

async function init() {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const data: UiCollection[] = collections.map((collection) => ({
    id: collection.id,
    name: collection.name,
    modes: collection.modes.map((mode) => ({ id: mode.modeId, name: mode.name })),
  }));
  // Preload the Inter Semi Bold font once so first use does not race the UI.
  await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
  const html = __html__.replace("__COLLECTIONS__", JSON.stringify(data).replace(/</g, "\\u003c"));
  figma.showUI(html, { width: 420, height: 560, themeColors: true });
  figma.on("selectionchange", () => figma.ui.postMessage({ type: "selection", count: figma.currentPage.selection.length }));
  figma.ui.postMessage({ type: "selection", count: figma.currentPage.selection.length });
}
void init();

figma.ui.onmessage = async (message: IncomingMessage) => {
  if (message.type === "cancel") { figma.closePlugin(); return; }
  try {
    if (!message.groups.length) throw new Error("Add at least one collection group before comparing.");
    const sources = getSourceNodes();
    const minX = Math.min(...sources.map(n => n.x));
    const minY = Math.min(...sources.map(n => n.y));
    const width = Math.max(...sources.map(n => n.x + n.width)) - minX;
    const height = Math.max(...sources.map(n => n.y + n.height)) - minY;
    const gap = 48;
    const panelGap = 64;
    const created: SectionNode[] = [];
    let cursorX = Math.max(...sources.map(n => n.x + n.width)) + 96;
    for (const group of message.groups) {
      if (!group.modes.length) continue;
      const collection = await figma.variables.getVariableCollectionByIdAsync(group.collectionId);
      if (!collection) throw new Error("One of the selected variable collections is no longer available.");
      const section = figma.createSection();
      const labelCollection = collection.name;
      section.name = `${GENERATED_PREFIX}${sources[0].name} — ${labelCollection}`;
      section.x = cursorX;
      section.y = minY;
      section.resize(Math.max(group.modes.length * width + (group.modes.length - 1) * panelGap + 64, 640), height + 96);
      section.fills = [{ type: "SOLID", color: { r: 0.94, g: 0.95, b: 0.97 } }];
      for (let i = 0; i < group.modes.length; i++) {
        const mode = group.modes[i];
        const panelX = gap + i * (width + panelGap);
        await addLabel(section, mode.name, panelX, 24);
        for (const source of sources) {
          const clone = source.clone();
          clone.name = `${mode.name} — ${source.name}`;
          section.appendChild(clone);
          clone.x = panelX + source.x - minX;
          clone.y = 64 + source.y - minY;
          applyMode(clone, group.collectionId, mode.id);
        }
      }
      created.push(section);
      cursorX = section.x + section.width + 96;
    }
    if (!created.length) throw new Error("Each group needs at least one mode selected.");
    figma.currentPage.selection = created;
    figma.viewport.scrollAndZoomIntoView(created);
    figma.notify(`${created.length} collection panel${created.length === 1 ? "" : "s"} created`);
  } catch (error) {
    figma.ui.postMessage({ type: "error", message: error instanceof Error ? error.message : "Unable to create comparison." });
  }
};

function getSourceNodes(): Array<FrameNode | ComponentNode | InstanceNode | SectionNode> {
  const selection = figma.currentPage.selection;
  if (!selection.length) throw new Error("Select at least one frame, component, instance, or section.");
  if (selection.some(node => !["FRAME", "COMPONENT", "INSTANCE", "SECTION"].includes(node.type))) throw new Error("Every selected node must be a frame, component, instance, or section.");
  return selection as Array<FrameNode | ComponentNode | InstanceNode | SectionNode>;
}

function applyMode(node: BaseNode, collectionId: string, modeId: string) {
  if ("setExplicitVariableModeForCollection" in node) (node as BaseNode & { setExplicitVariableModeForCollection: (id: string, mode: string) => void }).setExplicitVariableModeForCollection(collectionId, modeId);
  if ("children" in node) for (const child of node.children) applyMode(child, collectionId, modeId);
}

async function addLabel(parent: SectionNode, text: string, x: number, y: number) {
  const label = figma.createText();
  // Font is preloaded in init; reloading here is safe and guarantees availability.
  await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
  label.fontName = { family: "Inter", style: "Semi Bold" };
  label.fontSize = 16;
  label.characters = text;
  label.fills = [{ type: "SOLID", color: { r: 0.1, g: 0.12, b: 0.16 } }];
  label.x = x;
  label.y = y;
  parent.appendChild(label);
}
