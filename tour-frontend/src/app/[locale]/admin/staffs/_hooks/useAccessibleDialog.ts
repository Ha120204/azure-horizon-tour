'use client';

import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

let openDialogCount = 0;
let previousBodyOverflow = '';

interface AccessibleDialogOptions {
    onClose: () => void;
    canClose?: boolean;
    initialFocusRef?: RefObject<HTMLElement | null>;
}

export function useAccessibleDialog({
    onClose,
    canClose = true,
    initialFocusRef,
}: AccessibleDialogOptions) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const returnFocusRef = useRef<HTMLElement | null>(null);
    const onCloseRef = useRef(onClose);
    const canCloseRef = useRef(canClose);

    useEffect(() => {
        onCloseRef.current = onClose;
        canCloseRef.current = canClose;
    }, [canClose, onClose]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        if (openDialogCount === 0) {
            previousBodyOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
        }
        openDialogCount += 1;

        const isTopDialog = () => {
            const dialogs = document.querySelectorAll<HTMLElement>('[data-accessible-dialog="true"]');
            return dialogs[dialogs.length - 1] === dialog;
        };

        const focusInitialElement = window.requestAnimationFrame(() => {
            (initialFocusRef?.current ?? dialog).focus();
        });

        const handleKeyDown = (event: KeyboardEvent) => {
            if (!isTopDialog()) return;

            if (event.key === 'Escape' && canCloseRef.current) {
                event.preventDefault();
                onCloseRef.current();
                return;
            }

            if (event.key !== 'Tab') return;

            const focusableElements = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
                .filter(element => element.getAttribute('aria-hidden') !== 'true');

            if (focusableElements.length === 0) {
                event.preventDefault();
                dialog.focus();
                return;
            }

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey && (document.activeElement === firstElement || document.activeElement === dialog)) {
                event.preventDefault();
                lastElement.focus();
            } else if (!event.shiftKey && (document.activeElement === lastElement || !dialog.contains(document.activeElement))) {
                event.preventDefault();
                firstElement.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            window.cancelAnimationFrame(focusInitialElement);
            document.removeEventListener('keydown', handleKeyDown);
            openDialogCount = Math.max(0, openDialogCount - 1);
            if (openDialogCount === 0) document.body.style.overflow = previousBodyOverflow;

            window.requestAnimationFrame(() => {
                if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
            });
        };
    }, [initialFocusRef]);

    return dialogRef;
}
