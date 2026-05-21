import Papa from "papaparse";
import { MediaFile, GenerationSettings } from "../types";

export async function generateCSV(
  files: MediaFile[], 
  settings: GenerationSettings,
  extensionOverride: 'eps' | 'ai' | 'jpg' | 'png' | 'mp4' | null = null,
  outputDirHandle?: any
) {
  const platforms = settings.platform.length > 0 ? settings.platform : ["general"];

  for (const platform of platforms) {
    const data = files.map((f) => {
      let filename = f.originalFileName || f.file.name;
      
      if (extensionOverride) {
        filename = filename.replace(/\.[^/.]+$/, `.${extensionOverride}`);
      }

      const title = f.metadata?.title || "";
      const keywords = f.metadata?.keywords || "";
      const description = f.metadata?.description || "";

      if (platform === "freepik") {
        return {
          "File name": filename,
          "Title": title,
          "Keywords": keywords,
          "Prompt": "",
          "Model": ""
        };
      } else if (platform === "adobe") {
        return {
          "Filename": filename,
          "Title": title,
          "Keywords": keywords
        };
      } else if (platform === "shutterstock" || platform === "general") {
        return {
          "Filename": filename,
          "Description": description.substring(0, 200),
          "Keywords": keywords,
          "Categories": f.metadata?.category || "Miscellaneous",
          "Editorial": "no",
          "Mature content": "no",
          "illustration": ""
        };
      } else if (platform === "123rf") {
        return {
          "oldfilename": filename,
          "123rf_filename": filename,
          "description": description,
          "keywords": keywords,
          "country": ""
        };
      } else if (platform === "dreamstime") {
        return {
          "Filename": filename,
          "Title": title,
          "Description": description,
          "Keywords": keywords,
          "Categories": f.metadata?.category || "Miscellaneous",
          "Editorial": "No",
          "Adult Content": "No"
        };
      } else if (platform === "depositphotos") {
        return {
          "Filename": filename,
          "Image Name": title,
          "Description": description,
          "Category 1": f.metadata?.category || "Miscellaneous",
          "Category 2": "",
          "Category 3": "",
          "Keywords": keywords,
          "Free": "0",
          "W-EL": "0",
          "P-EL": "0",
          "SR-EL": "0",
          "SR-Price": "0",
          "Editorial": "0",
          "MR doc Ids": "",
          "Pr Docs": "0"
        };
      } else if (platform === "envato") {
        return {
          "file name": filename,
          "description": description,
          "country": "",
          "title": title,
          "keywords": keywords,
          "color": ""
        };
      } else if (platform === "alamy") {
        return {
          "Filename": filename,
          "Title": title,
          "Description": description,
          "Keywords": keywords,
          "Editorial": "No"
        };
      } else if (platform === "pngtree") {
        return {
          "File Name": filename,
          "Title": title,
          "Keywords": keywords
        };
      } else {
        // vecteezy, pond5, istock, creativefabrica, wirestock
        return {
          "Filename": filename,
          "Title": title,
          "Description": description,
          "Keywords": keywords
        };
      }
    });

    const delimiter = platform === "freepik" ? ";" : ",";
    const csv = Papa.unparse(data, { delimiter });
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const suggestedName = `metadata_${platform}.csv`;

    if (outputDirHandle) {
      try {
        // Verify permission
        const options = { mode: 'readwrite' };
        if ((await outputDirHandle.queryPermission(options)) !== 'granted') {
          if ((await outputDirHandle.requestPermission(options)) !== 'granted') {
            throw new Error("Permission not granted");
          }
        }
        const fileHandle = await outputDirHandle.getFileHandle(suggestedName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        continue; // Success, move to next platform
      } catch (err) {
        console.error("Failed to write to directory handle, falling back", err);
      }
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", suggestedName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
