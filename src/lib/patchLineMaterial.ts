import { LineMaterial } from "three-stdlib";

/**
 * three-stdlib の LineMaterial は、画面に投影した線分の長さが 0 になると normalize(vec2(0)) で NaN を出す。
 * （線を真正面から見る角度になった瞬間や、流れ星の出始めなど）
 * NaN の画素はブルームのぼかしで画面全体に広がり、一瞬だけ真っ黒なフレームになるため、ここでガードする。
 *
 * LineMaterial はコンストラクタ内で this.onBeforeCompile をインスタンスに代入するので、
 * prototype にアクセサを置いてその代入を受け取り、元の処理のあとにシェーダーを書き換える。
 */
const ORIGINAL = "dir = normalize( dir );";
const GUARDED = "dir = dot( dir, dir ) > 1e-12 ? normalize( dir ) : vec2( 1.0, 0.0 );";

type Shader = { vertexShader: string };
type Hook = (this: unknown, shader: Shader, renderer: unknown) => void;
type Patched = { __originalOnBeforeCompile?: Hook };

function guardedOnBeforeCompile(this: Patched, shader: Shader, renderer: unknown) {
  this.__originalOnBeforeCompile?.call(this, shader, renderer);
  shader.vertexShader = shader.vertexShader.replace(ORIGINAL, GUARDED);
}

Object.defineProperty(LineMaterial.prototype, "onBeforeCompile", {
  configurable: true,
  get() {
    return guardedOnBeforeCompile;
  },
  set(this: Patched, fn: Hook) {
    this.__originalOnBeforeCompile = fn;
  },
});
