/* ============================================
   纸条 PaperNote — API 错误统一处理
   按错误码分发：401 跳登录、403/404/409/500 提示
   ============================================ */

/**
 * 根据 API 错误码执行对应处理
 * @param code 业务错误码
 * @param msg  服务端返回的错误信息
 */
export function handleApiError(code: number, msg?: string): void {
  switch (code) {
    case 401:
      localStorage.removeItem('token');
      window.location.hash = '#/login';
      break;
    case 403:
      alert(msg || '无权限执行此操作');
      break;
    case 404:
      alert(msg || '资源不存在');
      break;
    case 409:
      alert(msg || '操作冲突');
      break;
    case 500:
      alert(msg || '服务器繁忙，请稍后重试');
      break;
    default:
      if (msg) alert(msg);
  }
}
