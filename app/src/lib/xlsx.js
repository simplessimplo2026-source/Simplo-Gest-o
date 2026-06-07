function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colName(index) {
  let name = '';
  let n = index + 1;
  while (n > 0) {
    const mod = (n - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    n = Math.floor((n - mod) / 26);
  }
  return name;
}

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function rowStyle(row, rowIndex, headerRow) {
  const firstCell = String(row?.[0] ?? '').trim().toUpperCase();
  if (!firstCell) return 0;
  if (firstCell === 'BINHOTTI') return 1;
  if (firstCell === 'TERRAPLENAGEM') return 6;
  if (rowIndex === 2 && row.length === 1 && firstCell) return 7;
  if (rowIndex === headerRow) return 2;
  if (firstCell === 'DATA' && row.length > 1) return 2;
  if (firstCell.startsWith('TOTAL')) return 3;
  if (row.length === 1 && firstCell && rowIndex > headerRow) return 4;
  if (rowIndex > 0 && rowIndex < headerRow) return 5;
  return 0;
}

function drawingXml({ widthPx = 230, heightPx = 54 } = {}) {
  const cx = Math.round(widthPx * 9525);
  const cy = Math.round(heightPx * 9525);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="${cx}" cy="${cy}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Binhotti Terraplenagem"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`;
}

function sheetXml(rows, options = {}) {
  const headerRow = options.headerRow ?? 0;
  const hasDrawing = Boolean(options.hasDrawing);
  const maxCols = Math.max(...rows.map((row) => row.length), 1);
  const lastCol = colName(maxCols - 1);
  const lastRow = rows.length;
  const cols = Array.from({ length: maxCols }, (_, index) => {
    const width = Math.min(Math.max(...rows.map((row) => String(row[index] ?? '').length), 10) + 3, 46);
    return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
  }).join('');

  const sheetRows = rows.map((row, rowIndex) => {
    const style = rowStyle(row, rowIndex, headerRow);
    const firstCell = String(row?.[0] ?? '').trim().toUpperCase();
    let height = '';
    if (hasDrawing && rowIndex === 0) height = ' ht="34" customHeight="1"';
    else if (hasDrawing && rowIndex === 1) height = ' ht="20" customHeight="1"';
    else if (firstCell === 'BINHOTTI') height = ' ht="30" customHeight="1"';
    else if (firstCell === 'TERRAPLENAGEM') height = ' ht="20" customHeight="1"';
    else if (rowIndex === headerRow) height = ' ht="22" customHeight="1"';
    const cells = row.map((value, colIndex) => {
      const ref = `${colName(colIndex)}${rowIndex + 1}`;
      if (isNumber(value)) return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
      return `<c r="${ref}" s="${style}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
    }).join('');
    return `<row r="${rowIndex + 1}"${height}>${cells}</row>`;
  }).join('');

  const freeze = headerRow >= 0
    ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${headerRow + 1}" topLeftCell="A${headerRow + 2}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`
    : '';
  const autoFilter = headerRow >= 0 ? `<autoFilter ref="A${headerRow + 1}:${lastCol}${lastRow}"/>` : '';
  const mergeRefs = maxCols > 1
    ? rows
      .map((row, rowIndex) => (row.length === 1 && row[0] ? `<mergeCell ref="A${rowIndex + 1}:${lastCol}${rowIndex + 1}"/>` : ''))
      .filter(Boolean)
    : [];
  const mergeTitle = mergeRefs.length ? `<mergeCells count="${mergeRefs.length}">${mergeRefs.join('')}</mergeCells>` : '';

  const drawing = hasDrawing ? '<drawing r:id="rId1"/>' : '';
  const worksheetNs = hasDrawing
    ? 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
    : 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet ${worksheetNs}><dimension ref="A1:${lastCol}${lastRow}"/>${freeze}<cols>${cols}</cols><sheetData>${sheetRows}</sheetData>${autoFilter}${mergeTitle}${drawing}</worksheet>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="7"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="22"/><color rgb="FFFFFFFF"/><name val="Arial"/></font><font><b/><color rgb="FFFFFFFF"/><name val="Arial"/></font><font><b/><color rgb="FFFFFFFF"/><name val="Arial"/></font><font><b/><color rgb="FF1B3A6B"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FFC0272D"/><name val="Arial"/></font><font><b/><sz val="15"/><color rgb="FF1B3A6B"/><name val="Arial"/></font></fonts><fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1B3A6B"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFC0272D"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFD"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEFF4FB"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD9DEE8"/></left><right style="thin"><color rgb="FFD9DEE8"/></right><top style="thin"><color rgb="FFD9DEE8"/></top><bottom style="thin"><color rgb="FFD9DEE8"/></bottom><diagonal/></border></borders><cellXfs count="8"><xf fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf><xf fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf><xf fontId="4" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf><xf fontId="4" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf><xf fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf><xf fontId="6" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf></cellXfs></styleSheet>`;
}

function zipStore(files, type) {
  const encoder = new TextEncoder();
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    return c >>> 0;
  });
  const crc32 = (bytes) => {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i += 1) c = crcTable[(c ^ bytes[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const header = (sig, length) => {
    const bytes = new Uint8Array(length);
    const view = new DataView(bytes.buffer);
    view.setUint32(0, sig, true);
    return { bytes, view };
  };

  const parts = [];
  const centralParts = [];
  let offset = 0;

  Object.entries(files).forEach(([name, content]) => {
    const nameBytes = encoder.encode(name);
    const data = content instanceof Uint8Array
      ? content
      : content instanceof ArrayBuffer
        ? new Uint8Array(content)
        : encoder.encode(content);
    const crc = crc32(data);
    const local = header(0x04034b50, 30 + nameBytes.length);
    local.view.setUint16(4, 20, true);
    local.view.setUint16(8, 0, true);
    local.view.setUint32(14, crc, true);
    local.view.setUint32(18, data.length, true);
    local.view.setUint32(22, data.length, true);
    local.view.setUint16(26, nameBytes.length, true);
    local.bytes.set(nameBytes, 30);
    parts.push(local.bytes, data);

    const central = header(0x02014b50, 46 + nameBytes.length);
    central.view.setUint16(4, 20, true);
    central.view.setUint16(6, 20, true);
    central.view.setUint16(10, 0, true);
    central.view.setUint32(16, crc, true);
    central.view.setUint32(20, data.length, true);
    central.view.setUint32(24, data.length, true);
    central.view.setUint16(28, nameBytes.length, true);
    central.view.setUint32(42, offset, true);
    central.bytes.set(nameBytes, 46);
    centralParts.push(central.bytes);
    offset += local.bytes.length + data.length;
  });

  const centralOffset = offset;
  const centralSize = centralParts.reduce((sum, item) => sum + item.length, 0);
  centralParts.forEach((item) => {
    parts.push(item);
    offset += item.length;
  });

  const end = header(0x06054b50, 22);
  end.view.setUint16(8, centralParts.length, true);
  end.view.setUint16(10, centralParts.length, true);
  end.view.setUint32(12, centralSize, true);
  end.view.setUint32(16, centralOffset, true);
  parts.push(end.bytes);
  return new Blob(parts, { type });
}

async function loadLogoBytes(logoUrl) {
  const response = await fetch(logoUrl);
  if (!response.ok) throw new Error('Logo não carregou.');
  return new Uint8Array(await response.arrayBuffer());
}

function contentTypesXml(hasImage) {
  const imageDefaults = hasImage
    ? '<Default Extension="png" ContentType="image/png"/><Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>'
    : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${imageDefaults}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
}

function corePropertiesXml() {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>Simplo Gestão</dc:creator><cp:lastModifiedBy>Simplo Gestão</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`;
}

function appPropertiesXml() {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Simplo Gestão</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>1</vt:i4></vt:variant></vt:vector></HeadingPairs><TitlesOfParts><vt:vector size="1" baseType="lpstr"><vt:lpstr>Relatório</vt:lpstr></vt:vector></TitlesOfParts><Company>Simplo Gestão</Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>16.0000</AppVersion></Properties>';
}

export function createXlsxBlob(sheetName, rows, options = {}) {
  if (!rows?.length) return false;
  const safeSheet = String(sheetName || 'Relatorio').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Relatorio';
  const logoBytes = options.logoBytes || null;
  const hasImage = Boolean(logoBytes);
  const files = {
    '[Content_Types].xml': contentTypesXml(hasImage),
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>',
    'docProps/core.xml': corePropertiesXml(),
    'docProps/app.xml': appPropertiesXml(),
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xmlEscape(safeSheet)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    'xl/styles.xml': stylesXml(),
    'xl/worksheets/sheet1.xml': sheetXml(rows, { ...options, hasDrawing: hasImage }),
  };
  if (hasImage) {
    files['xl/worksheets/_rels/sheet1.xml.rels'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>';
    files['xl/drawings/drawing1.xml'] = drawingXml(options.logo);
    files['xl/drawings/_rels/drawing1.xml.rels'] = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/></Relationships>';
    files['xl/media/image1.png'] = logoBytes;
  }
  return zipStore(files, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

export async function downloadXlsx(filename, sheetName, rows, options = {}) {
  if (!rows?.length) return false;
  let logoBytes = null;
  if (options.logo !== false && options.logoUrl) {
    try {
      logoBytes = await loadLogoBytes(options.logoUrl);
    } catch {
      logoBytes = null;
    }
  }
  const blob = createXlsxBlob(sheetName, rows, { ...options, logoBytes });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    anchor.remove();
  }, 300);
  return true;
}
