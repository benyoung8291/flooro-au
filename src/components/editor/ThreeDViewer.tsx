import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Room, ScaleCalibration } from '@/lib/canvas/types';

const WALL_HEIGHT_MM = 2400; // 2.4m standard wall height

interface ThreeDViewerProps {
  rooms: Room[];
  scale: ScaleCalibration | null;
  materials?: Array<{ id: string; type: string; name: string }>;
}

// Convert canvas points to 3D coordinates
function pointsToShape(points: { x: number; y: number }[], pixelsPerMm: number): THREE.Shape {
  const shape = new THREE.Shape();
  
  if (points.length < 3) return shape;
  
  // Scale points from pixels to meters for 3D visualization
  const scaledPoints = points.map(p => ({
    x: (p.x / pixelsPerMm) / 1000, // Convert to meters
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
  const wallHeight = WALL_HEIGHT_MM / 1000; // Convert to meters
  const vertices: number[] = [];
  const indices: number[] = [];
  
  const scaledPoints = points.map(p => ({
    x: (p.x / pixelsPerMm) / 1000,
    y: (p.y / pixelsPerMm) / 1000,
  }));
  
  // Create walls between consecutive points
  for (let i = 0; i < scaledPoints.length; i++) {
    const p1 = scaledPoints[i];
    const p2 = scaledPoints[(i + 1) % scaledPoints.length];
    
    const baseIndex = vertices.length / 3;
    
    // Bottom left, bottom right, top right, top left
    vertices.push(p1.x, 0, p1.y);
    vertices.push(p2.x, 0, p2.y);
    vertices.push(p2.x, wallHeight, p2.y);
    vertices.push(p1.x, wallHeight, p1.y);
    
    // Two triangles per wall segment
    indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
    indices.push(baseIndex, baseIndex + 2, baseIndex + 3);
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  return geometry;
}

function RoomMesh({ room, pixelsPerMm }: { room: Room; pixelsPerMm: number }) {
  // Create floor shape
  const floorShape = useMemo(() => {
    const shape = pointsToShape(room.points, pixelsPerMm);
    
    // Add holes
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
  
  // Parse room color
  const floorColor = useMemo(() => {
    // Extract color from hsla string
    const match = room.color.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%/);
    if (match) {
      const h = parseInt(match[1]) / 360;
      const s = parseInt(match[2]) / 100;
      const l = parseInt(match[3]) / 100;
      return new THREE.Color().setHSL(h, s, l);
    }
    return new THREE.Color(0x4f46e5);
  }, [room.color]);
  
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <shapeGeometry args={[floorShape]} />
        <meshStandardMaterial 
          color={floorColor} 
          side={THREE.DoubleSide}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Walls */}
      <mesh geometry={wallGeometry} castShadow receiveShadow>
        <meshStandardMaterial 
          color="#e5e5e5"
          side={THREE.DoubleSide}
          transparent
          opacity={0.85}
        />
      </mesh>
      
      {/* Wall edges for better definition */}
      <lineSegments geometry={wallGeometry}>
        <lineBasicMaterial color="#a3a3a3" linewidth={1} />
      </lineSegments>
    </group>
  );
}

function Scene({ rooms, pixelsPerMm }: { rooms: Room[]; pixelsPerMm: number }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  
  // Calculate scene center and bounds
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
  
  // Set initial camera position
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
      
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} />
      
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center.x, -0.01, center.z]} receiveShadow>
        <planeGeometry args={[maxDimension * 3, maxDimension * 3]} />
        <meshStandardMaterial color="#f0f0f0" />
      </mesh>
      
      {/* Grid helper */}
      <gridHelper 
        args={[maxDimension * 2, maxDimension * 2, '#cccccc', '#e5e5e5']} 
        position={[center.x, 0, center.z]}
      />
      
      {/* Rooms */}
      {rooms.map(room => (
        <RoomMesh key={room.id} room={room} pixelsPerMm={pixelsPerMm} />
      ))}
    </>
  );
}

export function ThreeDViewer({ rooms, scale, materials }: ThreeDViewerProps) {
  const pixelsPerMm = scale?.pixelsPerMm || 1;
  
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
        <Scene rooms={rooms} pixelsPerMm={pixelsPerMm} />
      </Canvas>
      
      {/* 3D View Controls Hint */}
      <div className="absolute bottom-4 left-4 px-3 py-2 rounded-lg bg-background/80 backdrop-blur text-xs text-muted-foreground">
        <p>🖱️ Drag to rotate • Scroll to zoom • Right-click to pan</p>
      </div>
    </div>
  );
}
