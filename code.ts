const GENERATED_PREFIX = "Theme Compare — ";

async function init() {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const data = collections.map((collection) => ({ id: collection.id, name: collection.name, modes: collection.modes.map((mode) => ({ id: mode.modeId, name: mode.name })) }));
  const html = __html__.replace("__COLLECTIONS__", JSON.stringify(data).replace(/</g, "\\u003c"));
  figma.showUI(html, { width: 420, height: 620, themeColors: true });
  figma.on("selectionchange", () => figma.ui.postMessage({ type: "selection", count: figma.currentPage.selection.length }));
  figma.ui.postMessage({ type: "selection", count: figma.currentPage.selection.length });
}
void init();

type CompareMessage = { type: "compare"; collectionId: string; modes: Array<{ id: string; name: string }> };

figma.ui.onmessage = async (message: CompareMessage | { type: "cancel" }) => {
  if (message.type === "cancel") { figma.closePlugin(); return; }
  try {
    const sources = getSourceNodes();
    const collection = await figma.variables.getVariableCollectionByIdAsync(message.collectionId);
    if (!collection) throw new Error("The selected variable collection is no longer available.");
    const minX = Math.min(...sources.map(n => n.x)), minY = Math.min(...sources.map(n => n.y));
    const width = Math.max(...sources.map(n => n.x + n.width)) - minX;
    const height = Math.max(...sources.map(n => n.y + n.height)) - minY;
    const gap = 48, panelGap = 64;
    const comparison = figma.createSection();
    comparison.name = `${GENERATED_PREFIX}${sources[0].name}`;
    comparison.x = Math.max(...sources.map(n => n.x + n.width)) + 96; comparison.y = minY;
    comparison.resize(Math.max(message.modes.length * width + (message.modes.length - 1) * panelGap + 64, 640), height + 96);
    comparison.fills = [{ type: "SOLID", color: { r: 0.94, g: 0.95, b: 0.97 } }];
    for (let i = 0; i < message.modes.length; i++) {
      const mode = message.modes[i], panelX = gap + i * (width + panelGap);
      await addLabel(comparison, mode.name, panelX, 24);
      for (const source of sources) {
        const clone = source.clone(); clone.name = `${mode.name} — ${source.name}`; comparison.appendChild(clone);
        clone.x = panelX + source.x - minX; clone.y = 64 + source.y - minY; applyMode(clone, message.collectionId, mode.id);
      }
    }
    figma.currentPage.selection = [comparison]; figma.viewport.scrollAndZoomIntoView([comparison]); figma.notify(`${message.modes.length} mode comparison created`);
  } catch (error) { figma.ui.postMessage({ type: "error", message: error instanceof Error ? error.message : "Unable to create comparison." }); }
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
  const label = figma.createText(); await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" }); label.fontName = { family: "Inter", style: "Semi Bold" }; label.fontSize = 16; label.characters = text; label.fills = [{ type: "SOLID", color: { r: 0.1, g: 0.12, b: 0.16 } }]; label.x = x; label.y = y; parent.appendChild(label);
}
