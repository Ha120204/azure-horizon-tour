import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import authStyles from './AuthTheme.module.css';

type AuthErrorMessageProps = {
    children: ReactNode;
    className?: string;
    icon?: boolean;
};

type AuthGoogleButtonProps = {
    id: string;
    label: string;
    isLoading: boolean;
    disabled?: boolean;
    onClick: () => void;
};

type AuthTextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
    id: string;
    label: ReactNode;
    icon: string;
};

type AuthPasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
    id: string;
    label: ReactNode;
    icon?: string;
    isVisible: boolean;
    onToggleVisible: () => void;
    showLabel: string;
    hideLabel: string;
    labelAction?: ReactNode;
    error?: boolean;
    helperText?: ReactNode;
};

type AuthSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    isLoading: boolean;
    loadingLabel: ReactNode;
    idleLabel: ReactNode;
};

function GoogleIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
    );
}

export function AuthErrorMessage({ children, className = '', icon = false }: AuthErrorMessageProps) {
    return (
        <div className={`${authStyles.errorMessage} ${className} p-3 text-sm font-semibold`} role="alert" aria-live="polite">
            {icon ? (
                <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">error</span>
                    <span>{children}</span>
                </div>
            ) : (
                children
            )}
        </div>
    );
}

export function AuthGoogleButton({ id, label, isLoading, disabled, onClick }: AuthGoogleButtonProps) {
    return (
        <button
            id={id}
            type="button"
            onClick={onClick}
            disabled={disabled || isLoading}
            className={`${authStyles.googleButton} flex min-h-12 w-full items-center justify-center gap-3 rounded-[var(--auth-radius-md)] border border-[#747775] bg-white px-4 py-3 text-sm font-semibold text-[#1f1f1f] disabled:cursor-wait disabled:opacity-65`}
        >
            {isLoading ? (
                <span className="material-symbols-outlined text-[20px] animate-spin text-[var(--auth-muted)]" aria-hidden="true">
                    progress_activity
                </span>
            ) : (
                <GoogleIcon />
            )}
            <span>{label}</span>
        </button>
    );
}

export function AuthTextField({ id, label, icon, className = '', ...inputProps }: AuthTextFieldProps) {
    return (
        <div className="space-y-2">
            <label htmlFor={id} className={authStyles.fieldLabel}>
                {label}
            </label>
            <div className={`${authStyles.fieldControl} relative`}>
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-[var(--auth-muted)]" aria-hidden="true">
                    {icon}
                </span>
                <input
                    id={id}
                    className={`h-full min-h-[54px] w-full rounded-[inherit] bg-transparent pl-12 pr-4 text-[var(--auth-ink)] outline-none placeholder:text-[var(--auth-muted)]/70 disabled:cursor-wait disabled:opacity-70 ${className}`}
                    {...inputProps}
                />
            </div>
        </div>
    );
}

export function AuthPasswordField({
    id,
    label,
    icon = 'lock',
    isVisible,
    onToggleVisible,
    showLabel,
    hideLabel,
    labelAction,
    error = false,
    helperText,
    className = '',
    ...inputProps
}: AuthPasswordFieldProps) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
                <label htmlFor={id} className={authStyles.fieldLabel}>
                    {label}
                </label>
                {labelAction}
            </div>
            <div className={`${authStyles.fieldControl} ${error ? authStyles.fieldControlError : ''} relative`}>
                <span className={`material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] ${error ? 'text-[var(--auth-danger)]' : 'text-[var(--auth-muted)]'}`} aria-hidden="true">
                    {icon}
                </span>
                <input
                    id={id}
                    type={isVisible ? 'text' : 'password'}
                    className={`h-full min-h-[54px] w-full rounded-[inherit] bg-transparent pl-12 pr-12 outline-none placeholder:text-[var(--auth-muted)]/70 disabled:cursor-wait disabled:opacity-70 ${error ? 'text-[var(--auth-danger)]' : 'text-[var(--auth-ink)]'} ${className}`}
                    {...inputProps}
                />
                <button
                    type="button"
                    onClick={onToggleVisible}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 transition disabled:cursor-not-allowed disabled:opacity-50 ${error ? 'text-[var(--auth-danger)]' : 'text-[var(--auth-muted)] hover:text-[var(--auth-ink)]'}`}
                    disabled={inputProps.disabled}
                    aria-label={isVisible ? hideLabel : showLabel}
                >
                    <span className="material-symbols-outlined text-[21px]" aria-hidden="true">
                        {isVisible ? 'visibility_off' : 'visibility'}
                    </span>
                </button>
            </div>
            {helperText}
        </div>
    );
}

export function AuthSubmitButton({
    id,
    isLoading,
    loadingLabel,
    idleLabel,
    className = '',
    disabled,
    ...buttonProps
}: AuthSubmitButtonProps) {
    return (
        <button
            id={id}
            className={`${authStyles.primaryButton} flex w-full items-center justify-center gap-2.5 px-5 py-4 font-headline text-base font-extrabold disabled:cursor-wait disabled:opacity-75 disabled:active:scale-100 ${className}`}
            type="submit"
            disabled={disabled || isLoading}
            {...buttonProps}
        >
            {isLoading ? (
                <>
                    <span className="material-symbols-outlined text-[20px] animate-spin" aria-hidden="true">
                        progress_activity
                    </span>
                    {loadingLabel}
                </>
            ) : (
                <>
                    {idleLabel}
                    <span className={`${authStyles.buttonIcon} material-symbols-outlined text-[21px]`} aria-hidden="true">
                        arrow_forward
                    </span>
                </>
            )}
        </button>
    );
}
