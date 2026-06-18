import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { BackupData, crearBackup } from "./storage";

export async function exportarArchivoBackup(): Promise<void> {
  const data = await crearBackup();
  const json = JSON.stringify(data, null, 2);
  const fecha = new Date().toISOString().split("T")[0];
  const nombre = `inventario_backup_${fecha}.json`;

  if (Platform.OS === "web") {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } else {
    const path = ((FileSystem as unknown as Record<string, string>)["cacheDirectory"] ?? "") + nombre;
    await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
    const disponible = await Sharing.isAvailableAsync();
    if (disponible) {
      await Sharing.shareAsync(path, { mimeType: "application/json", dialogTitle: "Guardar backup" });
    }
  }
}

export async function seleccionarArchivoBackup(): Promise<BackupData | null> {
  if (Platform.OS === "web") {
    return new Promise<BackupData | null>((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      let resuelto = false;

      input.onchange = (e) => {
        resuelto = true;
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) { resolve(null); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            resolve(JSON.parse(ev.target?.result as string) as BackupData);
          } catch {
            resolve(null);
          }
        };
        reader.onerror = () => resolve(null);
        reader.readAsText(file);
      };

      window.addEventListener("focus", function handler() {
        window.removeEventListener("focus", handler);
        setTimeout(() => { if (!resuelto) resolve(null); }, 500);
      });

      input.click();
    });
  } else {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/json", "text/plain", "*/*"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return null;
    try {
      const content = await FileSystem.readAsStringAsync(result.assets[0].uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      return JSON.parse(content) as BackupData;
    } catch {
      return null;
    }
  }
}
