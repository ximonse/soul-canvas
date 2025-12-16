// src/utils/imageProcessor.ts

/**
 * Tar en bildfil, förminskar den så att längsta sidan är maxDimension (t.ex. 900px),
 * och returnerar den som en Base64-sträng (JPEG, 80% kvalitet).
 */
export const processImageFile = (file: File, maxDimension = 900): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 1. Kontrollera att det är en bild
    if (!file.type.startsWith('image/')) {
      reject(new Error('Filen är inte en bild.'));
      return;
    }

    // 2. Läs in filen till minnet
    const reader = new FileReader();
    
    reader.onload = (readerEvent) => {
      // 3. Skapa en "osynlig" bild i webbläsarens minne för att mäta den
      const img = new Image();
      
      img.onload = () => {
        // 4. Räkna ut nya dimensioner (behåll proportioner)
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height *= maxDimension / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width *= maxDimension / height;
            height = maxDimension;
          }
        }

        // 5. Rita den nya, mindre bilden på en canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Kunde inte skapa canvas-kontext'));
          return;
        }
        
        // Rita bilden (detta utför själva förminskningen)
        ctx.drawImage(img, 0, 0, width, height);

        // 6. Exportera resultatet som en JPEG-sträng (0.8 = 80% kvalitet, bra balans)
        // Detta sparar mycket plats jämfört med PNG för foton.
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      };

      img.onerror = (err) => reject(err);
      // Sätt källan till den inlästa datan
      img.src = readerEvent.target?.result as string;
    };

    reader.onerror = (err) => reject(err);
    // Starta inläsningen
    reader.readAsDataURL(file);
  });
};