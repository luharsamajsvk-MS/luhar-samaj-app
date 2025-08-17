// backend/routes/zoneStickers.js
const express = require('express');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const Member = require('../models/Member'); // adjust path if your model path differs

const router = express.Router();

// convert mm to PDF points (72pt = 1in; 25.4mm = 1in)
const mmToPt = (mm) => (mm / 25.4) * 72;

/**
 * GET /api/zones/:zoneId/stickers
 * Streams a PDF with 12 stickers per A4 page (3 cols × 4 rows).
 */
router.get('/:zoneId/stickers', async (req, res) => {
  try {
    const zoneId = req.params.zoneId;

    // fetch people in zone (adapt query if your member schema stores zone differently)
    const people = await Member.find({ zone: zoneId }).sort({ headName: 1 }).lean();

    // respond with PDF headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=zone-${zoneId}-stickers.pdf`);

    // create PDF document (A4, no margin — we'll manage margins)
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    doc.pipe(res);

    // fonts (adjust exact filenames if different)
    const fontRegPath = path.join(__dirname, '..', 'assets', 'fonts', 'NotoSansGujarati-Regular.ttf');
    const fontBoldPath = path.join(__dirname, '..', 'assets', 'fonts', 'NotoSansGujarati-Bold.ttf');

    const hasRegular = fs.existsSync(fontRegPath);
    const hasBold = fs.existsSync(fontBoldPath);

    if (hasRegular) doc.registerFont('guj-regular', fontRegPath);
    if (hasBold) doc.registerFont('guj-bold', fontBoldPath);

    // Layout settings (adjust margins/gutters for your sticker paper)
    const pageW = doc.page.width;   // points
    const pageH = doc.page.height;  // points
    const margin = mmToPt(8);       // 8 mm outer margin
    const gutterX = mmToPt(5);      // 5 mm between columns
    const gutterY = mmToPt(5);      // 5 mm between rows
    const cols = 3;
    const rows = 6;
    const labelW = (pageW - 2 * margin - (cols - 1) * gutterX) / cols;
    const labelH = (pageH - 2 * margin - (rows - 1) * gutterY) / rows;
    const padding = mmToPt(3);

    // light stroke color for cut lines
    doc.strokeColor('#666').lineWidth(0.35);

    for (let i = 0; i < people.length; i++) {
      const posInPage = i % (cols * rows);
      // start new page when needed
      if (posInPage === 0 && i !== 0) doc.addPage();

      const row = Math.floor(posInPage / cols);
      const col = posInPage % cols;
      const x = margin + col * (labelW + gutterX);
      const y = margin + row * (labelH + gutterY);

      // optional border — helpful for cutting alignment
      doc.rect(x, y, labelW, labelH).stroke();

      const p = people[i];
      // prefer your Gujarati headName field (member.headName)
      const name = (p.headName || `${p.firstName || ''} ${p.lastName || ''}`).trim();
      const address = p.address || [
        p.addressLine1, p.addressLine2, p.city, p.state, p.pincode
      ].filter(Boolean).join(', ');
      const mobile = p.mobile || p.phone || '';

      // --- Render Name ---
      if (hasBold) doc.font('guj-bold');
      else doc.font('Helvetica-Bold');
      doc.fontSize(14);

      // name may wrap — limit width
      doc.fillColor('black').text(name, x + padding, y + padding, {
        width: labelW - 2 * padding,
        align: 'left'
      });

      // --- Render Address (wrap, multiple lines) ---
      const afterNameY = doc.y + mmToPt(1); // slight gap after name
      if (hasRegular) doc.font('guj-regular');
      else doc.font('Helvetica');
      doc.fontSize(9);
      doc.text(address, x + padding, afterNameY, {
        width: labelW - 2 * padding,
        align: 'left',
        lineGap: 1
      });

      // --- Render Mobile at bottom of sticker ---
      // calculate bottom position (mobile sits near bottom padding)
      const mobileY = y + labelH - padding - 10; // 10pt text height approx
      if (hasBold) doc.font('guj-bold');
      else doc.font('Helvetica-Bold');
      doc.fontSize(10);
      // Gujarati label for mobile: "મો. :"
      doc.text(`મો. : ${mobile}`, x + padding, mobileY, {
        width: labelW - 2 * padding,
        align: 'left'
      });
    }

    doc.end();
    // response will be sent as the PDF stream ends
  } catch (error) {
    console.error('Zone stickers PDF error:', error);
    // If headers not sent yet, send a 500
    try {
      res.status(500).send('Failed to generate stickers PDF');
    } catch (e) {
      // response might already be closed — nothing to do
    }
  }
});

module.exports = router;
