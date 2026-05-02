import domtoimage from "dom-to-image-more";

export async function exportSectionAsPNG(elementId, filename) {
  const node = document.getElementById(elementId);

  if (!node) {
    throw new Error(`Could not find export section: ${elementId}`);
  }

  const blob = await domtoimage.toBlob(node, { quality: 1, scale: 2, useCORS: true });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename + ".png";
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
