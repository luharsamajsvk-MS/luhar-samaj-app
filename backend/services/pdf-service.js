  const PDFDocument = require('pdfkit');
  const path = require('path');
  const fs = require('fs');
  const Member = require('../models/Member');
  const QRCode = require('qrcode'); // QR code generator

  /**
   * Fit text in a given rectangle by shrinking font size if needed
   */
  function fitText(doc, text, font, color, initialSize, x1, y1, x2, y2) {
    const boxWidth = x2 - x1;
    const boxHeight = y2 - y1;
    let fontSize = initialSize;

    doc.font(font).fillColor(color);

    while (
      (doc.widthOfString(text, { fontSize }) > boxWidth || fontSize > boxHeight) &&
      fontSize > 6
    ) {
      fontSize -= 1;
    }

    const textY = y1 + (boxHeight - fontSize) / 2;
    doc.fontSize(fontSize).text(text, x1, textY, {
      width: boxWidth,
      align: 'left'
    });
  }

  async function generateCard(memberId) {
    try {
      const member = await Member.findById(memberId).populate('zone');
      if (!member) throw new Error('Member not found');

      let totalPeople = 0;
      if (member.zone?._id) {
        totalPeople = await Member.countDocuments({ zone: member.zone._id });
      }

      const templatePath = path.join(__dirname, '../assets/templates/card_template.png');
      const stampPath = path.join(__dirname, '../assets/stamps/org_stamp.png');

      // === Fonts (Gujarati-safe) ===
      const fontRegular = path.join(__dirname, '../assets/fonts/NotoSansGujarati-Regular.ttf');
      const fontBold = path.join(__dirname, '../assets/fonts/NotoSansGujarati-Bold.ttf');

      if (!fs.existsSync(fontRegular) || !fs.existsSync(fontBold)) {
        throw new Error("Gujarati fonts not found in assets/fonts/ — please add NotoSansGujarati-Regular.ttf & Bold.ttf");
      }

      const doc = new PDFDocument({
        size: [900, 1200],
        margin: 0
      });

      const registrationYear = member.createdAt
        ? new Date(member.createdAt).getFullYear()
        : '';

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));

      // === Background template ===
      doc.image(templatePath, 0, 0, { width: 900, height: 1200 });

      // === Register Fonts ===
      doc.registerFont('regular', fontRegular);
      doc.registerFont('bold', fontBold);

      // === Watermark ===
      doc.opacity(0.2).image(stampPath, 310, 250, { width: 270, height: 270 }).opacity(1);
      doc.opacity(0.2).image(stampPath, 310, 750, { width: 270, height: 270 }).opacity(1);

      // === QR CODE ===
      const baseUrl = process.env.BASE_URL || "http://localhost:5000"; 
      const qrData = `${baseUrl}/api/members/verify/${member.cardId || member._id}`;
      const qrImageBuffer = await QRCode.toBuffer(qrData, { width: 165, margin: 1 });
      doc.image(qrImageBuffer, 710, 250, { width: 165, height: 165 });

      // Registration year
      doc.font('bold')
        .fontSize(35)
        .fillColor('white')
        .text(registrationYear, 780, 25);

      // Zone info auto-fit
      fitText(
        doc,
        `${member.zone?.number || ''} / ${member.zone?.name || ''}`,
        'bold',
        'blue',
        36,
        550, 491,
        885, 535
      );

      // Head name
      doc.font('bold')
        .fontSize(65)
        .fillColor('red')
        .text(member.headName, 38, 250, {
          width: 700,
          ellipsis: true
        });

      // Address
      const lineHeight = 40;
      const maxLines = 3;
      doc.font('regular')
        .fontSize(30)
        .fillColor('blue')
        .text(member.address || '', 38, 335, {
          width: 700,
          height: lineHeight * maxLines,
          ellipsis: true,
          lineGap: 0,
          align: 'left'
        });

      // Mobile
      doc.font('bold')
        .fontSize(40)
        .fillColor('red')
        .text(`મો. : ${member.mobile || ''}`, 38, 491, {
          width: 800
        });

      // === Family members ===
      const family = member.familyMembers || [];
      const maxRows = 8;
      const rowHeight = 50;
      const startY = 685;
      const nameColumnWidth = 600;
      const relationColumnWidth = 200;

      for (let i = 0; i < Math.min(family.length, maxRows); i++) {
        const yPos = startY + (i * rowHeight);
        const famMember = family[i];
        if (!famMember) continue;

        // Name
        doc.font('regular')
          .fontSize(35)
          .fillColor('purple')
          .text(`${i + 1}) ${famMember.name}`, 38, yPos, {
            width: nameColumnWidth,
            ellipsis: true
          });

        // Relation + Age
        const relationText = famMember.relation
          ? `(${famMember.relation}${famMember.age ? `, ${famMember.age}` : ''})`
          : famMember.age
            ? `(Age: ${famMember.age})`
            : '';

        doc.font('regular')
          .fontSize(35)
          .fillColor('purple')
          .text(relationText, 38 + nameColumnWidth + 20, yPos, {
            width: relationColumnWidth,
            ellipsis: true
          });
      }

      // Issue date
      const issueDateFormatted = new Date(member.createdAt).toLocaleDateString('en-GB');
      doc.font('bold')
        .fontSize(25)
        .fillColor('blue')
        .text(`Date of Issue: ${issueDateFormatted}`, 305, 1120);

      doc.end();
      return new Promise((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(buffers)));
      });

    } catch (error) {
      console.error('PDF generation error:', error);
      throw error;
    }
  }

  module.exports = { generateCard };
