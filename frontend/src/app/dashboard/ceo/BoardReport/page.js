'use client';

import React, { useState, useEffect, useMemo } from "react";
import api from '../../../../lib/api';

/* ── stylesheet ── */
const CSS = `
*, *::before, *::after { box-sizing: border-box; }
table { border-collapse: collapse; }
.flex { display: flex; }
.grid { display: grid; }
.inline-block { display: inline-block; }
.flex-wrap { flex-wrap: wrap; }
.items-center { align-items: center; }
.items-start { align-items: flex-start; }
.justify-between { justify-content: space-between; }
.justify-center { justify-content: center; }
.gap-2 { gap: 0.5rem; }
.gap-3 { gap: 0.75rem; }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
@media (min-width: 1024px) {
  .lg\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
.overflow-hidden { overflow: hidden; }
.min-h-screen { min-height: 100vh; }
.mx-auto { margin-left: auto; margin-right: auto; }
.ml-auto { margin-left: auto; }
.max-w-5xl { max-width: 64rem; }
.max-w-xl { max-width: 36rem; }
.w-full { width: 100%; }
.w-12 { width: 3rem; }
.w-16 { width: 4rem; }
.w-7 { width: 1.75rem; }
.w-2\\.5 { width: 0.625rem; }
.h-full { height: 100%; }
.h-auto { height: auto; }
.h-7 { height: 1.75rem; }
.h-2\\.5 { height: 0.625rem; }
.p-4 { padding: 1rem; }
.p-5 { padding: 1.25rem; }
.p-6 { padding: 1.5rem; }
.px-1 { padding-left: 0.25rem; padding-right: 0.25rem; }
.px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
.px-2\\.5 { padding-left: 0.625rem; padding-right: 0.625rem; }
.px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.py-0\\.5 { padding-top: 0.125rem; padding-bottom: 0.125rem; }
.py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
.py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
.mt-1 { margin-top: 0.25rem; }
.mb-1 { margin-bottom: 0.25rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 0.75rem; }
.mb-4 { margin-bottom: 1rem; }
.text-xs { font-size: 0.75rem; line-height: 1rem; }
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }
.text-base { font-size: 1rem; line-height: 1.5rem; }
.text-2xl { font-size: 1.5rem; line-height: 2rem; }
.text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
.font-extrabold { font-weight: 800; }
.text-left { text-align: left; }
.text-center { text-align: center; }
.text-right { text-align: right; }
.uppercase { text-transform: uppercase; }
.tracking-wide { letter-spacing: 0.025em; }
.leading-5 { line-height: 1.25rem; }
.underline { text-decoration: underline; }
.text-white { color: #fff; }
.opacity-80 { opacity: 0.8; }
.opacity-90 { opacity: 0.9; }
.border { border-width: 1px; border-style: solid; border-color: #E4E0D8; }
.border-t { border-top-width: 1px; border-top-style: solid; border-top-color: #E4E0D8; }
.border-b { border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: #E4E0D8; }
.border-dashed { border-style: dashed; }
.border-transparent { border-color: transparent; }
.rounded { border-radius: 0.25rem; }
.rounded-md { border-radius: 0.375rem; }
.rounded-lg { border-radius: 0.5rem; }
.rounded-xl { border-radius: 0.75rem; }
.rounded-2xl { border-radius: 1rem; }
.rounded-full { border-radius: 9999px; }
.bg-white { background-color: #fff; }
.bg-transparent { background-color: transparent; }
.cursor-pointer { cursor: pointer; }
.outline-none { outline: none; }
.transition-all { transition: all 0.2s ease; }
.last\\:border-0:last-child { border-width: 0; }
.hover\\:border-current:hover { border-color: currentColor; }
.focus\\:bg-white:focus { background-color: #fff; }
.focus\\:outline-none:focus { outline: none; }
.focus-visible\\:ring-2:focus-visible { box-shadow: 0 0 0 2px #C9A84C; border-radius: 2px; }
.focus-visible\\:ring-offset-1:focus-visible { box-shadow: 0 0 0 1px #fff, 0 0 0 3px #C9A84C; }
.disabled\\:bg-transparent:disabled { background-color: transparent; }
.disabled\\:cursor-not-allowed:disabled { cursor: not-allowed; }
@media (prefers-reduced-motion: reduce) {
  .transition-all { transition: none; }
}
`;

const T = {
  navy: "#0D2B55",
  navy2: "#16386b",
  gold: "#C9A84C",
  ink: "#1f2733",
  muted: "#667085",
  border: "#E4E0D8",
  off: "#F6F4EF",
  green: "#0F7A52",
  amber: "#92400E",
  red: "#B42318",
};

const CRIT = [
  { key: "competence",    label: "Job Competence",             weight: 10, color: "#7C3AED" },
  { key: "behaviors",     label: "Behaviours",                 weight: 20, color: "#1E40AF" },
  { key: "dependability", label: "Dependability",              weight: 10, color: "#0369A1" },
  { key: "adaptability",  label: "Adaptability",               weight: 10, color: "#D97706" },
  { key: "safety",        label: "Safe Working",               weight: 20, color: "#059669" },
  { key: "results",       label: "Delivered Expected Results", weight: 30, color: "#0D2B55" },
];

const RB = [
  { k: "LS", v: 0,   bg: "#FEE2E2", fg: "#B42318", hex: "#EF4444", label: "Less than Satisfactory" },
  { k: "NI", v: 0.7, bg: "#FEF3C7", fg: "#92400E", hex: "#F59E0B", label: "Needs Improvement" },
  { k: "E",  v: 1.0, bg: "#D1FAE5", fg: "#065F46", hex: "#10B981", label: "Fully Effective" },
  { k: "EP", v: 1.3, bg: "#DBEAFE", fg: "#1E40AF", hex: "#3B82F6", label: "Exceeds Performance" },
];

const rateLbl = (v) => (v === 1 ? "1" : String(v));

/* ── PDF & Excel Export Libraries ── */
const LIB = {
  xlsx:  "https://unpkg.com/xlsx-js-style@1.2.0/dist/xlsx.min.js",
  jspdf: "https://unpkg.com/jspdf@4.2.1/dist/jspdf.umd.min.js",
  auto:  "https://unpkg.com/jspdf-autotable@5.0.8/dist/jspdf.plugin.autotable.min.js",
  jszip: "https://unpkg.com/jszip@3.10.1/dist/jszip.min.js",
};

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-src="${src}"]`)) return resolve();
    const el = document.createElement("script");
    el.src = src;
    el.dataset.src = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("could not load " + src));
    document.head.appendChild(el);
  });

async function ensureLibs(kind) {
  if (kind === "xlsx") {
    if (!window.XLSX) await loadScript(LIB.xlsx);
    if (!window.JSZip) await loadScript(LIB.jszip);
  } else {
    if (!(window.jspdf && window.jspdf.jsPDF)) await loadScript(LIB.jspdf);
    if (!(window.jspdf.jsPDF.API && window.jspdf.jsPDF.API.autoTable)) await loadScript(LIB.auto);
  }
}

const stamp = () => new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const hx = (h) => [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
const noHash = (c) => c.replace("#", "");

function chartXML(nRows) {
  const first = 6, last = first + nRows - 1, S = "'Board Report'";
  const ser = RB.map((b, i) => {
    const col = String.fromCharCode(66 + i); 
    return `<c:ser><c:idx val="${i}"/><c:order val="${i}"/>`
      + `<c:tx><c:strRef><c:f>${S}!$${col}$5</c:f></c:strRef></c:tx>`
      + `<c:spPr><a:solidFill><a:srgbClr val="${noHash(b.hex)}"/></a:solidFill></c:spPr>`
      + `<c:dLbls><c:spPr><a:noFill/></c:spPr><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>`
      + `<c:cat><c:strRef><c:f>${S}!$A$${first}:$A$${last}</c:f></c:strRef></c:cat>`
      + `<c:val><c:numRef><c:f>${S}!$${col}$${first}:$${col}$${last}</c:f></c:numRef></c:val></c:ser>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
    + `<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`
    + `<c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1200" b="1"><a:solidFill><a:srgbClr val="0D2B55"/></a:solidFill></a:defRPr></a:pPr>`
    + `<a:r><a:rPr lang="en-GB" sz="1200" b="1"/><a:t>Employees per rating, by criterion</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>`
    + `<c:autoTitleDeleted val="0"/><c:plotArea><c:layout/>`
    + `<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>${ser}`
    + `<c:gapWidth val="60"/><c:axId val="111111111"/><c:axId val="222222222"/></c:barChart>`
    + `<c:catAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="222222222"/></c:catAx>`
    + `<c:valAx><c:axId val="222222222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines/>`
    + `<c:title><c:tx><c:rich><a:bodyPr rot="-5400000" vert="horz"/><a:lstStyle/><a:p><a:r><a:rPr lang="en-GB" sz="900"/><a:t>Employees</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>`
    + `<c:crossAx val="111111111"/></c:valAx></c:plotArea>`
    + `<c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend>`
    + `<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart></c:chartSpace>`;
}

const DRAW_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
  + `<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`
  + `<xdr:twoCellAnchor editAs="oneCell">`
  + `<xdr:from><xdr:col>7</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>3</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>`
  + `<xdr:to><xdr:col>16</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>21</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>`
  + `<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Chart 1"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>`
  + `<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>`
  + `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">`
  + `<c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId1"/>`
  + `</a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>`;
  
const DRAW_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
  + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
  + `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/></Relationships>`;

async function makeXlsx(d) {
  await ensureLibs("xlsx");
  const XLSX = window.XLSX, JSZip = window.JSZip;
  const NAVY = "0D2B55", NAVY2 = "16386B", GOLD = "C9A84C", MUT = "667085";
  const thin = { style: "thin", color: { rgb: "FFD8D3C8" } };
  const border = { top: thin, bottom: thin, left: thin, right: thin };
  const cell = (v, st) => ({ v, t: typeof v === "number" ? "n" : "s", s: st });
  const A = "ABCDEFGH".split("");
  const ws = {};

  ws.A1 = cell("FSM PETROLEUM CORPORATION \u2014 STIP BOARD REPORT",
    { font: { bold: true, sz: 14, color: { rgb: "FF" + GOLD } }, fill: { fgColor: { rgb: "FF" + NAVY } }, alignment: { vertical: "center" } });
  for (let i = 1; i < 6; i++) ws[A[i] + "1"] = cell("", { fill: { fgColor: { rgb: "FF" + NAVY } } });
  ws.A2 = cell(`Actual numbers by criteria \u00b7 ${d.scope} \u00b7 ${d.period} \u00b7 ${d.N} employees \u00b7 generated ${stamp()}`,
    { font: { sz: 9.5, color: { rgb: "FFD6DAE2" } }, fill: { fgColor: { rgb: "FF" + NAVY2 } }, alignment: { vertical: "center" } });
  for (let i = 1; i < 6; i++) ws[A[i] + "2"] = cell("", { fill: { fgColor: { rgb: "FF" + NAVY2 } } });

  ws.A5 = cell("Criterion", { font: { bold: true, color: { rgb: "FFFFFFFF" } }, fill: { fgColor: { rgb: "FF" + NAVY } }, border, alignment: { horizontal: "left" } });
  RB.forEach((b, j) => {
    ws[A[j + 1] + "5"] = cell(rateLbl(b.v),
      { font: { bold: true, sz: 12, color: { rgb: "FF" + noHash(b.fg) } }, fill: { fgColor: { rgb: "FF" + noHash(b.bg) } }, border, alignment: { horizontal: "center" } });
  });
  ws.F5 = cell("Total", { font: { bold: true, color: { rgb: "FFFFFFFF" } }, fill: { fgColor: { rgb: "FF" + NAVY } }, border, alignment: { horizontal: "center" } });

  d.critRows.forEach((r, i) => {
    const rw = 6 + i, z = i % 2 ? "FFFBFAF7" : "FFFFFFFF";
    ws["A" + rw] = cell(r.cat.label, { font: { bold: true, color: { rgb: "FF" + noHash(r.cat.color) } }, fill: { fgColor: { rgb: z } }, border, alignment: { horizontal: "left" } });
    RB.forEach((b, j) => {
      ws[A[j + 1] + rw] = cell(r.counts[b.k], { font: { bold: true, sz: 11, color: { rgb: "FF1F2733" } }, fill: { fgColor: { rgb: z } }, border, alignment: { horizontal: "center" } });
    });
    ws["F" + rw] = cell(r.rated, { font: { color: { rgb: "FF" + MUT } }, fill: { fgColor: { rgb: z } }, border, alignment: { horizontal: "center" } });
  });
  
  const nr = 6 + d.critRows.length + 1;
  ws["A" + nr] = cell(`Every employee is rated on all six criteria, so each criterion row totals ${d.N}. The chart reads these cells \u2014 edit a figure and it redraws.`,
    { font: { italic: true, sz: 9, color: { rgb: "FF" + MUT } } });

  ws["!ref"] = "A1:P" + (nr + 2);
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }, { s: { r: nr - 1, c: 0 }, e: { r: nr - 1, c: 5 } }];
  ws["!cols"] = [{ wch: 30 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 2 }, { wch: 9 }];
  ws["!rows"] = []; ws["!rows"][0] = { hpt: 26 }; ws["!rows"][1] = { hpt: 17 }; ws["!rows"][4] = { hpt: 20 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Board Report");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });

  const zip = await JSZip.loadAsync(buf);
  zip.file("xl/charts/chart1.xml", chartXML(d.critRows.length));
  zip.file("xl/drawings/drawing1.xml", DRAW_XML);
  zip.file("xl/drawings/_rels/drawing1.xml.rels", DRAW_RELS);

  const relFile = zip.file("xl/worksheets/_rels/sheet1.xml.rels");
  const relXml = relFile
    ? (await relFile.async("string")).replace("</Relationships>",
        `<Relationship Id="rIdDrw" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`)
    : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdDrw" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`;
  zip.file("xl/worksheets/_rels/sheet1.xml.rels", relXml);

  let sx = await zip.file("xl/worksheets/sheet1.xml").async("string");
  if (sx.indexOf("<drawing") < 0) sx = sx.replace("</worksheet>", `<drawing r:id="rIdDrw"/></worksheet>`);
  if (sx.indexOf("xmlns:r=") < 0) sx = sx.replace("<worksheet ", `<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" `);
  zip.file("xl/worksheets/sheet1.xml", sx);

  let ct = await zip.file("[Content_Types].xml").async("string");
  ct = ct.replace("</Types>",
    `<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`
    + `<Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>`);
  zip.file("[Content_Types].xml", ct);

  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

async function makePdf(d) {
  await ensureLibs("pdf");
  const doc = new window.jspdf.jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  doc.setFillColor(13, 43, 85); doc.rect(0, 0, W, 27, "F");
  doc.setFillColor(201, 168, 76); doc.rect(0, 27, W, 1.6, "F");
  doc.setTextColor(201, 168, 76); doc.setFontSize(15); doc.setFont(undefined, "bold");
  doc.text("FSM Petroleum Corporation", 14, 12);
  doc.setTextColor(255, 255, 255); doc.setFontSize(10.5); doc.setFont(undefined, "normal");
  doc.text("STIP Board Report \u2014 " + d.period, 14, 20);
  doc.setFontSize(8); doc.setTextColor(210, 214, 222);
  doc.text(`${d.scope} \u00b7 ${d.N} employees \u00b7 ${stamp()}`, W - 14, 20, { align: "right" });

  doc.setTextColor(13, 43, 85); doc.setFontSize(11); doc.setFont(undefined, "bold");
  doc.text("Actual numbers by criteria", 14, 40);
  doc.setFont(undefined, "normal"); doc.setFontSize(8); doc.setTextColor(102, 112, 133);
  doc.text("How many employees received each rating, in each criterion.", 14, 45);

  const body = d.critRows.map((r) => [r.cat.label, r.counts.LS, r.counts.NI, r.counts.E, r.counts.EP, r.rated]);
  doc.autoTable({
    head: [["Criterion", "0", "0.7", "1", "1.3", "Total"]], body, startY: 49, theme: "grid",
    styles: { fontSize: 9, cellPadding: 2.4, lineColor: [228, 224, 216], lineWidth: 0.2, halign: "center" },
    headStyles: { fillColor: [13, 43, 85], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
    alternateRowStyles: { fillColor: [251, 250, 247] },
    columnStyles: { 0: { halign: "left", cellWidth: 56, fontStyle: "bold" } },
    didParseCell: (h) => {
      if (h.section === "head" && h.column.index >= 1 && h.column.index <= 4) {
        const b = RB[h.column.index - 1];
        h.cell.styles.fillColor = hx(noHash(b.bg));
        h.cell.styles.textColor = hx(noHash(b.fg));
        h.cell.styles.fontSize = 11;
      }
      if (h.section === "body") {
        if (h.column.index === 0) h.cell.styles.textColor = hx(noHash(d.critRows[h.row.index].cat.color));
      }
    },
  });

  const y0 = doc.lastAutoTable.finalY + 12;
  doc.setTextColor(13, 43, 85); doc.setFontSize(11); doc.setFont(undefined, "bold");
  doc.text("The same figures, as a chart", 14, y0);
  doc.setFont(undefined, "normal"); doc.setFontSize(8); doc.setTextColor(102, 112, 133);
  doc.text("Employees per rating, grouped by criterion.", 14, y0 + 5);

  const cx0 = 20, cy0 = y0 + 12, cw = W - 34, ch = 52;
  const maxV = Math.max(1, ...d.critRows.flatMap((r) => RB.map((b) => r.counts[b.k])));
  doc.setFontSize(6); doc.setDrawColor(230, 228, 222); doc.setLineWidth(0.15);
  [0, 0.25, 0.5, 0.75, 1].forEach((f) => {
    const v = Math.round(maxV * f), yy = cy0 + ch - f * ch;
    doc.line(cx0, yy, cx0 + cw, yy);
    doc.setTextColor(150, 158, 170); doc.text(String(v), cx0 - 2, yy + 1, { align: "right" });
  });
  const gw = cw / d.critRows.length, bw = Math.min(4.2, (gw - 3) / 4);
  d.critRows.forEach((r, i) => {
    const gx = cx0 + gw * i + (gw - bw * 4 - 1.5) / 2;
    RB.forEach((b, j) => {
      const v = r.counts[b.k], h = (v / maxV) * ch, x = gx + j * (bw + 0.5);
      const c = hx(noHash(b.hex)); doc.setFillColor(c[0], c[1], c[2]);
      if (h > 0.2) doc.rect(x, cy0 + ch - h, bw, h, "F");
      if (v > 0) { doc.setFontSize(5.4); doc.setTextColor(13, 43, 85); doc.text(String(v), x + bw / 2, cy0 + ch - h - 1, { align: "center" }); }
    });
    doc.setFontSize(6); doc.setTextColor(13, 43, 85);
    const lbl = r.cat.label.length > 16 ? r.cat.label.slice(0, 15) + "\u2026" : r.cat.label;
    doc.text(lbl, cx0 + gw * i + gw / 2, cy0 + ch + 4, { align: "center" });
  });
  let lx = cx0; const ly = cy0 + ch + 10;
  RB.forEach((b) => {
    const c = hx(noHash(b.hex)); doc.setFillColor(c[0], c[1], c[2]); doc.rect(lx, ly - 2.4, 2.6, 2.6, "F");
    doc.setFontSize(6.4); doc.setTextColor(102, 112, 133);
    doc.text(`${rateLbl(b.v)} \u00b7 ${b.k} (${d.totals[b.k]})`, lx + 3.6, ly);
    lx += 32;
  });
  doc.setFontSize(7.5); doc.setTextColor(102, 112, 133);
  doc.text(`Every employee is rated on all six criteria, so each criterion row totals ${d.N}.`, 14, ly + 9);
  doc.setDrawColor(228, 224, 216); doc.setLineWidth(0.3); doc.line(14, 283, W - 14, 283);
  doc.setFontSize(7); doc.setTextColor(150, 158, 170);
  doc.text(`FSM Petroleum Corporation \u00b7 STIP Board Report \u00b7 ${d.period} \u00b7 ${stamp()}`, 14, 288);
  doc.text("Page 1", W - 14, 288, { align: "right" });
  doc.save(`STIP_Board_Report_${d.period.replace(" ", "_")}.pdf`);
}

/* ── UI Components ── */
const Card = ({ children, className = "" }) => (
  <div className={`rounded-2xl border bg-white ${className}`} style={{ borderColor: T.border }}>
    {children}
  </div>
);

function BoardBars({ d }) {
  const W = 760, H = 250, padL = 34, padR = 8, padT = 22, padB = 52;
  const pw = W - padL - padR, ph = H - padT - padB;
  const maxV = Math.max(1, ...d.critRows.flatMap((r) => RB.map((b) => r.counts[b.k])));
  const gw = pw / CRIT.length, bw = Math.min(15, (gw - 10) / 4);
  const y = (v) => padT + ph - (v / maxV) * ph;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const v = Math.round(maxV * f);
        return (
          <g key={f}>
            <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="#F0EEE8" />
            <text x={padL - 5} y={y(v) + 3} textAnchor="end" fontSize="9" fill="#9aa3b0">{v}</text>
          </g>
        );
      })}
      {d.critRows.map((r, i) => {
        const gx = padL + gw * i + (gw - bw * 4 - 6) / 2;
        const lbl = r.cat.label.length > 17 ? r.cat.label.slice(0, 16) + "…" : r.cat.label;
        return (
          <g key={r.cat.key}>
            {RB.map((b, j) => {
              const v = r.counts[b.k], x = gx + j * (bw + 2);
              return (
                <g key={b.k}>
                  <rect x={x} y={y(v)} width={bw} height={Math.max(1, (v / maxV) * ph)} rx="2" fill={b.hex}>
                    <title>{`${r.cat.label} · rating ${rateLbl(b.v)} · ${v} employees`}</title>
                  </rect>
                  {v > 0 && <text x={x + bw / 2} y={y(v) - 3} textAnchor="middle" fontSize="8" fontWeight="700" fill={T.navy}>{v}</text>}
                </g>
              );
            })}
            <text x={padL + gw * i + gw / 2} y={H - 32} textAnchor="middle" fontSize="9" fontWeight="700" fill={T.navy}>{lbl}</text>
          </g>
        );
      })}
      {RB.map((b, i) => (
        <g key={b.k}>
          <rect x={padL + i * 78} y={H - 16} width="9" height="9" rx="2" fill={b.hex} />
          <text x={padL + i * 78 + 13} y={H - 8} fontSize="9" fill={T.muted}>{rateLbl(b.v)} · {b.k}</text>
        </g>
      ))}
    </svg>
  );
}

function BoardDonut({ d }) {
  const R = 52, r0 = 31, cx = 64, cy = 64, tot = d.totalRatings || 1;
  let a = -Math.PI / 2;
  const arcs = RB.map((b) => {
    const v = d.totals[b.k], frac = v / tot, a2 = a + frac * Math.PI * 2;
    const large = frac > 0.5 ? 1 : 0;
    const path = ["M", cx + R * Math.cos(a), cy + R * Math.sin(a), "A", R, R, 0, large, 1, cx + R * Math.cos(a2), cy + R * Math.sin(a2),
      "L", cx + r0 * Math.cos(a2), cy + r0 * Math.sin(a2), "A", r0, r0, 0, large, 0, cx + r0 * Math.cos(a), cy + r0 * Math.sin(a), "Z"].join(" ");
    const el = v > 0 ? <path key={b.k} d={path} fill={b.hex}><title>{`${b.label} · ${v} (${((v / tot) * 100).toFixed(1)}%)`}</title></path> : null;
    a = a2;
    return el;
  });
  return (
    <svg viewBox="0 0 128 128" style={{ width: 128, height: 128 }}>
      {arcs}
    </svg>
  );
}

/* ── Main Export ── */
export default function BoardReportPage() {
  const currentYear = new Date().getFullYear();
  
  const [years, setYears] = useState([currentYear - 2, currentYear - 1, currentYear, currentYear + 1]);
  const [offices, setOffices] = useState(["All"]);
  
  const [year, setYear] = useState(currentYear.toString());
  const [quarter, setQuarter] = useState("");
  const [office, setOffice] = useState("All");
  
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const [isManualYear, setIsManualYear] = useState(false);
  const [dbQuarters, setDbQuarters] = useState([]);
  const [metrics, setMetrics] = useState(null);

  // 1. Fetch Config & Quarters ONCE (Lazy load heavy data later)
  useEffect(() => {
    const fetchBaseData = async () => {
      try {
        const [configRes, qtrsRes] = await Promise.all([
          api.get('/config/dropdowns').catch(() => ({ data: { data: {} } })),
          api.get('/quarters').catch(() => ({ data: { data: [] } }))
        ]);

        const companyCodes = configRes.data?.data?.companyCodes || ['FSM', 'CDU', 'NAR', 'GUM'];
        setOffices(["All", ...companyCodes]);
        
        const fetchedQuarters = qtrsRes.data?.data || [];
        fetchedQuarters.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        setDbQuarters(fetchedQuarters);
      } catch (error) {
        console.error("Failed to load base data", error);
        setOffices(["All", "FSM", "CDU", "NAR", "GUM"]); 
      }
    };
    fetchBaseData();
  }, []);

  // 2. Fetch Dynamic Metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      if (!year) return;
      try {
        const targetMonth = quarter ? (parseInt(quarter.replace('Q', '')) * 3 || 3) : 3;
        const metricsRes = await api.get(`/company-metrics/${year}/${targetMonth}`).catch(() => ({ data: { data: null } }));
        setMetrics(metricsRes.data?.data || null);
      } catch (error) {
        console.error('Failed to fetch metrics', error);
      }
    };
    fetchMetrics();
  }, [year, quarter]);

  // 3. Dynamic Quarters Check
  useEffect(() => {
    if (dbQuarters.length === 0) return;
    const qtrsForSelectedYear = dbQuarters.filter(q => q.year.toString() === year.toString());
    if (qtrsForSelectedYear.length > 0) {
      const availableQs = [...new Set(qtrsForSelectedYear.map(q => {
        const m = String(q.name).match(/Q?([1-4])/i);
        return m ? `Q${m[1]}` : q.name;
      }))].sort();
      
      if (!quarter || !availableQs.includes(quarter)) {
        setQuarter(availableQs[availableQs.length - 1]);
      }
    } else {
      setQuarter('');
    }
  }, [dbQuarters, year, quarter]);

  const qtrsForSelectedYear = dbQuarters.filter(q => q.year.toString() === year.toString());
  const uniqueAvailableQuarters = [...new Set(qtrsForSelectedYear.map(q => {
    const m = String(q.name).match(/Q?([1-4])/i);
    return m ? `Q${m[1]}` : q.name;
  }))].sort();

  // 4. Fetch Actual Real-Time Aggregated Data from Database
  useEffect(() => {
    const fetchReport = async () => {
      if (!quarter) return;
      setLoading(true);
      try {
        const res = await api.get(`/reports/board-report`, { params: { year, quarter, office } });
        setD(res.data.data);
      } catch (err) {
        console.error("Failed to fetch Board Report data", err);
      }
      setLoading(false);
    };
    fetchReport();
  }, [year, quarter, office]);

  const triggerCSV = (csvContent, filename) => {
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerPDF = (title, tableHtml, summaryHtml = '') => {
    const htmlContent = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; color: #333; margin: 40px; }
            h1 { color: #0D2B55; text-align: center; border-bottom: 2px solid #0D2B55; padding-bottom: 10px; }
            .meta { text-align: center; color: #666; margin-bottom: 30px; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 10px 8px; text-align: left; }
            th { background-color: #0D2B55; color: white; font-weight: bold; }
            .right { text-align: right; }
            .center { text-align: center; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .total-row { font-size: 16px; font-weight: bold; color: #0D2B55; text-align: right; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="meta">Generated: ${new Date().toLocaleDateString('en-GB')} | Financial Year: CY${year} | FSM Petroleum Corporation</div>
          ${summaryHtml}
          ${tableHtml}
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 250);
  };

  // 🚨 UPGRADE: Heavy Lazy Loaded Office PDF/CSV Generator
  const generateOffice = async (fmt) => {
    setBusy(`office-${fmt}`);
    try {
      const [userRes, appRes] = await Promise.all([
        api.get('/users').catch(() => ({ data: { data: [] } })),
        api.get('/appraisals').catch(() => ({ data: { data: [] } }))
      ]);
      
      const currentUsers = userRes.data?.data || [];
      const currentApps = appRes.data?.data || [];
      
      const companyList = offices.filter(o => o !== 'All');
      const data = companyList.map(off => {
        const staff = currentUsers.filter(u => u.companyCode === off);
        const apps = currentApps.filter(a => {
           const appYear = a.reviewYear || a.appraisalQuarter?.year || a.period?.year;
           return a.employeeId?.companyCode === off && appYear?.toString() === year.toString();
        });
        const apprs = apps.filter(a => a.workflow?.status === 'APPROVED');
        const eps = apps.filter(a => a.calculatedResults?.finalIprfScore >= 1.3).length;
        let payout = 0;
        if (metrics?.cpPct) {
          payout = apprs.reduce((s, a) => s + ((a.employeeBaseSalary || 30000) * (((metrics.cpPct * (a.calculatedResults?.finalIprfScore || 0)) * ((a.employeeId?.employmentDetails?.prorateValue || 12)/12)) / 100)), 0);
        }
        return { off, staff: staff.length, apps: apps.length, apprs: apprs.length, eps, payout };
      });

      if (fmt === 'csv') {
        let csv = "Company,Headcount,Submitted Appraisals,Approved Appraisals,EP Ratings,Est Payout ($)\r\n";
        data.forEach(x => { csv += `"${x.off}","${x.staff}","${x.apps}","${x.apprs}","${x.eps}","${x.payout.toFixed(2)}"\r\n`; });
        triggerCSV(csv, `STIP_Office_Report_CY${year}.csv`);
      } else {
        let rows = '';
        data.forEach(x => { rows += `<tr><td class="center font-bold">${x.off}</td><td class="center">${x.staff}</td><td class="center">${x.apps}</td><td class="center">${x.apprs}</td><td class="center">${x.eps}</td><td class="right">$${x.payout.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td></tr>`; });
        const tableHtml = `<table><thead><tr><th>Company</th><th>Headcount</th><th>Submitted</th><th>Approved</th><th>EP Ratings</th><th class="right">Est Payout ($)</th></tr></thead><tbody>${rows}</tbody></table>`;
        triggerPDF('Report by Office', tableHtml);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to generate Office report");
    }
    setBusy("");
  };

  const onExcel = async () => {
    if (!d) return;
    setBusy("xlsx");
    try {
      const blob = await makeXlsx(d);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `STIP_Board_Report_${d.period.replace(" ", "_")}.xlsx`;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    } catch (e) { alert("Excel export failed: " + e.message); }
    setBusy("");
  };

  const onPdf = async () => {
    if (!d) return;
    setBusy("pdf");
    try { await makePdf(d); } catch (e) { alert("PDF export failed: " + e.message); }
    setBusy("");
  };

  const csv = () => {
    if (!d) return;
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["FSM Petroleum Corporation — STIP Board Report"],
      [`Actual numbers by criteria · ${d.scope} · ${d.period} · ${d.N} employees`],
      [],
      ["Criterion", "0", "0.7", "1", "1.3", "Total", "Weight %", "Average", "Contribution"],
      ...d.critRows.map((r) => [r.cat.label, r.counts.LS, r.counts.NI, r.counts.E, r.counts.EP, r.rated, r.cat.weight, r.avg.toFixed(2), r.contrib.toFixed(3)]),
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + rows.map((r) => r.map(esc).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    a.download = `STIP_Board_Report_${d.period.replace(" ", "_")}.csv`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  };

  return (
    <div className="min-h-screen p-6" style={{ background: T.off, color: T.ink, fontFamily: "'Avenir Next','Avenir','Segoe UI',system-ui,sans-serif" }}>
      <style>{CSS}</style>
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: T.navy }}>
              📊 Board Report — {d ? d.period : "Loading..."}
            </h1>
            <p className="text-sm" style={{ color: T.muted }}>
              Actual numbers by criteria · {d ? d.scope : ""} · <b>{d ? d.N : "0"}</b> employees
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2" style={{ borderColor: T.border }}>
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: T.muted }}>Year</span>
              {isManualYear ? (
                <input 
                  type="number" 
                  autoFocus
                  defaultValue={year}
                  onBlur={(e) => {
                    if (e.target.value) setYear(e.target.value);
                    setIsManualYear(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (e.target.value) setYear(e.target.value);
                      setIsManualYear(false);
                    }
                  }}
                  className="bg-transparent text-sm font-bold outline-none w-16" style={{ color: T.navy }}
                />
              ) : (
                <select 
                  value={year} 
                  onChange={(e) => {
                    if (e.target.value === 'manual') setIsManualYear(true);
                    else setYear(e.target.value);
                  }} 
                  className="cursor-pointer bg-transparent text-sm font-bold outline-none" style={{ color: T.navy }}
                >
                  {years.map((y) => (<option key={y} value={y}>{y}</option>))}
                  <option value="manual" className="font-bold text-[#1E40AF]">Enter Manually...</option>
                </select>
              )}
            </label>
            <label className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2" style={{ borderColor: T.border }}>
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: T.muted }}>Quarter</span>
              <select 
                value={quarter} 
                onChange={(e) => setQuarter(e.target.value)} 
                disabled={uniqueAvailableQuarters.length === 0}
                className="cursor-pointer bg-transparent text-sm font-bold outline-none" style={{ color: T.navy }}
              >
                {uniqueAvailableQuarters.length === 0 && <option value="">No Quarters</option>}
                {uniqueAvailableQuarters.map((x) => (<option key={x} value={x}>{x}</option>))}
              </select>
            </label>
            <button type="button" onClick={onExcel} disabled={!!busy || loading} className="rounded-xl px-4 py-2 text-sm font-bold disabled:cursor-not-allowed" style={{ background: T.gold, color: T.navy, border: "1px solid #B99433", opacity: busy === "xlsx" || loading ? 0.6 : 1 }}>
              {busy === "xlsx" ? "…" : "⬇ Excel"}
            </button>
            <button type="button" onClick={onPdf} disabled={!!busy || loading} className="rounded-xl px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed" style={{ background: T.navy, opacity: busy === "pdf" || loading ? 0.6 : 1 }}>
              {busy === "pdf" ? "…" : "⬇ PDF"}
            </button>
            <button type="button" onClick={csv} disabled={loading} className="rounded-xl border bg-white px-4 py-2 text-sm font-bold disabled:opacity-60" style={{ borderColor: T.border, color: T.navy }}>
              ⬇ CSV
            </button>
            <div className="flex gap-2 border-l pl-2 ml-2" style={{ borderColor: T.border }}>
              <button type="button" onClick={() => generateOffice('pdf')} disabled={!!busy || loading || !metrics} className="rounded-xl border bg-white px-4 py-2 text-sm font-bold disabled:opacity-60" style={{ borderColor: T.border, color: T.navy }}>
                {busy === 'office-pdf' ? "..." : "🏢 Office PDF"}
              </button>
              <button type="button" onClick={() => generateOffice('csv')} disabled={!!busy || loading || !metrics} className="rounded-xl border bg-white px-4 py-2 text-sm font-bold disabled:opacity-60" style={{ borderColor: T.border, color: T.navy }}>
                {busy === 'office-csv' ? "..." : "🏢 Office CSV"}
              </button>
            </div>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {offices.map((o) => (
            <button key={o} type="button" onClick={() => setOffice(o)}
              className="rounded-lg px-3 py-1 text-xs font-bold"
              style={{ background: o === office ? T.navy : "#fff", color: o === office ? "#fff" : T.muted, border: `1px solid ${o === office ? T.navy : T.border}` }}>
              {o}
            </button>
          ))}
        </div>

        {loading || !d ? (
          <div className="flex items-center justify-center p-12 text-gray-500 font-semibold animate-pulse">
            Connecting to Cluster to Generate Real-Time Board Data...
          </div>
        ) : (
          <>
            <Card className="mb-4 p-5">
              <p className="text-base font-extrabold" style={{ color: T.navy }}>Actual numbers by criteria</p>
              <p className="mb-2 text-xs" style={{ color: T.muted }}>How many employees received each rating, in each criterion — {d.scope}, {d.period}.</p>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `2px solid ${T.navy}` }}>
                    <th className="px-2 py-2 text-left text-xs uppercase tracking-wide" style={{ color: T.muted }}>Criterion</th>
                    {RB.map((b) => (
                      <th key={b.k} className="px-2 py-2 text-center">
                        <div className="text-base font-extrabold" style={{ color: T.navy }}>{rateLbl(b.v)}</div>
                        <div className="text-xs font-extrabold" style={{ color: b.fg }}>{b.k}</div>
                      </th>
                    ))}
                    <th className="px-2 py-2 text-center text-xs uppercase tracking-wide" style={{ color: T.muted }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {d.critRows.map((r) => (
                    <tr key={r.cat.key} className="border-t" style={{ borderColor: "#F0EEE8" }}>
                      <td className="px-2 py-3">
                        <span className="mr-2 inline-block h-2.5 w-2.5 rounded" style={{ background: r.cat.color }} />
                        <b style={{ color: T.navy }}>{r.cat.label}</b>
                      </td>
                      {RB.map((b) => (<td key={b.k} className="px-2 py-3 text-center text-base font-extrabold" style={{ color: T.ink }}>{r.counts[b.k]}</td>))}
                      <td className="px-2 py-3 text-center font-bold" style={{ color: T.muted }}>{r.rated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs" style={{ color: T.muted }}>Every employee is rated on all six criteria, so each row totals {d.N}.</p>
            </Card>

            <Card className="mb-4 p-5">
              <p className="text-base font-extrabold" style={{ color: T.navy }}>The same figures, as a chart</p>
              <p className="mb-3 text-xs" style={{ color: T.muted }}>Employees per rating, grouped by criterion. The ring shows the overall split of all {d.totalRatings} ratings given.</p>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1" style={{ minWidth: 340 }}><BoardBars d={d} /></div>
                <div className="flex items-center gap-3">
                  <BoardDonut d={d} />
                  <div className="text-xs">
                    {RB.map((b) => {
                      const v = d.totals[b.k], pc = d.totalRatings ? (v / d.totalRatings) * 100 : 0;
                      return (
                        <div key={b.k} className="my-1 flex items-center gap-2">
                          <span className="inline-block h-2.5 w-2.5 rounded" style={{ background: b.hex }} />
                          <b style={{ color: T.navy, width: 26 }}>{rateLbl(b.v)}</b>
                          <b>{v}</b><span style={{ color: T.muted }}>{pc.toFixed(1)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          </>
        )}

        <p className="rounded-xl border bg-white px-4 py-3 text-xs" style={{ borderColor: T.border, color: T.muted }}>
          <b style={{ color: T.navy }}>Exports:</b> <b>Excel</b> is the designed workbook — navy title band, band-coloured
          rating headers, and a <b>native Excel chart</b> wired to the sheet's cells, so it redraws if a figure is edited.
          <b> PDF</b> is the A4 board sheet with the same matrix and chart. <b>CSV</b> adds weight, average and CP contribution.
          The three libraries load on first click, so this file still needs no npm packages.
        </p>
      </div>
    </div>
  );
}