import React, { Suspense } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { Center, Bounds, Environment } from '@react-three/drei';

function Model({ url, color }) {
  const geometry = useLoader(STLLoader, url);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

const AutoFitModel = ({ url, color }) => {
    return (
        <Center>
            <Model url={url} color={color} />
        </Center>
    );
}

export default function MiniViewer({ url, color = "#6366f1" }) {
  // Safe fallback if the specific material color isn't found
  const finalColor = color || "#6366f1";

  if (!url) return <div style={{width:'100%', height:'100%', background:'#eee'}}></div>;

  return (
    <div style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
      <Canvas camera={{ position: [0, 0, 100], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
        <Environment preset="city" />
        <Suspense fallback={null}>
            <Bounds fit clip observe margin={1.2}>
                <AutoFitModel url={url} color={finalColor} />
            </Bounds>
        </Suspense>
      </Canvas>
    </div>
  );
}