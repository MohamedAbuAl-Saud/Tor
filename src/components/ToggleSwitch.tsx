import React from 'react';

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: () => void;
  label?: string;
  isRtl?: boolean;
  disabled?: boolean;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  enabled,
  onChange,
  label = 'toggle',
  isRtl = false,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
        enabled ? 'bg-indigo-600' : 'bg-slate-300'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition-transform duration-200 ease-in-out ${
          enabled ? (isRtl ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'
        }`}
      />
    </button>
  );
};
