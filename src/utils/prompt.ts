import confirm from "@inquirer/confirm";

/**
 * 提示使用者確認操作
 * @param message 確認訊息
 * @returns true 表示確認，false 表示取消
 */
export async function confirmAction(message: string): Promise<boolean> {
  return await confirm({ message, default: false });
}
