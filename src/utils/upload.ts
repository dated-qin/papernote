/* ============================================
   纸条 PaperNote — 文件上传
   流程：获取凭证 → XHR 直传 OSS → 上传回调获取 file_id
   ============================================ */

import http from './http';

interface UploadTokenRes {
  upload_url: string;
  token: string;
  key: string;
}

interface UploadCallbackRes {
  file_id: number;
  url: string;
}

export interface UploadResult {
  fileId: string;
  url: string;
}

/**
 * 上传文件到 OSS
 * @param file 要上传的文件
 * @param onProgress 进度回调 (0-100)
 * @returns 上传完成后的 file_id + 访问 URL
 */
export async function uploadFile(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  // 1. 获取上传凭证
  const tokenRes = await http.post<UploadTokenRes>('/api/files/upload-token', {
    file_name: file.name,
    file_size: file.size,
    content_type: file.type,
  });

  if (tokenRes.code !== 0) throw new Error(tokenRes.message || '获取上传凭证失败');
  const { upload_url, token, key } = tokenRes.data;

  // 2. 直传 OSS（XHR 带进度）
  const formData = new FormData();
  formData.append('token', token);
  formData.append('key', key);
  formData.append('file', file);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', upload_url);

    xhr.upload.onprogress = (e: ProgressEvent) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 204) resolve();
      else reject(new Error(`上传失败: ${xhr.status}`));
    };

    xhr.onerror = () => reject(new Error('网络错误'));
    xhr.send(formData);
  });

  // 3. 上传完成回调 → 获取 file_id + 访问 URL
  const callbackRes = await http.post<UploadCallbackRes>('/api/files/upload-callback', {
    key,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type,
  });

  if (callbackRes.code !== 0) throw new Error(callbackRes.message || '上传回调失败');
  return { fileId: String(callbackRes.data.file_id), url: callbackRes.data.url };
}
