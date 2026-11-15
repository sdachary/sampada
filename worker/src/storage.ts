// Thin R2 access layer — the one place that touches the FILES binding.
export function files(env: { FILES?: R2Bucket }): R2Bucket {
  if (!env.FILES) throw new Error('R2 bucket not bound (FILES)');
  return env.FILES;
}

export function putFile(env: { FILES?: R2Bucket }, key: string, data: ArrayBuffer | string): Promise<R2Object | null> {
  return files(env).put(key, data);
}
