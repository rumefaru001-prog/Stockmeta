import piexif from "piexifjs";
import { buildApp13, insertApp13 } from "./iptc";
import { writePNGMetadata } from "./png";
import { buildXMPString, insertXMPIntoJPEG } from "./xmp";

function toUTF16LE(str: string) {
    const arr = [];
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        arr.push(code & 0xFF);
        arr.push((code >> 8) & 0xFF);
    }
    arr.push(0);
    arr.push(0);
    return arr;
}

export async function embedMetadata(file: File, title: string, description: string, keywords: string, rating?: number): Promise<Blob> {
    if (file.type === "image/png") {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const arrayBuffer = e.target?.result as ArrayBuffer;
                    const pngData = new Uint8Array(arrayBuffer);
                    const newPngData = writePNGMetadata(pngData, title, description, keywords);
                    resolve(new Blob([newPngData], { type: "image/png" }));
                } catch (err) {
                    console.error("Error embedding metadata in PNG:", err);
                    resolve(file);
                }
            };
            reader.onerror = () => resolve(file);
            reader.readAsArrayBuffer(file);
        });
    }

    if (file.type !== "image/jpeg" && file.type !== "image/jpg") {
        // Return original if not supported
        return file;
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jpegData = e.target?.result as string;
                
                // Create fresh EXIF object to completely overwrite any existing metadata
                const exifObj: any = {"0th": {}, "Exif": {}, "GPS": {}, "Interop": {}, "1st": {}, "thumbnail": null};
                
                // standard EXIF
                if (description) {
                    exifObj["0th"][piexif.ImageIFD.ImageDescription] = description;
                }
                
                // Set Windows XP tags (UTF-16LE encoded)
                if (title) {
                    exifObj["0th"][piexif.ImageIFD.XPTitle] = toUTF16LE(title);
                }
                if (description) {
                    exifObj["0th"][piexif.ImageIFD.XPComment] = toUTF16LE(description);
                    exifObj["0th"][piexif.ImageIFD.XPSubject] = toUTF16LE(description);
                }
                if (keywords) {
                    exifObj["0th"][piexif.ImageIFD.XPKeywords] = toUTF16LE(keywords.replace(/,/g, ';'));
                }
                
                // Set 5-star rating (5 stars = 5, 4 stars = 4, etc.)
                // If rating is not provided, default to 5 stars as per user request
                const finalRating = rating !== undefined ? rating : 5;
                exifObj["0th"][piexif.ImageIFD.Rating] = finalRating;
                
                // Windows specific RatingPercent values
                const ratingPercentMap: Record<number, number> = {
                    1: 1,
                    2: 25,
                    3: 50,
                    4: 75,
                    5: 99
                };
                exifObj["0th"][piexif.ImageIFD.RatingPercent] = ratingPercentMap[finalRating] || 99;

                const exifBytes = piexif.dump(exifObj);
                const newJpegData = piexif.insert(exifBytes, jpegData);
                
                // Convert base64 back to binary array
                const byteString = atob(newJpegData.split(',')[1]);
                const ab = new Uint8Array(byteString.length);
                for (let i = 0; i < byteString.length; i++) {
                    ab[i] = byteString.charCodeAt(i);
                }
                
                // Embed IPTC natively using our new module
                const app13Data = buildApp13(title, description, keywords);
                let finalBinary = insertApp13(ab, app13Data);
                
                // Embed XMP
                const xmpStr = buildXMPString(title, description, keywords);
                finalBinary = insertXMPIntoJPEG(finalBinary, xmpStr);
                
                resolve(new Blob([finalBinary], { type: "image/jpeg" }));
            } catch (err) {
                console.error("Error embedding metadata:", err);
                resolve(file); // Return original if fails
            }
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
}
