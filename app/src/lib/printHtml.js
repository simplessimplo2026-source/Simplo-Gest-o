export function printHtml(html) {
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none';
  document.body.appendChild(frame);

  const win = frame.contentWindow;
  if (!win) {
    frame.remove();
    return;
  }

  const doc = win.document;
  doc.open();
  doc.write(html);
  doc.close();

  const runPrint = () => {
    win.focus();
    win.print();
    setTimeout(() => frame.remove(), 1500);
  };

  const images = Array.from(doc.images || []);
  if (!images.length) {
    setTimeout(runPrint, 250);
    return;
  }

  Promise.all(images.map((image) => {
    if (image.complete) return Promise.resolve();
    return new Promise((resolve) => {
      image.onload = resolve;
      image.onerror = resolve;
    });
  })).then(() => setTimeout(runPrint, 150));
}
