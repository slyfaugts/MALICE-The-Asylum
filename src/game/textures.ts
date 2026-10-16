import * as THREE from 'three';

/**
 * Procedural Canvas Texture Generator for Horror Asylum
 * Generates PBR-ready textures with SRGBColorSpace & anisotropy.
 */

export class TextureLibrary {
  private static maxAnisotropy: number = 8;

  public static setMaxAnisotropy(val: number) {
    this.maxAnisotropy = Math.max(1, val);
  }

  /**
   * Hospital dirty cracked ceramic tile floor texture
   */
  public static createFloorTexture(): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base dirty hospital green/gray
    ctx.fillStyle = '#1c2220';
    ctx.fillRect(0, 0, size, size);

    // Tiles grid
    const tileSize = 64;
    for (let x = 0; x < size; x += tileSize) {
      for (let y = 0; y < size; y += tileSize) {
        // Subtle brightness variation between tiles
        const shade = Math.floor(25 + Math.random() * 15);
        ctx.fillStyle = `rgb(${shade}, ${shade + 6}, ${shade + 4})`;
        ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

        // Grout line
        ctx.strokeStyle = '#0a0d0c';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, tileSize, tileSize);

        // Tile scratches & cracks
        if (Math.random() < 0.4) {
          ctx.strokeStyle = '#050706';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 10 + Math.random() * 20, y + 10 + Math.random() * 20);
          ctx.lineTo(x + 30 + Math.random() * 20, y + 30 + Math.random() * 20);
          ctx.stroke();
        }
      }
    }

    // Dirt & grime patches
    for (let i = 0; i < 40; i++) {
      const gx = Math.random() * size;
      const gy = Math.random() * size;
      const radius = 10 + Math.random() * 50;
      const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, radius);
      grad.addColorStop(0, 'rgba(8, 10, 8, 0.4)');
      grad.addColorStop(1, 'rgba(8, 10, 8, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(gx, gy, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Occasional dark dried blood splatter
    for (let i = 0; i < 3; i++) {
      const bx = Math.random() * size;
      const by = Math.random() * size;
      ctx.fillStyle = 'rgba(50, 4, 4, 0.55)';
      ctx.beginPath();
      ctx.arc(bx, by, 8 + Math.random() * 12, 0, Math.PI * 2);
      ctx.fill();
      for (let d = 0; d < 6; d++) {
        ctx.beginPath();
        ctx.arc(bx + (Math.random() - 0.5) * 35, by + (Math.random() - 0.5) * 35, 1 + Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.maxAnisotropy;
    return texture;
  }

  /**
   * Peeling hospital wall plaster texture
   */
  public static createWallTexture(): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Two-tone hospital wall: lower half darker teal/sage, upper half moldy ivory
    ctx.fillStyle = '#222825'; // Upper moldy plaster
    ctx.fillRect(0, 0, size, size);

    // Dado rail line & bottom darker wainscoting
    const midY = size * 0.55;
    ctx.fillStyle = '#141d1a';
    ctx.fillRect(0, midY, size, size - midY);

    // Decorative molding stripe
    ctx.fillStyle = '#0b100e';
    ctx.fillRect(0, midY - 6, size, 12);
    ctx.fillStyle = '#2b3833';
    ctx.fillRect(0, midY - 2, size, 4);

    // Water damage drips running down
    for (let i = 0; i < 16; i++) {
      const x = Math.random() * size;
      const w = 4 + Math.random() * 14;
      const len = 40 + Math.random() * 180;
      const grad = ctx.createLinearGradient(x, 0, x, len);
      grad.addColorStop(0, 'rgba(10, 14, 10, 0.6)');
      grad.addColorStop(1, 'rgba(10, 14, 10, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, w, len);
    }

    // Peeling paint patches
    for (let i = 0; i < 20; i++) {
      const px = Math.random() * size;
      const py = Math.random() * size;
      ctx.fillStyle = 'rgba(10, 12, 10, 0.4)';
      ctx.beginPath();
      ctx.ellipse(px, py, 15 + Math.random() * 25, 8 + Math.random() * 15, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eerie tally marks or claw scratches on some walls
    ctx.strokeStyle = 'rgba(5, 7, 5, 0.7)';
    ctx.lineWidth = 1.5;
    for (let t = 0; t < 4; t++) {
      ctx.beginPath();
      ctx.moveTo(100 + t * 12, 140);
      ctx.lineTo(102 + t * 12, 175);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(90, 158);
    ctx.lineTo(150, 155);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 1);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.maxAnisotropy;
    return texture;
  }

  /**
   * Acoustic drop ceiling tile texture with rusted vents
   */
  public static createCeilingTexture(): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#121514';
    ctx.fillRect(0, 0, size, size);

    // Ceiling grid
    const gridStep = 64;
    ctx.strokeStyle = '#080a09';
    ctx.lineWidth = 3;
    for (let i = 0; i <= size; i += gridStep) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }

    // Porous noise
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 6);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.maxAnisotropy;
    return texture;
  }

  /**
   * Heavy reinforced metal door texture with warning stencils
   */
  public static createDoorTexture(isLocked: boolean = true): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Steel base
    ctx.fillStyle = '#1e2424';
    ctx.fillRect(0, 0, size, size);

    // Border bevel frame
    ctx.strokeStyle = '#101414';
    ctx.lineWidth = 20;
    ctx.strokeRect(10, 10, size - 20, size - 20);

    // Cross brace reinforcement
    ctx.strokeStyle = '#2c3534';
    ctx.lineWidth = 8;
    ctx.strokeRect(40, 40, size - 80, size * 0.4);
    ctx.strokeRect(40, size * 0.52, size - 80, size * 0.4);

    // Reinforced glass observation slot with wire mesh
    ctx.fillStyle = '#060a09';
    ctx.fillRect(size * 0.3, 80, size * 0.4, 100);
    ctx.strokeStyle = '#334440';
    ctx.lineWidth = 2;
    for (let x = size * 0.3; x < size * 0.7; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, 80);
      ctx.lineTo(x + 20, 180);
      ctx.stroke();
    }

    // Heavy locking handle plate
    ctx.fillStyle = '#0a0d0d';
    ctx.fillRect(size * 0.75, size * 0.45, 45, 90);
    ctx.fillStyle = '#7a8c88';
    ctx.fillRect(size * 0.77, size * 0.48, 15, 40);

    // Warning text stencil
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = isLocked ? '#992222' : '#229944';
    ctx.textAlign = 'center';
    ctx.fillText(isLocked ? 'RESTRICTED - WARD B' : 'CLEARANCE GRANTED', size * 0.5, size * 0.45);

    // Hazard stripes at bottom
    for (let x = 30; x < size - 30; x += 30) {
      ctx.fillStyle = '#9e8125';
      ctx.beginPath();
      ctx.moveTo(x, size - 60);
      ctx.lineTo(x + 15, size - 60);
      ctx.lineTo(x - 5, size - 30);
      ctx.lineTo(x - 20, size - 30);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.maxAnisotropy;
    return texture;
  }

  /**
   * Main Exit Security Blast Door Texture (requires all keycards)
   */
  public static createExitBlastDoorTexture(keysCollected: number, totalKeys: number): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Heavy industrial black/yellow hazard door
    ctx.fillStyle = '#141416';
    ctx.fillRect(0, 0, size, size);

    // Hazard border stripes
    const stripeW = 32;
    for (let i = -size; i < size * 2; i += stripeW * 2) {
      ctx.fillStyle = '#d49b13';
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + stripeW, 0);
      ctx.lineTo(i + stripeW + 60, 60);
      ctx.lineTo(i + 60, 60);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(i, size - 60);
      ctx.lineTo(i + stripeW, size - 60);
      ctx.lineTo(i + stripeW + 60, size);
      ctx.lineTo(i + 60, size);
      ctx.fill();
    }

    // Main Exit Header
    ctx.fillStyle = '#e63946';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EMERGENCY EXIT', size * 0.5, 120);

    // Keycard slots panel
    ctx.fillStyle = '#08090a';
    ctx.fillRect(size * 0.2, 160, size * 0.6, 200);
    ctx.strokeStyle = '#2b2e33';
    ctx.lineWidth = 4;
    ctx.strokeRect(size * 0.2, 160, size * 0.6, 200);

    // Status indicator lights
    for (let k = 0; k < totalKeys; k++) {
      const active = k < keysCollected;
      const lx = size * 0.28 + k * (size * 0.44 / (totalKeys - 1 || 1));
      const ly = 220;

      ctx.beginPath();
      ctx.arc(lx, ly, 18, 0, Math.PI * 2);
      ctx.fillStyle = active ? '#38b000' : '#d90429';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = '12px monospace';
      ctx.fillStyle = '#cccccc';
      ctx.fillText(`KEY ${k + 1}`, lx, ly + 36);
    }

    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = keysCollected >= totalKeys ? '#55ff55' : '#ffdd55';
    ctx.fillText(
      keysCollected >= totalKeys ? 'ALL LOCKS DISENGAGED - PRESS [E] TO ESCAPE' : `LOCKED: ${keysCollected}/${totalKeys} KEYS`,
      size * 0.5,
      320
    );

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.maxAnisotropy;
    return texture;
  }

  /**
   * Cryptic blood message decal
   */
  public static createBloodDecal(message: string): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, size, size);

    // Bloody smeared text
    ctx.font = 'bold 32px serif';
    ctx.fillStyle = 'rgba(110, 10, 10, 0.85)';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(size * 0.5, size * 0.5);
    ctx.rotate(-0.06);
    ctx.fillText(message, 0, 0);

    // Drips dripping down from the letters
    for (let d = -160; d < 160; d += 35) {
      ctx.strokeStyle = 'rgba(90, 8, 8, 0.75)';
      ctx.lineWidth = 2 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(d, 5);
      ctx.lineTo(d + (Math.random() - 0.5) * 6, 35 + Math.random() * 50);
      ctx.stroke();
    }
    ctx.restore();

    // Bloody handprint
    const hx = size * 0.75;
    const hy = size * 0.65;
    ctx.fillStyle = 'rgba(100, 10, 10, 0.7)';
    // Palm
    ctx.beginPath();
    ctx.ellipse(hx, hy, 22, 28, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Fingers
    for (let f = 0; f < 5; f++) {
      ctx.beginPath();
      const angle = -0.6 + f * 0.3;
      const fx = hx + Math.sin(angle) * 36;
      const fy = hy - Math.cos(angle) * 36;
      ctx.ellipse(fx, fy, 6, 16, angle, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Battery texture for pickup
   */
  public static createBatteryTexture(): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);

    // Bright yellow/gold battery label
    ctx.fillStyle = '#eab308';
    ctx.fillRect(0, 40, size, size - 80);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 30px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LITHIUM-CELL', size * 0.5, 120);
    ctx.font = 'bold 22px monospace';
    ctx.fillText('9V HIGH POWER', size * 0.5, 160);

    // Lightning bolt icon
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(140, 60);
    ctx.lineTo(110, 100);
    ctx.lineTo(135, 100);
    ctx.lineTo(115, 140);
    ctx.lineTo(150, 95);
    ctx.lineTo(128, 95);
    ctx.closePath();
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Keycard texture
   */
  public static createKeycardTexture(cardIndex: number): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const colors = ['#dc2626', '#2563eb', '#16a34a', '#d97706'];
    const cardColor = colors[cardIndex % colors.length];

    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, size, size);

    // Color band
    ctx.fillStyle = cardColor;
    ctx.fillRect(0, 20, size, 50);

    // Chip
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(30, 90, 45, 38);
    ctx.strokeStyle = '#854d0e';
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 90, 45, 38);

    // Text
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('WARD ACCESS', 25, 160);
    ctx.font = '16px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`CLEARANCE LEVEL 0${cardIndex + 1}`, 25, 190);
    ctx.fillText('FACILITY OMEGA', 25, 215);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
}
