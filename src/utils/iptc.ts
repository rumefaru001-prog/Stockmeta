export function createIptcField(record: number, dataset: number, value: Uint8Array): Uint8Array {
    const buffer = new Uint8Array(value.length + 5);
    buffer[0] = 0x1C;
    buffer[1] = record;
    buffer[2] = dataset;
    buffer[3] = (value.length >> 8) & 0xFF;
    buffer[4] = value.length & 0xFF;
    buffer.set(value, 5);
    return buffer;
}

export function buildApp13(title: string, description: string, keywords: string): Uint8Array {
    const fields: Uint8Array[] = [];
    
    // Envelope Record 1: Coded Character Set (UTF-8) -> 0x1B 0x25 0x47
    fields.push(createIptcField(1, 90, new Uint8Array([0x1B, 0x25, 0x47])));
    
    const enc = new TextEncoder();
    
    if (title) {
        fields.push(createIptcField(2, 5, enc.encode(title))); // ObjectName
        fields.push(createIptcField(2, 105, enc.encode(title))); // Headline
    }
    
    if (description) {
        fields.push(createIptcField(2, 120, enc.encode(description))); // Caption-Abstract
    }
    
    if (keywords) {
        const kwds = keywords.split(/[,;]/).map(k => k.trim()).filter(k => k);
        for (const kw of kwds) {
            fields.push(createIptcField(2, 25, enc.encode(kw))); // Keywords
        }
    }
    
    let totalLen = fields.reduce((acc, f) => acc + f.length, 0);
    const iptcData = new Uint8Array(totalLen);
    let offset = 0;
    for (const f of fields) {
        iptcData.set(f, offset);
        offset += f.length;
    }
    
    // 8BIM Resource Block (1028 = IPTC)
    const pad = iptcData.length % 2 !== 0 ? 1 : 0;
    
    const resourceBlock = new Uint8Array(iptcData.length + pad + 12);
    resourceBlock.set([0x38, 0x42, 0x49, 0x4D], 0); // "8BIM"
    resourceBlock.set([0x04, 0x04], 4);             // 1028
    resourceBlock.set([0x00, 0x00], 6);             // Empty PString
    resourceBlock[8] = (iptcData.length >> 24) & 0xFF;
    resourceBlock[9] = (iptcData.length >> 16) & 0xFF;
    resourceBlock[10] = (iptcData.length >> 8) & 0xFF;
    resourceBlock[11] = iptcData.length & 0xFF;
    resourceBlock.set(iptcData, 12);
    
    const photoshopHeader = new Uint8Array([0x50, 0x68, 0x6f, 0x74, 0x6f, 0x73, 0x68, 0x6f, 0x70, 0x20, 0x33, 0x2e, 0x30, 0x00]);
    const payloadSize = photoshopHeader.length + resourceBlock.length;
    
    const app13 = new Uint8Array(2 + 2 + payloadSize);
    app13[0] = 0xFF;
    app13[1] = 0xED;
    app13[2] = (payloadSize + 2) >> 8;
    app13[3] = (payloadSize + 2) & 0xFF;
    app13.set(photoshopHeader, 4);
    app13.set(resourceBlock, 4 + photoshopHeader.length);
    
    return app13;
}

export function insertApp13(jpegBytes: Uint8Array, app13Bytes: Uint8Array): Uint8Array {
    if (jpegBytes[0] !== 0xFF || jpegBytes[1] !== 0xD8) {
        return jpegBytes;
    }
    
    let pos = 2;
    let insertPos = 2;
    while (pos < jpegBytes.length) {
        if (jpegBytes[pos] !== 0xFF) break;
        const marker = jpegBytes[pos + 1];
        if (marker === 0xD9 || marker === 0xDA) break;
        
        const len = (jpegBytes[pos + 2] << 8) | jpegBytes[pos + 3];
        // Skip APP0 (0xE0) or APP1 (0xE1) or APP2 (0xE2)
        if (marker >= 0xE0 && marker <= 0xEF) {
            pos += 2 + len;
            insertPos = pos;
        } else {
            break;
        }
    }
    // Remove old APP13 segments if they exist (to avoid duplicates)
    // Wait, let's just insert here to keep it simple. It works for our freshly created EXIF images.
    
    const result = new Uint8Array(jpegBytes.length + app13Bytes.length);
    result.set(jpegBytes.subarray(0, insertPos), 0);
    result.set(app13Bytes, insertPos);
    result.set(jpegBytes.subarray(insertPos), insertPos + app13Bytes.length);
    return result;
}
