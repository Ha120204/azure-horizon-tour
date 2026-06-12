'use client';

import { useEffect, useId, useRef, useState } from 'react';

type ListboxNavOptions<T> = {
    options: readonly T[];
    selectedValue: string;
    getOptionValue: (option: T) => string;
    onChange: (value: string) => void;
};

/**
 * Điều hướng bàn phím + đóng/mở cho dropdown dạng listbox (nút + danh sách option).
 * Dùng chung cho dropdown mã quốc gia và chủ đề trong form Contact.
 */
export function useListboxNav<T>({ options, selectedValue, getOptionValue, onChange }: ListboxNavOptions<T>) {
    const selectedIndex = Math.max(0, options.findIndex(option => getOptionValue(option) === selectedValue));

    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(selectedIndex);

    const listboxId = useId();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        optionRefs.current[activeIndex]?.focus();
    }, [activeIndex, isOpen]);

    const open = (index = selectedIndex) => {
        setActiveIndex(index);
        setIsOpen(true);
    };

    const close = () => {
        setIsOpen(false);
        buttonRef.current?.focus();
    };

    const move = (nextIndex: number) => {
        setActiveIndex((nextIndex + options.length) % options.length);
    };

    const commit = (value: string) => {
        const nextIndex = options.findIndex(option => getOptionValue(option) === value);
        onChange(value);
        setIsOpen(false);
        setActiveIndex(Math.max(0, nextIndex));
        buttonRef.current?.focus();
    };

    const handleButtonClick = () => {
        if (isOpen) { setIsOpen(false); return; }
        open(selectedIndex);
    };

    const handleButtonKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'Escape') { setIsOpen(false); return; }
        if (event.key === 'ArrowDown') { event.preventDefault(); open(Math.min(selectedIndex + 1, options.length - 1)); return; }
        if (event.key === 'ArrowUp')   { event.preventDefault(); open(Math.max(selectedIndex - 1, 0)); return; }
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(selectedIndex); }
    };

    const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, value: string) => {
        if (event.key === 'Escape')    { event.preventDefault(); close(); return; }
        if (event.key === 'ArrowDown') { event.preventDefault(); move(activeIndex + 1); return; }
        if (event.key === 'ArrowUp')   { event.preventDefault(); move(activeIndex - 1); return; }
        if (event.key === 'Home')      { event.preventDefault(); move(0); return; }
        if (event.key === 'End')       { event.preventDefault(); move(options.length - 1); return; }
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); commit(value); }
    };

    return {
        isOpen,
        activeIndex,
        setActiveIndex,
        listboxId,
        dropdownRef,
        buttonRef,
        optionRefs,
        handleButtonClick,
        handleButtonKeyDown,
        handleOptionKeyDown,
        commit,
    };
}
