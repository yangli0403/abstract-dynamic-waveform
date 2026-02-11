/**
 * 数学工具函数
 *
 * 提供通用的数学计算工具，包括范围约束、映射和随机数生成。
 */

/** 将值约束在指定范围内 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** 将值从一个范围线性映射到另一个范围 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  const normalized = (value - inMin) / (inMax - inMin);
  return outMin + normalized * (outMax - outMin);
}

/** 生成指定范围内的随机浮点数 */
export function randomFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** 生成指定范围内的随机整数 */
export function randomInt(min: number, max: number): number {
  return Math.floor(randomFloat(min, max + 1));
}

/** 计算两个值之间的线性插值 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/** 平滑阶跃函数（Smoothstep） */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** 计算RMS（均方根）值 */
export function rms(data: Float32Array | number[]): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i];
  }
  return Math.sqrt(sum / data.length);
}

/** 将频率数据分组为指定数量的频段 */
export function groupIntoBands(data: Float32Array, bandCount: number): number[] {
  const bands: number[] = new Array(bandCount).fill(0);
  const binSize = Math.floor(data.length / bandCount);

  for (let i = 0; i < bandCount; i++) {
    let sum = 0;
    const start = i * binSize;
    const end = Math.min(start + binSize, data.length);
    for (let j = start; j < end; j++) {
      sum += data[j];
    }
    bands[i] = sum / (end - start);
  }

  return bands;
}

/** 将分贝值归一化到 0~1 范围 */
export function normalizeDecibels(
  value: number,
  minDb: number,
  maxDb: number
): number {
  return clamp((value - minDb) / (maxDb - minDb), 0, 1);
}
