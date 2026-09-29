"use client";

import React from "react";

interface FacebookProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export const Facebook = ({ size = 16, className, ...props }: FacebookProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    {...props}
    aria-hidden="true"
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);