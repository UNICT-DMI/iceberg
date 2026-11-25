import * as THREE from 'three';

type ImageLabel = { item: { image?: string }; position: THREE.Vector3; height: number };

/** Height of a square item image, in CSS pixels. */
export const itemImageSize = 192;
/** Wide images (wordmarks) may grow up to this many times the height. */
const maxAspect = 2.6;
/** Gap between the bottom of an image and the top of its name, in CSS pixels. */
const imageGap = 2;

export function imageDisplaySize(width: number, height: number) {
  // Fit by height so wordmarks stay legible, but cap very wide images.
  const aspect = width / Math.max(height, 1);
  const displayWidth = Math.min(itemImageSize * aspect, itemImageSize * maxAspect);
  return { width: Math.round(displayWidth), height: Math.round(displayWidth / aspect) };
}

/**
 * Screen-sized billboards drawn above item names. Like the names, they are
 * depth tested against the ice, so the iceberg occludes them per pixel.
 */
export function createItemImages(scene: THREE.Scene) {
  const viewport = new THREE.Vector2(1, 1);
  const geometry = new THREE.PlaneGeometry(1, 1);
  const textures = new Map<string, Promise<THREE.Texture>>();
  const loader = new THREE.TextureLoader();
  let meshes: THREE.Mesh[] = [];
  let generation = 0;

  function load(url: string) {
    let texture = textures.get(url);
    if (!texture) {
      texture = loader.loadAsync(url).then(value => {
        value.colorSpace = THREE.SRGBColorSpace;
        value.minFilter = THREE.LinearMipmapLinearFilter;
        value.anisotropy = 4;
        return value;
      });
      textures.set(url, texture);
    }
    return texture;
  }

  function clear() {
    for (const mesh of meshes) {
      scene.remove(mesh);
      (mesh.material as THREE.ShaderMaterial).dispose();
    }
    meshes = [];
  }

  function createMesh(texture: THREE.Texture, label: ImageLabel) {
    const image = texture.image as { width: number; height: number };
    const size = imageDisplaySize(image.width, image.height);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uImage: { value: texture },
        uViewport: { value: viewport },
        uSize: { value: new THREE.Vector2(size.width, size.height) },
        // The name's top edge sits 16px above the anchor (see item-text.ts).
        uOffset: { value: 16 + imageGap + size.height / 2 },
      },
      transparent: true,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
      vertexShader: /* glsl */ `
        uniform vec2 uViewport;
        uniform vec2 uSize;
        uniform float uOffset;
        varying vec2 vUv;
        void main() {
          vec4 anchor = projectionMatrix * modelViewMatrix * vec4(0., 0., 0., 1.);
          vec2 pixels = position.xy * uSize + vec2(0., uOffset);
          gl_Position = anchor;
          gl_Position.xy += pixels * 2. / uViewport * anchor.w;
          vUv = uv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uImage;
        uniform vec2 uSize;
        varying vec2 vUv;
        void main() {
          // Rounded corners, 16px radius, antialiased over one pixel.
          vec2 p = (vUv - .5) * uSize;
          vec2 q = abs(p) - uSize * .5 + 16.;
          float edge = length(max(q, 0.)) + min(max(q.x, q.y), 0.) - 16.;
          float mask = clamp(.5 - edge, 0., 1.);
          gl_FragColor = texture2D(uImage, vUv);
          gl_FragColor.a *= mask;
          if (gl_FragColor.a < .02) discard;
          #include <colorspace_fragment>
        }
      `,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(label.position);
    mesh.frustumCulled = false;
    mesh.renderOrder = 6;
    mesh.name = 'Iceberg item image';
    return mesh;
  }

  return {
    /** Resolves once every image of this rebuild has been placed, so callers can redraw. */
    async rebuild(labels: readonly ImageLabel[]) {
      const current = ++generation;
      clear();
      await Promise.all(labels.map(async label => {
        if (!label.item.image) return;
        let texture: THREE.Texture;
        try { texture = await load(label.item.image); }
        catch (error) { console.warn(`Unable to load item image ${label.item.image}`, error); return; }
        if (current !== generation) return;
        const mesh = createMesh(texture, label);
        meshes.push(mesh);
        scene.add(mesh);
      }));
      return current === generation;
    },
    /** Size of an item's loaded image in CSS pixels, if it has one. */
    async displaySize(url: string) {
      const texture = await load(url);
      const image = texture.image as { width: number; height: number };
      return imageDisplaySize(image.width, image.height);
    },
    resize(width: number, height: number) { viewport.set(width, height); },
    dispose() {
      generation++;
      clear();
      geometry.dispose();
      for (const texture of textures.values()) texture.then(value => value.dispose(), () => {});
      textures.clear();
    },
  };
}
