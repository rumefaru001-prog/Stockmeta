export function buildXMPString(title: string, description: string, keywords: string): string {
    const kwTags = keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k)
        .map(k => `<rdf:li>${k.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</rdf:li>`)
        .join('\n     ');

    const desc = (description || title).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const t = title.replace(/&/g, '&amp;').replace(/</g, '&lt;');

    return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.6-c140 79.160451, 2017/05/06-01:08:21        ">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/">
   <dc:title>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">${t}</rdf:li>
    </rdf:Alt>
   </dc:title>
   <dc:description>
    <rdf:Alt>
     <rdf:li xml:lang="x-default">${desc}</rdf:li>
    </rdf:Alt>
   </dc:description>
   <dc:subject>
    <rdf:Bag>
     ${kwTags}
    </rdf:Bag>
   </dc:subject>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

export function insertXMPIntoJPEG(jpegBytes: Uint8Array, xmpStr: string): Uint8Array {
    if (jpegBytes[0] !== 0xFF || jpegBytes[1] !== 0xD8) {
        return jpegBytes;
    }
    
    // XMP Header "http://ns.adobe.com/xap/1.0/\0"
    const headerStr = "http://ns.adobe.com/xap/1.0/\0";
    const encoder = new TextEncoder();
    const headerBytes = encoder.encode(headerStr);
    const xmpBytes = encoder.encode(xmpStr);
    
    const payloadSize = headerBytes.length + xmpBytes.length;
    // APP1 Segment size doesn't include the APP1 marker (0xFFE1) but includes the 2 bytes of size
    if (payloadSize + 2 > 65535) {
        console.warn("XMP data too large for a single JPEG APP1 segment!");
        // Simplified skip for too large
        return jpegBytes;
    }
    
    const app1 = new Uint8Array(2 + 2 + payloadSize);
    app1[0] = 0xFF;
    app1[1] = 0xE1;
    app1[2] = (payloadSize + 2) >> 8;
    app1[3] = (payloadSize + 2) & 0xFF;
    app1.set(headerBytes, 4);
    app1.set(xmpBytes, 4 + headerBytes.length);
    
    // Find where to insert (after EXIF / APP0 but before image data)
    let pos = 2;
    let insertPos = 2;
    while (pos < jpegBytes.length) {
        if (jpegBytes[pos] !== 0xFF) break;
        const marker = jpegBytes[pos + 1];
        if (marker === 0xD9 || marker === 0xDA) break;
        
        const len = (jpegBytes[pos + 2] << 8) | jpegBytes[pos + 3];
        // Insert after APP0 (0xE0) but not after APP1 (since EXIF is APP1, we can have multiple APP1s, usually XMP comes after EXIF)
        if (marker === 0xE0) { // APP0
            pos += 2 + len;
            insertPos = pos;
        } else if (marker === 0xE1) { // APP1 EXIF
            // Check if it's EXIF
            const isExif = jpegBytes[pos+4] === 0x45 && jpegBytes[pos+5] === 0x78 && jpegBytes[pos+6] === 0x69 && jpegBytes[pos+7] === 0x66;
            if (isExif) {
                pos += 2 + len;
                insertPos = pos;
            } else {
                break;
            }
        } else {
            break;
        }
    }
    
    const result = new Uint8Array(jpegBytes.length + app1.length);
    result.set(jpegBytes.subarray(0, insertPos), 0);
    result.set(app1, insertPos);
    result.set(jpegBytes.subarray(insertPos), insertPos + app1.length);
    return result;
}
