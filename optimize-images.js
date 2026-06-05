import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const ASSETS_DIR = './frontend/src/assets';
const carouselImages = ['carousel 1.jpg', 'carousel 2.jpg', 'carousel 3.jpg', 'carousel 4.jpg'];

(async () => {
  console.log('🖼️  Optimizing carousel images...\n');

  for (const file of carouselImages) {
    const inputPath = path.join(ASSETS_DIR, file);
    const outputPath = path.join(ASSETS_DIR, file);

    try {
      const stats = fs.statSync(inputPath);
      const sizeBeforeMB = (stats.size / 1024 / 1024).toFixed(2);

      // Optimize: resize to max 1920px width, quality 85, progressive JPEG
      await sharp(inputPath)
        .resize(1920, 1440, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85, progressive: true, mozjpeg: true })
        .toFile(outputPath + '.tmp');

      fs.renameSync(outputPath + '.tmp', outputPath);

      const statsAfter = fs.statSync(outputPath);
      const sizeAfterMB = (statsAfter.size / 1024 / 1024).toFixed(2);
      const reduction = (((stats.size - statsAfter.size) / stats.size) * 100).toFixed(1);

      console.log(`✅ ${file}`);
      console.log(`   Before: ${sizeBeforeMB} MB`);
      console.log(`   After:  ${sizeAfterMB} MB`);
      console.log(`   Reduced by: ${reduction}%\n`);
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }

  console.log('✨ Image optimization complete!');
})();
