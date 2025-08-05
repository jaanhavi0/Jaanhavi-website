import { useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { extend } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";

const GradientTextureMaterial = shaderMaterial(
  {
    iResolution: [1, 1, 1],
    iTime: 0,
  },
  // Vertex shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
  // Fragment shader (darker, sunset palette + film grain)
  `
    #define filmGrainIntensity 0.07
    uniform vec3 iResolution;
    uniform float iTime;
    varying vec2 vUv;

    mat2 Rot(float a) {
      float s = sin(a);
      float c = cos(a);
      return mat2(c, -s, s, c);
    }

    vec2 hash(vec2 p) {
      p = vec2(dot(p, vec2(2127.1, 81.17)), dot(p, vec2(1269.5, 283.37)));
      return fract(sin(p)*43758.5453);
    }

    float noise(in vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f*f*(3.0-2.0*f);
      float n = mix(mix(dot(-1.0+2.0*hash(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
      dot(-1.0+2.0*hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
      mix(dot(-1.0+2.0*hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
      dot(-1.0+2.0*hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
      return 0.5 + 0.5*n;
    }

    float filmGrainNoise(in vec2 uv) {
      return length(hash(vec2(uv.x, uv.y)));
    }

    void main() {
      // Standardized coordinate logic
      vec2 fragCoord = vUv * iResolution.xy;
      vec2 uv = fragCoord / iResolution.xy;
      float aspect = iResolution.x / iResolution.y;

      vec2 tuv = uv - 0.5;
      float degree = noise(vec2(iTime*.05, tuv.x*tuv.y));
      tuv.y *= 1.0/aspect;
      tuv *= Rot(radians((degree-0.5)*720.0+180.));
      tuv.y *= aspect;

      float frequency = 5.0;
      float amplitude = 27.0;
      float speed = iTime * 2.2;
      tuv.x += sin(tuv.y*frequency+speed)/amplitude;
      tuv.y += sin(tuv.x*frequency*1.5+speed)/(amplitude*0.49);

      // Sunset/dark palette
      vec3 black       = vec3(0.04, 0.03, 0.09);
      vec3 deepBlue    = vec3(21, 37, 74) / 255.0;
      vec3 purpleNight = vec3(65, 38, 90) / 255.0;
      vec3 magenta     = vec3(209, 86, 137) / 255.0;
      vec3 red         = vec3(210, 59, 60) / 255.0;
      vec3 orange      = vec3(232, 103, 39) / 255.0;
      vec3 gold        = vec3(238, 183, 62) / 255.0;

      // Animate gradient stops (more sunset at night)
      float cycle = sin(iTime * 0.33);
      float t = (sign(cycle) * pow(abs(cycle), 0.7) + 1.) / 2.;

      vec3 color1 = mix(deepBlue, purpleNight, t);
      vec3 color2 = mix(black, red, t);
      vec3 color3 = mix(orange, magenta, t);
      vec3 color4 = mix(gold, red, t);

      // Gradients
      vec3 layer1 = mix(color3, color2, smoothstep(-.3, .19, (tuv*Rot(radians(-8.))).x));
      vec3 layer2 = mix(color4, color1, smoothstep(-.3, .18, (tuv*Rot(radians(-6.))).x));
      vec3 color = mix(layer1, layer2, smoothstep(.5, -.26, tuv.y));

      // Apply film grain
      color = color - filmGrainNoise(uv) * filmGrainIntensity;

      gl_FragColor = vec4(color, 1.0);
    }
  `
);

extend({ GradientTextureMaterial });

function GradientTextureShaderBG() {
  const mat = useRef<any>(null);
  const { size } = useThree();

  useFrame((state) => {
    if (mat.current) {
      mat.current.iTime = state.clock.elapsedTime;
      mat.current.iResolution = [size.width, size.height, 1];
    }
  });

  // Bigger scale ensures NO clipping at any aspect
  return (
    <mesh scale={[1, 1, 1]}>
      <planeGeometry args={[2, 2]} />
      {/* @ts-ignore */}
      <gradientTextureMaterial ref={mat} transparent />
    </mesh>
  );
}

export default function GradientTexture() {
  return (
    <div
      className="fixed inset-0 w-full h-full pointer-events-none z-[-2]"
      aria-hidden="true"
      style={{ background: "#0b0710" }}
    >
     <Canvas
      orthographic
      camera={{ position: [0, 0, 1], zoom: 1 }}
      gl={{ alpha: true, antialias: true }}
      style={{
        position: "absolute",      // <--- critical to overlay inside parent
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",    // <--- lets user interact with content above
      }}
    >
        <GradientTextureShaderBG />
      </Canvas>
    </div>
  );
}
