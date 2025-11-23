import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'glass' | 'outline';
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
    children,
    className,
    variant = 'default',
    padding = 'md',
    ...props
}) => {
    const baseStyles = "rounded-2xl transition-all duration-300";

    const variants = {
        default: "bg-white shadow-soft hover:shadow-lg border border-slate-100",
        glass: "glass-panel",
        outline: "border border-slate-200 bg-transparent"
    };

    const paddings = {
        none: "",
        sm: "p-4",
        md: "p-6",
        lg: "p-8"
    };

    return (
        <div
            className={twMerge(clsx(baseStyles, variants[variant], paddings[padding], className))}
            {...props}
        >
            {children}
        </div>
    );
};
