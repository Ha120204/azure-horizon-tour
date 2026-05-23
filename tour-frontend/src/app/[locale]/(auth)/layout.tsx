/**
 * Auth Layout — Layout tối giản cho các trang xác thực.
 * Không có Header/Footer nặng, chỉ render nội dung form.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
