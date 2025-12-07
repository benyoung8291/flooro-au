import { useMemo, useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Room, ScaleCalibration } from '@/lib/canvas/types';
import { Material } from '@/hooks/useMaterials';

const WALL_HEIGHT_MM = 2400; // 2.4m standard wall height

interface ThreeDViewerProps {
  rooms: Room[];
  scale: ScaleCalibration | null;
  materials?: Material[];
}

// Generate procedural texture based on material type
function createMaterialTexture(
  materialType: 'roll' | 'tile' | 'linear' | string,
  materialName: string,
  width?: number,
  height?: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  const size = 512;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  
  // Base color based on material name/type
  const baseHue = hashString(materialName) % 360;
  
  switch (materialType) {
    case 'tile': {
      // Create tile pattern
      const tileSize = width && height ? Math.min(width, height) / 10 : 50;
      const tilesX = Math.ceil(size / tileSize);
      const tilesY = Math.ceil(size / tileSize);
      
      ctx.fillStyle = `hsl(${baseHue}, 20%, 85%)`;
      ctx.fillRect(0, 0, size, size);
      
      // Draw tiles with grout lines
      for (let x = 0; x < tilesX; x++) {
        for (let y = 0; y < tilesY; y++) {
          const tileX = x * tileSize;
          const tileY = y * tileSize;
          
          // Slight color variation per tile
          const variation = (Math.sin(x * 3.7 + y * 2.3) * 0.5 + 0.5) * 10 - 5;
          ctx.fillStyle = `hsl(${baseHue}, 25%, ${75 + variation}%)`;
          ctx.fillRect(tileX + 2, tileY + 2, tileSize - 4, tileSize - 4);
          
          // Add subtle texture
          ctx.fillStyle = `hsla(${baseHue}, 15%, 50%, 0.05)`;
          for (let i = 0; i < 20; i++) {
            const px = tileX + Math.random() * tileSize;
            const py = tileY + Math.random() * tileSize;
            ctx.fillRect(px, py, 2, 2);
          }
        }
      }
      break;
    }
    
    case 'roll': {
      // Create carpet/vinyl texture with subtle pattern
      ctx.fillStyle = `hsl(${baseHue}, 30%, 45%)`;
      ctx.fillRect(0, 0, size, size);
      
      // Add fiber/grain texture
      for (let i = 0; i < 3000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const length = 3 + Math.random() * 8;
        const angle = Math.random() * Math.PI * 2;
        
        ctx.strokeStyle = `hsla(${baseHue}, ${20 + Math.random() * 20}%, ${35 + Math.random() * 25}%, 0.3)`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
        ctx.stroke();
      }
      
      // Add subtle noise
      const imageData = ctx.getImageData(0, 0, size, size);
      for (let i = 0; i < imageData.data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 15;
        imageData.data[i] = Math.max(0, Math.min(255, imageData.data[i] + noise));
        imageData.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + noise));
        imageData.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + noise));
      }
      ctx.putImageData(imageData, 0, 0);
      break;
    }
    
    case 'linear':
    default: {
      // Wood/laminate pattern for linear materials
      ctx.fillStyle = `hsl(${baseHue}, 40%, 55%)`;
      ctx.fillRect(0, 0, size, size);
      
      // Wood grain lines
      const plankWidth = 60;
      for (let x = 0; x < size; x += plankWidth) {
        // Plank edge
        ctx.strokeStyle = `hsla(${baseHue}, 30%, 35%, 0.3)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, size);
        ctx.stroke();
        
        // Wood grain
        for (let i = 0; i < 30; i++) {
          const y = Math.random() * size;
          const grainLength = plankWidth * 0.8;
          
          ctx.strokeStyle = `hsla(${baseHue}, 35%, ${40 + Math.random() * 20}%, 0.15)`;
          ctx.lineWidth = 1 + Math.random() * 2;
          ctx.beginPath();
          ctx.moveTo(x + 5, y);
          
          // Wavy grain line
          const segments = 5;
          for (let s = 1; s <= segments; s++) {
            const sx = x + 5 + (grainLength / segments) * s;
            const sy = y + (Math.sin(s * 0.5) * 3);
            ctx.lineTo(sx, sy);
          }
          ctx.stroke();
        }
      }
      break;
    }
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  
  return texture;
}

// Simple hash function for consistent colors
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Convert canvas points to 3D coordinates
function pointsToShape(points: { x: number; y: number }[], pixelsPerMm: number): THREE.Shape {
  const shape = new THREE.Shape();
  
  if (points.length < 3) return shape;
  
  const scaledPoints = points.map(p => ({
    x: (p.x / pixelsPerMm) / 1000,
    y: (p.y / pixelsPerMm) / 1000,
  }));
  
  shape.moveTo(scaledPoints[0].x, scaledPoints[0].y);
  
  for (let i = 1; i < scaledPoints.length; i++) {
    shape.lineTo(scaledPoints[i].x, scaledPoints[i].y);
  }
  
  shape.closePath();
  return shape;
}

// Create wall geometry from room polygon
function createWallGeometry(points: { x: number; y: number }[], pixelsPerMm: number): THREE.BufferGeometry {
  const wallHeight = WALL_HEIGHT_MM / 1000;
  const vertices: number[] = [];
  const indices: number[] = [];
  
  const scaledPoints = points.map(p => ({
    x: (p.x / pixelsPerMm) / 1000,
    y: (p.y / pixelsPerMm) / 1000,
  }));
  
  for (let i = 0; i < scaledPoints.length; i++) {
    const p1 = scaledPoints[i];
    const p2 = scaledPoints[(i + 1) % scaledPoints.length];
    
    const baseIndex = vertices.length / 3;
    
    vertices.push(p1.x, 0, p1.y);
    vertices.push(p2.x, 0, p2.y);
    vertices.push(p2.x, wallHeight, p2.y);
    vertices.push(p1.x, wallHeight, p1.y);
    
    indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
    indices.push(baseIndex, baseIndex + 2, baseIndex + 3);
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  return geometry;
}

interface RoomMeshProps {
  room: Room;
  pixelsPerMm: number;
  material?: Material;
}

function RoomMesh({ room, pixelsPerMm, material }: RoomMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Create floor shape
  const floorShape = useMemo(() => {
    const shape = pointsToShape(room.points, pixelsPerMm);
    
    room.holes.forEach(hole => {
      const holePath = new THREE.Path();
      const holePoints = hole.points.map(p => ({
        x: (p.x / pixelsPerMm) / 1000,
        y: (p.y / pixelsPerMm) / 1000,
      }));
      
      if (holePoints.length >= 3) {
        holePath.moveTo(holePoints[0].x, holePoints[0].y);
        for (let i = 1; i < holePoints.length; i++) {
          holePath.lineTo(holePoints[i].x, holePoints[i].y);
        }
        holePath.closePath();
        shape.holes.push(holePath);
      }
    });
    
    return shape;
  }, [room.points, room.holes, pixelsPerMm]);
  
  // Create wall geometry
  const wallGeometry = useMemo(() => {
    return createWallGeometry(room.points, pixelsPerMm);
  }, [room.points, pixelsPerMm]);
  
  // Create floor material with texture
  const floorMaterial = useMemo(() => {
    if (material) {
      const texture = createMaterialTexture(
        material.type,
        material.name,
        material.specs.width,
        material.specs.height
      );
      
      return new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.DoubleSide,
        roughness: material.type === 'tile' ? 0.3 : 0.8,
        metalness: 0.1,
      });
    }
    
    // Default material based on room color
    const match = room.color.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%/);
    let color = new THREE.Color(0x4f46e5);
    if (match) {
      const h = parseInt(match[1]) / 360;
      const s = parseInt(match[2]) / 100;
      const l = parseInt(match[3]) / 100;
      color = new THREE.Color().setHSL(h, s, l);
    }
    
    return new THREE.MeshStandardMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
  }, [material, room.color]);
  
  // Cleanup texture on unmount
  useEffect(() => {
    return () => {
      if (floorMaterial.map) {
        floorMaterial.map.dispose();
      }
      floorMaterial.dispose();
    };
  }, [floorMaterial]);
  
  return (
    <group>
      {/* Floor */}
      <mesh 
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]} 
        receiveShadow
        material={floorMaterial}
      >
        <shapeGeometry args={[floorShape]} />
      </mesh>
      
      {/* Walls */}
      <mesh geometry={wallGeometry} castShadow receiveShadow>
        <meshStandardMaterial 
          color="#f5f5f5"
          side={THREE.DoubleSide}
          roughness={0.9}
          metalness={0}
        />
      </mesh>
      
      {/* Wall edges */}
      <lineSegments geometry={wallGeometry}>
        <lineBasicMaterial color="#a3a3a3" linewidth={1} />
      </lineSegments>
    </group>
  );
}

interface SceneProps {
  rooms: Room[];
  pixelsPerMm: number;
  materialsMap: Map<string, Material>;
}

function Scene({ rooms, pixelsPerMm, materialsMap }: SceneProps) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  
  const { center, maxDimension } = useMemo(() => {
    if (rooms.length === 0) {
      return { center: new THREE.Vector3(0, 0, 0), maxDimension: 10 };
    }
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    rooms.forEach(room => {
      room.points.forEach(p => {
        const x = (p.x / pixelsPerMm) / 1000;
        const y = (p.y / pixelsPerMm) / 1000;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      });
    });
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const dimension = Math.max(maxX - minX, maxY - minY);
    
    return {
      center: new THREE.Vector3(centerX, 1, centerY),
      maxDimension: dimension || 10,
    };
  }, [rooms, pixelsPerMm]);
  
  useMemo(() => {
    const distance = maxDimension * 1.5;
    camera.position.set(center.x + distance, distance, center.z + distance);
    camera.lookAt(center);
  }, [camera, center, maxDimension]);
  
  return (
    <>
      <OrbitControls 
        ref={controlsRef}
        target={center}
        enableDamping
        dampingFactor={0.1}
        minDistance={1}
        maxDistance={maxDimension * 5}
        maxPolarAngle={Math.PI / 2 - 0.1}
      />
      
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} />
      <hemisphereLight args={['#ffffff', '#f0f0f0', 0.3]} />
      
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center.x, -0.01, center.z]} receiveShadow>
        <planeGeometry args={[maxDimension * 3, maxDimension * 3]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>
      
      {/* Grid helper */}
      <gridHelper 
        args={[maxDimension * 2, maxDimension * 2, '#cccccc', '#e0e0e0']} 
        position={[center.x, 0, center.z]}
      />
      
      {/* Rooms with materials */}
      {rooms.map(room => (
        <RoomMesh 
          key={room.id} 
          room={room} 
          pixelsPerMm={pixelsPerMm}
          material={room.materialId ? materialsMap.get(room.materialId) : undefined}
        />
      ))}
    </>
  );
}

export function ThreeDViewer({ rooms, scale, materials }: ThreeDViewerProps) {
  const pixelsPerMm = scale?.pixelsPerMm || 1;
  
  // Create materials lookup map
  const materialsMap = useMemo(() => {
    const map = new Map<string, Material>();
    materials?.forEach(m => map.set(m.id, m));
    return map;
  }, [materials]);
  
  if (rooms.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/30">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium">No rooms to display</p>
          <p className="text-sm">Draw rooms in 2D view first, then switch to 3D</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full h-full">
      <Canvas shadows>
        <PerspectiveCamera makeDefault fov={50} near={0.1} far={1000} />
        <Scene rooms={rooms} pixelsPerMm={pixelsPerMm} materialsMap={materialsMap} />
      </Canvas>
      
      {/* 3D View Controls Hint */}
      <div className="absolute bottom-4 left-4 px-3 py-2 rounded-lg bg-background/80 backdrop-blur text-xs text-muted-foreground">
        <p>🖱️ Drag to rotate • Scroll to zoom • Right-click to pan</p>
      </div>
      
      {/* Material Legend */}
      {materials && materials.length > 0 && (
        <div className="absolute top-4 right-4 px-3 py-2 rounded-lg bg-background/80 backdrop-blur text-xs">
          <p className="font-medium text-foreground mb-1">Materials</p>
          <div className="space-y-1">
            {rooms
              .filter(r => r.materialId)
              .map(room => {
                const mat = materialsMap.get(room.materialId!);
                return mat ? (
                  <div key={room.id} className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-medium">{room.name}:</span>
                    <span>{mat.name} ({mat.type})</span>
                  </div>
                ) : null;
              })
              .filter(Boolean)
            }
          </div>
        </div>
      )}
    </div>
  );
}
