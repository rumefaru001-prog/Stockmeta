import { buildXMPString } from "./xmp";

export function crc32(buffer: Uint8Array): number {
    let table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            if (c & 1) c = 0xedb88320 ^ (c >>> 1);
            else c = c >>> 1;
        }
        table[i] = c;
    }
    let crc = 0 ^ (-1);
    for (let i = 0; i < buffer.length; i++) {
        crc = (crc >>> 8) ^ table[(crc ^ buffer[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
}

function stringToBytes(str: string): Uint8Array {
    return new TextEncoder().encode(str);
}

export function writePNGMetadata(pngData: Uint8Array, title: string, description: string, keywords: string): Uint8Array {
    // Check PNG signature
    if (pngData[0] !== 0x89 || pngData[1] !== 0x50 || pngData[2] !== 0x4E || pngData[3] !== 0x47 || 
        pngData[4] !== 0x0D || pngData[5] !== 0x0A || pngData[6] !== 0x1A || pngData[7] !== 0x0A) {
        throw new Error("Not a valid PNG file");
    }

    const xmpStr = buildXMPString(title, description, keywords);
    const xmpBytes = stringToBytes(xmpStr);

    const keyword = stringToBytes("XML:com.adobe.xmp");
    
    // iTXt payload:
    // Keyword (null terminated) (18 bytes)
    // Compression flag (1 byte) - 0
    // Compression method (1 byte) - 0
    // Language tag (null terminated) (1 byte) - 0
    // Translated keyword (null terminated) (1 byte) - 0
    // Text (xmpBytes)
    
    const payloadLen = keyword.length + 1 + 1 + 1 + 1 + 1 + xmpBytes.length;
    const payload = new Uint8Array(payloadLen);
    
    payload.set(keyword, 0);
    let offset = keyword.length;
    payload[offset++] = 0; // null separator
    payload[offset++] = 0; // compression flag: uncompressed
    payload[offset++] = 0; // compression method
    payload[offset++] = 0; // language tag null
    payload[offset++] = 0; // translated keyword null
    payload.set(xmpBytes, offset);
    
    const typeStr = "iTXt";
    const typeBytes = stringToBytes(typeStr);
    
    const chunkData = new Uint8Array(4 + typeBytes.length + payload.length);
    // Write length
    chunkData[0] = (payload.length >> 24) & 0xFF;
    chunkData[1] = (payload.length >> 16) & 0xFF;
    chunkData[2] = (payload.length >> 8) & 0xFF;
    chunkData[3] = payload.length & 0xFF;
    
    // Write type
    chunkData.set(typeBytes, 4);
    
    // Write payload
    chunkData.set(payload, 8);
    
    // Compute CRC on Type + Payload
    const crc = crc32(chunkData.subarray(4));
    
    const crcBytes = new Uint8Array([
        (crc >> 24) & 0xFF,
        (crc >> 16) & 0xFF,
        (crc >> 8) & 0xFF,
        crc & 0xFF
    ]);
    
    const finalChunk = new Uint8Array(chunkData.length + 4);
    finalChunk.set(chunkData, 0);
    finalChunk.set(crcBytes, chunkData.length);
    
    // Now inject it into the PNG file just before IDAT or after IHDR
    // We will insert right after IHDR (which is the first chunk at offset 8)
    
    // Find IHDR end
    let pos = 8;
    const ihdrLen = (pngData[pos] << 24) | (pngData[pos+1] << 16) | (pngData[pos+2] << 8) | pngData[pos+3];
    // IHDR chunk total size: 4 (length) + 4 (type) + ihdrLen + 4 (CRC) = 12 + ihdrLen
    const ihdrTotal = 12 + ihdrLen;
    const insertPos = pos + ihdrTotal;
    
    const newPng = new Uint8Array(pngData.length + finalChunk.length);
    newPng.set(pngData.subarray(0, insertPos), 0);
    newPng.set(finalChunk, insertPos);
    newPng.set(pngData.subarray(insertPos), insertPos + finalChunk.length);
    
    return newPng;
}
