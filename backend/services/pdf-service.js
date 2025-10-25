// backend/services/pdf-service.js
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const Member = require('../models/Member');
const QRCode = require('qrcode');

/**
 * Detect if text contains Gujarati characters
 */
function isGujarati(text = '') {
  return /[\u0A80-\u0AFF]/.test(text);
}

/**
 * Fit text in a given rectangle by shrinking font size if needed
 */
function fitText(doc, text, font, color, initialSize, x1, y1, x2, y2, align = 'left') {
  if (!text) return;

  const boxWidth = x2 - x1;
  const boxHeight = y2 - y1;
  let fontSize = initialSize;

  try {
    doc.font(font);
  } catch (e) {
    doc.font('Helvetica');
  }
  doc.fillColor(color).fontSize(fontSize);

  while (doc.widthOfString(text) > boxWidth && fontSize > 6) {
    fontSize -= 1;
    doc.fontSize(fontSize);
  }

  const textWidth = doc.widthOfString(text);
  const textHeight = fontSize;
  const textY = y1 + (boxHeight - textHeight) / 2;
  let textX = x1;
  if (align === 'center') {
    textX = x1 + (boxWidth - textWidth) / 2;
  } else if (align === 'right') {
    textX = x2 - textWidth;
  }

  doc.text(text, textX, textY, {
    width: boxWidth,
    height: boxHeight,
    align: align
  });
}

async function generateCard(memberId) {
  try {
    const member = await Member.findById(memberId).populate('zone');
    if (!member) throw new Error('Member not found');

    const templatePath = path.join(__dirname, '../assets/templates/card_template.png');
    const stampPath = path.join(__dirname, '../assets/stamps/org_stamp.png');
    const fontRegular = path.join(__dirname, '../assets/fonts/NotoSansGujarati-Regular.ttf');
    const fontBold = path.join(__dirname, '../assets/fonts/NotoSansGujarati-Bold.ttf');

    if (!fs.existsSync(fontRegular) || !fs.existsSync(fontBold)) {
      throw new Error("Gujarati fonts not found in assets/fonts/ — add NotoSansGujarati-Regular.ttf & Bold.ttf");
    }

    const doc = new PDFDocument({ size: [900, 1200], margin: 0 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));

    doc.registerFont('regular', fontRegular);
    doc.registerFont('bold', fontBold);
    doc.image(templatePath, 0, 0, { width: 900, height: 1200 });
    doc.opacity(0.2).image(stampPath, 310, 250, { width: 270, height: 270 }).opacity(1);
    doc.opacity(0.2).image(stampPath, 310, 750, { width: 270, height: 270 }).opacity(1);

    const baseUrl = process.env.BASE_URL || "http://localhost:5000";
    const qrData = `${baseUrl}/api/members/verify/${member.cardId || member._id}`;
    const qrImageBuffer = await QRCode.toBuffer(qrData, { width: 165, margin: 1 });
    doc.image(qrImageBuffer, 710, 250, { width: 165, height: 165 });

    const registrationYear = member.createdAt ? new Date(member.createdAt).getFullYear() : '';
    doc.font('bold').fontSize(35).fillColor('white').text(registrationYear, 780, 25);

    const zoneText = `${member.zone?.number || ''} / ${member.uniqueNumber || member.cardId || '---'}`;
    fitText(doc, zoneText, 'bold', 'blue', 36, 590, 491, 885, 535, 'center');

    let headFontSize = 55;
    if (!isGujarati(member.head?.name)) headFontSize -= 10;
    fitText(doc, member.head?.name || '', 'bold', 'red', headFontSize, 38, 250, 738, 320);

    let addressFontSize = 30;
    if (!isGujarati(member.address)) addressFontSize -= 6;
    doc.font('regular').fontSize(addressFontSize).fillColor('blue').text(member.address || '', 38, 335, { width: 700, height: 120, ellipsis: true, align: 'left' });

  const city = member.city || '';
    const pincode = member.pincode || '';
    const cityPincode = [city, pincode].filter(Boolean).join(' - '); // Joins with ' - ' only if both exist

    doc.font('regular').fontSize(30).fillColor('blue').text(cityPincode, 38, 455, { width: 700 });

    doc.font('bold').fontSize(40).fillColor('red').text(`મો. : ${member.mobile || ''}`, 38, 491, { width: 800 });

    const family = member.familyMembers || [];
    for (let i = 0; i < Math.min(family.length, 8); i++) {
      const yPos = 685 + (i * 50);
      const famMember = family[i];
      if (!famMember) continue;

      let famFontSize = 35;
      if (!isGujarati(famMember.name) || !isGujarati(famMember.relation)) famFontSize -= 6;
      
      doc.font('regular').fontSize(famFontSize).fillColor('purple').text(`${i + 1}) ${famMember.name}`, 38, yPos, { width: 600, ellipsis: true });
      const relationText = famMember.relation ? `(${famMember.relation}${famMember.age ? `, ${famMember.age}` : ''})` : famMember.age ? `(Age: ${famMember.age})` : '';
      doc.font('regular').fontSize(famFontSize).fillColor('purple').text(relationText, 658, yPos, { width: 200, ellipsis: true });
    }

    const issueDateFormatted = new Date(member.createdAt).toLocaleDateString('en-GB');
    doc.font('bold').fontSize(25).fillColor('blue').text(`Date of Issue: ${issueDateFormatted}`, 305, 1120);

    doc.end();
    return new Promise((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
}

/**
 * NEW FUNCTION: Creates a printable sheet of address stickers for a zone.
 */
async function generateZoneStickers(members) {
  try {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));

    const fontRegular = path.join(__dirname, '../assets/fonts/NotoSansGujarati-Regular.ttf');
    const fontBold = path.join(__dirname, '../assets/fonts/NotoSansGujarati-Bold.ttf');
    if (!fs.existsSync(fontRegular) || !fs.existsSync(fontBold)) {
      throw new Error("Gujarati fonts not found in assets/fonts/");
    }
    doc.registerFont('regular', fontRegular);
    doc.registerFont('bold', fontBold);

    const pageMargin = 40;
    const stickerWidth = 170;
    const stickerHeight = 80;
    const gapX = 20;
    const gapY = 20;
    let currentX = pageMargin;
    let currentY = pageMargin;

    for (const member of members) {
      if (currentX + stickerWidth > doc.page.width - pageMargin) {
        currentX = pageMargin;
        currentY += stickerHeight + gapY;
      }
      if (currentY + stickerHeight > doc.page.height - pageMargin) {
        doc.addPage();
        currentX = pageMargin;
        currentY = pageMargin;
      }

      const textPadding = 5;
      const textWidth = stickerWidth - (textPadding * 2);
      doc.rect(currentX, currentY, stickerWidth, stickerHeight).stroke();
      doc.font('bold').fontSize(12).text(member.head.name, currentX + textPadding, currentY + textPadding, { width: textWidth });
      doc.font('regular').fontSize(9).text(member.address, { width: textWidth, ellipsis: true });
      const zoneText = `Zone: ${member.zone.number} - ${member.zone.name}`;
      doc.font('regular').fontSize(8).text(zoneText, currentX + textPadding, currentY + stickerHeight - 15, { width: textWidth });

      currentX += stickerWidth + gapX;
    }

    doc.end();
    return new Promise((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);
    });
  } catch (error) {
    console.error('Sticker sheet generation error:', error);
    throw error;
  }
}

// Export both functions so the app can use them.
module.exports = { generateCard, generateZoneStickers };