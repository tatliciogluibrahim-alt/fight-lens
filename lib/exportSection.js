import domtoimage from "dom-to-image-more";

export async function exportSectionAsPNG(elementId, filename) {
  const node = document.getElementById(elementId);

  if (!node) {
    throw new Error(`Could not find export card: ${elementId}`);
  }

  if (node.dataset.exportCard !== "true") {
    throw new Error("This button must point to a dedicated export card, not a live page section.");
  }

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const width = Number(node.dataset.exportWidth ?? node.clientWidth);
  const height = Number(node.dataset.exportHeight ?? node.clientHeight);
  const blob = await domtoimage.toBlob(node, {
    quality: 1,
    width,
    height,
    bgcolor: "#090908",
    cacheBust: true,
    useCORS: true,
    filter: (child) => !(child instanceof HTMLElement && child.dataset.exportIgnore === "true")
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename + ".png";
  link.href = url;
  link.click();

  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}
