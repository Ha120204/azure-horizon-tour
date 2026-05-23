/**
 * Customer Layout — Wrapper cho tất cả trang customer.
 * Hiện tại chỉ render children vì Header/Footer đang nằm trong từng page.
 * Sau này có thể chuyển Header/Footer vào đây để DRY hơn.
 */
export default function CustomerLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
