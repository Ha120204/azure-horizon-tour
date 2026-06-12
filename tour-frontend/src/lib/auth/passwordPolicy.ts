export const PASSWORD_POLICY_REGEX =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * Mật khẩu có đạt chuẩn không. Cùng chính sách với backend (PASSWORD_POLICY_REGEX).
 * Thông báo lỗi hiển thị do phía gọi tự dịch qua i18n.
 */
export function isValidPassword(password: string): boolean {
    return PASSWORD_POLICY_REGEX.test(password);
}
